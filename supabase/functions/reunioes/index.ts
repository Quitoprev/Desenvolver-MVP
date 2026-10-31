// Órbita — reuniões: transcrição de áudio e geração de ata (roda no servidor do Supabase).
//
// Só a dona da clínica pode usar. As chaves dos serviços de IA ficam em
// segredos da função, nunca no navegador.
//
// Segredos (Edge Functions → Secrets):
//   OPENAI_API_KEY      transcrição do áudio (modelo de transcrição da OpenAI)
//   ANTHROPIC_API_KEY   geração da ata (Claude)
//   ANTHROPIC_MODEL     opcional; padrão abaixo
//
// Chamadas (POST, JSON, com o token de login no cabeçalho Authorization):
//   { "acao": "transcrever", "reuniao_id": "..." }   usa o arquivo guardado em reunioes.arquivo
//   { "acao": "gerar_ata",   "reuniao_id": "..." }   usa reunioes.transcricao

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MODELO_TRANSCRICAO = "gpt-4o-transcribe";
const MODELO_ATA = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5";
const BUCKET = "reunioes";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT_ATA = `Você redige atas de reunião para uma clínica de terapias (fonoaudiologia, terapia ocupacional, psicologia e áreas afins). Escreva em português do Brasil, em tom profissional e direto.

A partir da transcrição, produza a ata em Markdown com exatamente estas seções:

# Ata de reunião
**Data:** {data}
**Participantes:** {participantes}

## Pauta
Lista curta dos assuntos tratados.

## Resumo
Um parágrafo por assunto, com o que foi discutido e os argumentos principais. Não invente nada que não esteja na transcrição.

## Decisões
Lista objetiva do que ficou decidido. Se nada foi decidido, escreva "Nenhuma decisão registrada".

## Encaminhamentos
Tabela com colunas: O quê | Quem | Prazo. Use "a definir" quando a transcrição não disser.

## Pendências e próximos passos
O que ficou em aberto e quando será retomado.

Regras:
- Pacientes e famílias devem aparecer apenas pelas iniciais (ex.: "T.A."), nunca pelo nome completo, mesmo que a transcrição traga o nome.
- Não inclua diagnósticos ou dados clínicos além do necessário para o registro administrativo.
- Se a transcrição estiver confusa em algum trecho, sinalize com "[trecho inaudível]" em vez de adivinhar.
- Não acrescente comentários fora da ata.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ erro: "Entre na sua conta." }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ erro: "Sessão inválida. Entre de novo." }, 401);
  const { data: me } = await admin.from("membros").select("clinica_id, papel, ativo").eq("user_id", userData.user.id).maybeSingle();
  if (!me || !me.ativo || me.papel !== "dona") return json({ erro: "Só a dona da clínica pode usar as reuniões." }, 403);

  let body: { acao?: string; reuniao_id?: string } = {};
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  if (!body.reuniao_id) return json({ erro: "Informe a reunião." }, 400);

  const { data: r } = await admin.from("reunioes").select("*").eq("id", body.reuniao_id).eq("clinica_id", me.clinica_id).maybeSingle();
  if (!r) return json({ erro: "Reunião não encontrada." }, 404);
  const salvar = (patch: Record<string, unknown>) => admin.from("reunioes").update(patch).eq("id", r.id);

  if (body.acao === "transcrever") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ erro: "Falta o segredo OPENAI_API_KEY no Supabase (Edge Functions → Secrets)." }, 500);
    if (!r.arquivo) return json({ erro: "Nenhuma gravação enviada para esta reunião." }, 400);
    await salvar({ status: "transcrevendo", erro: null });

    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(r.arquivo);
    if (dlErr || !blob) { await salvar({ status: "erro", erro: "Não achei a gravação no armazenamento." }); return json({ erro: "Não achei a gravação." }, 404); }

    const form = new FormData();
    form.append("file", blob, r.arquivo.split("/").pop() || "audio.m4a");
    form.append("model", MODELO_TRANSCRICAO);
    form.append("language", "pt");
    form.append("response_format", "json");
    form.append("prompt", "Reunião de equipe de uma clínica de terapias infantis, em português do Brasil.");
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + key }, body: form,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = String(data?.error?.message || `Serviço de transcrição respondeu ${resp.status}`);
      await salvar({ status: "erro", erro: msg });
      return json({ erro: msg }, 502);
    }
    const texto = String(data.text || "").trim();
    // o áudio não fica guardado depois da transcrição
    await admin.storage.from(BUCKET).remove([r.arquivo]);
    await salvar({ transcricao: texto, status: "transcrita", arquivo: null, erro: null });
    return json({ status: "transcrita", transcricao: texto });
  }

  if (body.acao === "gerar_ata") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ erro: "Falta o segredo ANTHROPIC_API_KEY no Supabase (Edge Functions → Secrets)." }, 500);
    const transcricao = String(r.transcricao || "").trim();
    if (transcricao.length < 40) return json({ erro: "A transcrição está vazia ou curta demais para gerar uma ata." }, 400);
    await salvar({ status: "gerando_ata", erro: null });

    const dataBr = String(r.data).split("-").reverse().join("/");
    const system = PROMPT_ATA.replace("{data}", dataBr).replace("{participantes}", r.participantes || "não informados");
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO_ATA, max_tokens: 4000, system,
        messages: [{ role: "user", content: `Título da reunião: ${r.titulo}\n\nTranscrição:\n\n${transcricao.slice(0, 180000)}` }],
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = String(data?.error?.message || `Serviço de IA respondeu ${resp.status}`);
      await salvar({ status: "erro", erro: msg });
      return json({ erro: msg }, 502);
    }
    const ata = (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n").trim();
    await salvar({ ata, status: "concluida", erro: null });
    return json({ status: "concluida", ata });
  }

  return json({ erro: "Ação desconhecida." }, 400);
});
