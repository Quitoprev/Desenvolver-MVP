// Órbita — emissão de NFS-e (função que roda no servidor do Supabase).
//
// Por que no servidor: o token do emissor de notas e a chave de serviço do
// banco não podem ficar no navegador. O app só pede "emita a nota X";
// esta função confere quem está pedindo, monta a nota e fala com o emissor.
//
// Emissor usado: Focus NFe (https://focusnfe.com.br), que fala com a prefeitura
// de Maceió (padrão ABRASF/GissOnline) e com o Emissor Nacional nos municípios
// que já migraram. O certificado digital A1 da clínica fica cadastrado lá.
//
// Segredos (Edge Functions → Secrets):
//   FOCUS_TOKEN_HOMOLOGACAO   token do ambiente de testes da Focus NFe
//   FOCUS_TOKEN_PRODUCAO      token do ambiente real
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.
//
// Chamadas (POST, JSON, com o token de login do usuário no cabeçalho Authorization):
//   { "acao": "emitir",    "nota_id": "..." }
//   { "acao": "consultar", "nota_id": "..." }
//   { "acao": "cancelar",  "nota_id": "...", "justificativa": "..." }

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FOCUS = {
  homologacao: "https://homologacao.focusnfe.com.br/v2",
  producao: "https://api.focusnfe.com.br/v2",
};
// Item da lista de serviços (LC 116/2003) por terapia. A clínica pode
// sobrescrever em Clínica → Fiscal.
const ITEM_PADRAO: Record<string, string> = {
  "fonoaudiologia": "04.08",
  "terapia ocupacional": "04.08",
  "fisioterapia": "04.08",
  "psicologia": "04.16",
  "neuropsicologia": "04.16",
  "aba": "04.16",
  "psicopedagogia": "08.02",
  "musicoterapia": "04.08",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ erro: "Entre na sua conta para emitir notas." }, 401);

  // 1) quem está pedindo
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ erro: "Sessão inválida. Entre de novo." }, 401);
  const uid = userData.user.id;
  const { data: me } = await admin.from("membros").select("clinica_id, papel, ativo").eq("user_id", uid).maybeSingle();
  if (!me || !me.ativo || me.papel !== "dona") return json({ erro: "Só a dona da clínica pode emitir ou cancelar notas." }, 403);

  let body: { acao?: string; nota_id?: string; justificativa?: string } = {};
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  const { acao, nota_id } = body;
  if (!nota_id) return json({ erro: "Informe a nota." }, 400);

  // 2) a nota e a clínica
  const { data: nota } = await admin.from("notas_fiscais").select("*").eq("id", nota_id).eq("clinica_id", me.clinica_id).maybeSingle();
  if (!nota) return json({ erro: "Nota não encontrada." }, 404);
  const { data: clinica } = await admin.from("clinicas").select("nome, fiscal").eq("id", me.clinica_id).single();
  const f = (clinica?.fiscal || {}) as Record<string, string | boolean | number>;
  const ambiente = (f.ambiente === "producao" ? "producao" : "homologacao") as "producao" | "homologacao";
  const token = Deno.env.get(ambiente === "producao" ? "FOCUS_TOKEN_PRODUCAO" : "FOCUS_TOKEN_HOMOLOGACAO");
  if (!token) return json({ erro: `Falta configurar o segredo FOCUS_TOKEN_${ambiente.toUpperCase()} no Supabase (Edge Functions → Secrets).` }, 500);
  const focus = async (method: string, path: string, payload?: unknown) => {
    const r = await fetch(FOCUS[ambiente] + path, {
      method,
      headers: { Authorization: "Basic " + btoa(token + ":"), "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    let data: Record<string, unknown> = {};
    try { data = await r.json(); } catch { /* sem corpo */ }
    return { ok: r.ok, status: r.status, data };
  };
  const salvar = async (patch: Record<string, unknown>) => {
    await admin.from("notas_fiscais").update(patch).eq("id", nota.id);
  };
  const aplicarConsulta = async (d: Record<string, unknown>) => {
    const st = String(d.status || "");
    if (st === "autorizado") {
      await salvar({ status: "autorizada", numero: d.numero ?? null, codigo_verificacao: d.codigo_verificacao ?? null,
        url_pdf: d.url_danfse ?? d.url ?? null, url_xml: d.caminho_xml_nota_fiscal ?? null, erro: null,
        emitida_em: d.data_emissao ?? new Date().toISOString() });
      return "autorizada";
    }
    if (st === "cancelado") { await salvar({ status: "cancelada", cancelada_em: new Date().toISOString() }); return "cancelada"; }
    if (st === "erro_autorizacao") {
      const erros = (d.erros as Array<{ codigo?: string; mensagem?: string; correcao?: string }>) || [];
      const msg = erros.map((e) => [e.codigo, e.mensagem, e.correcao].filter(Boolean).join(": ")).join(" | ") || "Erro na prefeitura";
      await salvar({ status: "erro", erro: msg });
      return "erro";
    }
    await salvar({ status: "processando" });
    return "processando";
  };

  // 3) ações
  if (acao === "emitir") {
    if (!["pendente", "erro"].includes(nota.status)) return json({ erro: "Esta nota já foi enviada." }, 400);
    const faltam = ["cnpj", "inscricao_municipal", "codigo_municipio"].filter((k) => !f[k]);
    if (faltam.length) return json({ erro: "Complete os dados fiscais da clínica: " + faltam.join(", ") }, 400);
    if (!nota.tomador_cpf) return json({ erro: "Informe o CPF de quem paga na ficha do paciente." }, 400);

    const { data: sessoes } = await admin.from("sessoes").select("data, hora, terapia").in("id", nota.sessao_ids).order("data");
    const terapia = (sessoes?.[0]?.terapia || "").toLowerCase();
    const item = String(nota.item_lista_servico || f.item_lista_servico || ITEM_PADRAO[terapia] || "04.08");
    const datas = (sessoes || []).map((s) => s.data.split("-").reverse().join("/")).join(", ");
    const discriminacao = nota.discriminacao ||
      String(f.discriminacao || "Sessões de {terapia} realizadas em {datas}.")
        .replace("{terapia}", sessoes?.[0]?.terapia || "terapia").replace("{datas}", datas).replace("{clinica}", clinica?.nome || "");

    const payload: Record<string, unknown> = {
      data_emissao: new Date().toISOString(),
      natureza_operacao: String(f.natureza_operacao || "1"),
      optante_simples_nacional: f.optante_simples_nacional !== false,
      prestador: { cnpj: String(f.cnpj).replace(/\D/g, ""), inscricao_municipal: String(f.inscricao_municipal), codigo_municipio: String(f.codigo_municipio) },
      tomador: { cpf: String(nota.tomador_cpf).replace(/\D/g, ""), razao_social: nota.tomador_nome || "Consumidor", ...(nota.tomador_email ? { email: nota.tomador_email } : {}) },
      servico: {
        valor_servicos: Number(nota.valor),
        iss_retido: false,
        item_lista_servico: item,
        discriminacao,
        codigo_municipio: String(f.codigo_municipio),
        ...(f.codigo_tributario_municipio ? { codigo_tributario_municipio: String(f.codigo_tributario_municipio) } : {}),
        ...(f.aliquota ? { aliquota: Number(f.aliquota) } : {}),
        ...(f.codigo_cnae ? { codigo_cnae: String(f.codigo_cnae) } : {}),
      },
    };
    if (f.regime_especial_tributacao) payload.regime_especial_tributacao = String(f.regime_especial_tributacao);

    await salvar({ status: "processando", ambiente, payload, erro: null, item_lista_servico: item, discriminacao });
    const r = await focus("POST", `/nfse?ref=${encodeURIComponent(nota.ref)}`, payload);
    if (!r.ok && r.status !== 422) {
      const msg = String(r.data.mensagem || r.data.codigo || `Emissor respondeu ${r.status}`);
      await salvar({ status: "erro", erro: msg });
      return json({ status: "erro", erro: msg });
    }
    // 422 "nfe_autorizada": a ref já tinha sido enviada; segue para a consulta
    const c = await focus("GET", `/nfse/${encodeURIComponent(nota.ref)}`);
    const st = await aplicarConsulta(c.data);
    return json({ status: st });
  }

  if (acao === "consultar") {
    const c = await focus("GET", `/nfse/${encodeURIComponent(nota.ref)}`);
    if (c.status === 404) return json({ status: nota.status });
    const st = await aplicarConsulta(c.data);
    return json({ status: st });
  }

  if (acao === "cancelar") {
    if (nota.status !== "autorizada") return json({ erro: "Só uma nota autorizada pode ser cancelada." }, 400);
    const just = String(body.justificativa || "Cancelamento solicitado pela clínica").padEnd(15, ".");
    const r = await focus("DELETE", `/nfse/${encodeURIComponent(nota.ref)}`, { justificativa: just });
    if (r.data.status === "cancelado") {
      await salvar({ status: "cancelada", cancelada_em: new Date().toISOString() });
      await admin.from("pagamentos").update({ nota_id: null }).eq("nota_id", nota.id);
      return json({ status: "cancelada" });
    }
    const erros = (r.data.erros as Array<{ mensagem?: string }>) || [];
    const msg = erros.map((e) => e.mensagem).filter(Boolean).join(" | ") || String(r.data.mensagem || "A prefeitura não aceitou o cancelamento.");
    return json({ status: "autorizada", erro: msg });
  }

  return json({ erro: "Ação desconhecida." }, 400);
});
