/* Rythmos — segurança e operação: auditoria (quem viu/alterou), assinatura da clínica
   (teste/ativa/atrasada/bloqueada), administração do Rythmos, verificação em duas etapas
   (TOTP) e exportação completa dos dados da clínica. */
"use strict";

const ADM = { aud:[], audFiltro:"", clinicas:[], carregando:false };
const ACOES = {ver:"abriu",criar:"criou",alterar:"alterou",apagar:"apagou",exportar:"exportou",login_mfa:"entrou com 2 etapas"};
const TABELAS = {pacientes:"ficha do paciente",vinculos:"terapia",sessoes:"sessão",evolucoes:"evolução",pagamentos:"pagamento",prontuarios:"prontuário",metas:"meta",metas_notas:"nota de meta",documentos:"documento",membros:"equipe",clinica:"dados da clínica"};

/* ---------- registro de leitura (chamado pelo app) ---------- */
async function auditar(acao,tabela,registro,paciente,detalhes){
  try{ await sb.rpc("registrar_acesso",{p_acao:acao,p_tabela:tabela,p_registro:registro||null,p_paciente:paciente||null,p_detalhes:detalhes||null}); }catch(e){}
}

/* ---------- assinatura: aviso e bloqueio suave ---------- */
function assinatura(){ return (S.me&&S.me.assinatura)||null; }
function diasAte(d){ return d?Math.ceil((parse(d)-parse(hoje()))/86400000):null; }
function bannerAssinatura(){
  const a=assinatura(); if(!a||!isDona()) return "";
  if(a.status==="teste"){ const n=diasAte(a.teste_ate); if(n==null) return ""; return `<div class="phase ${n<=7?"warn":""}"><span>Período de teste do Rythmos: ${n>0?`faltam ${n} ${n===1?"dia":"dias"}`:"terminou"}. Para continuar, fale com a gente.</span></div>`; }
  if(a.status==="atrasada") return `<div class="phase warn"><span>A mensalidade do Rythmos está em atraso. O app continua funcionando por enquanto; regularize para não interromper a equipe.</span></div>`;
  return "";
}
function assinaturaBloqueada(){ const a=assinatura(); return !!a&&(a.status==="bloqueada"||a.status==="cancelada"); }
function telaBloqueio(){
  gate(`<div class="card">${gateBrand()}<h2>Assinatura suspensa</h2>
  <p>O acesso da <b>${esc(S.me.clinica)}</b> ao Rythmos está suspenso. Os dados continuam guardados e ${isDona()?"você pode exportar tudo a qualquer momento.":"a gestora da clínica pode exportá-los."}</p>
  <div class="toolbar">${isDona()?'<button class="btn primary" id="gExportar">Exportar todos os dados</button>':""}<button class="btn" id="gSair">Sair</button></div>
  <p class="note">Para reativar, fale com a gente pelo WhatsApp ou e-mail que constam na proposta.</p></div>`);
  $("gSair").onclick=sair; const ex=$("gExportar"); if(ex) ex.onclick=async()=>{ ex.disabled=true; ex.textContent="Preparando…"; try{ await loadAll(); await exportarTudo(); }catch(e){ fail(e); } ex.disabled=false; ex.textContent="Exportar todos os dados"; };
}

/* ---------- auditoria (Clínica → Auditoria, só gestora) ---------- */
async function audCarregar(){
  if(ADM.carregando) return; ADM.carregando=true;
  try{ ADM.aud=await run(sb.from("auditoria").select("*").order("criado_em",{ascending:false}).limit(400)); }catch(e){ fail(e); }
  ADM.carregando=false;
}
function audHtml(){
  const f=ADM.audFiltro.trim().toLowerCase();
  const nomeDe=id=>{ if(!id) return "sistema"; const m=membro(id); return m?m.nome:"usuário removido"; };
  const linhas=ADM.aud.filter(a=>{ if(!f) return true; const p=a.paciente_id?pacById(a.paciente_id):null; return [nomeDe(a.user_id),p&&p.nome,TABELAS[a.tabela]||a.tabela,ACOES[a.acao]||a.acao].filter(Boolean).join(" ").toLowerCase().includes(f); });
  return `<p class="note">Tudo que a equipe vê ou altera em dados clínicos fica registrado automaticamente pelo banco. Esta lista mostra os últimos 400 registros.</p>
  <div class="filtro" style="margin:8px 0"><label for="audBusca">Buscar</label><input id="audBusca" data-input="audFiltro" placeholder="nome, paciente, prontuário…" value="${esc(ADM.audFiltro)}" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--ink)"><button type="button" class="btn" data-act="audCsv">CSV</button></div>
  ${linhas.length?`<div class="hist" style="max-height:60vh">${linhas.map(a=>{const p=a.paciente_id?pacById(a.paciente_id):null;const d=new Date(a.criado_em);const campos=a.detalhes&&a.detalhes.campos?a.detalhes.campos.filter(c=>!["atualizado_em","clinica_id"].includes(c)).join(", "):"";
    return `<div><span style="min-width:0"><b>${esc(nomeDe(a.user_id))}</b> ${esc(ACOES[a.acao]||a.acao)} ${esc(TABELAS[a.tabela]||a.tabela)}${p?" de <b>"+esc(p.nome)+"</b>":""}${campos?`<br><span class="note">campos: ${esc(campos)}</span>`:""}</span><span class="note" style="flex:none">${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div>`}).join("")}</div>`:'<p class="note">Nenhum registro ainda.</p>'}`;
}
function audCsv(){
  const esc2=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=[["Data","Hora","Quem","Ação","O quê","Paciente","Registro","Detalhes"],...ADM.aud.map(a=>{const d=new Date(a.criado_em),m=membro(a.user_id),p=a.paciente_id?pacById(a.paciente_id):null;return [d.toLocaleDateString("pt-BR"),d.toLocaleTimeString("pt-BR"),m?m.nome:(a.user_id||"sistema"),ACOES[a.acao]||a.acao,TABELAS[a.tabela]||a.tabela,p?p.nome:"",a.registro_id||"",a.detalhes?JSON.stringify(a.detalhes):""]})];
  baixar(new Blob(["﻿"+rows.map(r=>r.map(esc2).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}),`auditoria-${hoje()}.csv`);
  auditar("exportar","auditoria");
}
document.addEventListener("input",e=>{ if(e.target.dataset.input==="audFiltro"){ ADM.audFiltro=e.target.value; const box=e.target.closest(".sheet")?e.target.parentElement.nextElementSibling:null; if(box){ const tmp=document.createElement("div"); tmp.innerHTML=audHtml(); box.replaceWith(tmp.querySelector(".hist, p:last-child")); } } });

/* ---------- administração do Rythmos ---------- */
function isAdmin(){ return S.adminSolo===true; }
async function admCarregar(){ try{ ADM.clinicas=await run(sb.rpc("admin_clinicas")); }catch(e){ fail(e); ADM.clinicas=[]; } }
function vAdmin(){
  if(!isAdmin()) return '<div class="empty"><span>Só a administração do Rythmos.</span></div>';
  if(!ADM.clinicas.length&&!ADM.admCarregado){ ADM.admCarregado=true; admCarregar().then(()=>{ if(S.tab==="admin") render(); }); return '<div class="empty"><span>Carregando…</span></div>'; }
  const cs=ADM.clinicas, ativas=cs.filter(c=>c.assinatura&&c.assinatura.status==="ativa").length, teste=cs.filter(c=>!c.assinatura||c.assinatura.status==="teste").length, atras=cs.filter(c=>c.assinatura&&["atrasada","bloqueada"].includes(c.assinatura.status)).length;
  const mrr=cs.reduce((s,c)=>s+(c.assinatura&&c.assinatura.status==="ativa"?Number(c.assinatura.valor||0):0),0);
  let h=`<div class="toolbar" style="justify-content:space-between"><div><div class="eyebrow">Rythmos · administração</div><span class="note">Todas as clínicas e assinaturas</span></div><button type="button" class="btn" data-act="admAtualizar">Atualizar</button></div>
  <div class="stats" style="margin-top:12px"><div class="stat"><b>${cs.length}</b><span>clínicas</span></div><div class="stat hl"><b>${ativas}</b><span>pagantes</span></div><div class="stat"><b>${teste}</b><span>em teste</span></div><div class="stat ${atras?"hl":""}"><b>${atras}</b><span>atrasadas / bloqueadas</span></div></div>
  <div class="stats three" style="margin-top:8px"><div class="stat"><b>${money(mrr)}</b><span>receita mensal (MRR)</span></div><div class="stat"><b>${cs.reduce((s,c)=>s+Number(c.membros||0),0)}</b><span>profissionais ativas</span></div><div class="stat"><b>${cs.reduce((s,c)=>s+Number(c.pacientes||0),0)}</b><span>pacientes</span></div></div>
  <div class="hist" style="margin-top:12px;max-height:none">${cs.map(c=>{const a=c.assinatura||{plano:"teste",status:"teste"};const pill={ativa:"p-ok",teste:"p-confirmada",atrasada:"p-warn",bloqueada:"p-bad",cancelada:"p-mute"}[a.status]||"p-mute";
    return `<div data-act="admClinica" data-id="${c.id}" role="button" tabindex="0"><span style="min-width:0"><b>${esc(c.nome)}</b> <span class="note">· ${esc(c.gestora||"sem gestora")}</span><br><span class="note">${c.membros} na equipe · ${c.pacientes} pacientes · ${c.sessoes_30d} sessões em 30 dias${c.ultimo_acesso?" · último uso "+new Date(c.ultimo_acesso).toLocaleDateString("pt-BR"):""}</span></span><span style="display:flex;gap:6px;align-items:center;flex:none"><span class="note">${esc(a.plano)}${a.valor?" · "+money(a.valor):""}${a.status==="teste"&&a.teste_ate?" · até "+curto(a.teste_ate):a.pago_ate?" · pago até "+curto(a.pago_ate):""}</span><span class="pill ${pill}">${a.status}</span></span></div>`}).join("")||'<div><span class="note">Nenhuma clínica ainda.</span></div>'}</div>`;
  return h;
}
function sheetAdmClinica(id){
  const c=ADM.clinicas.find(x=>x.id===id); if(!c) return; const a=c.assinatura||{};
  openSheet(`<form id="fAdm"><header><div style="min-width:0"><div class="eyebrow">Assinatura</div><h2>${esc(c.nome)}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <p class="note">${esc(c.gestora||"")} · ${c.membros} na equipe · ${c.pacientes} pacientes · criada em ${new Date(c.criado_em).toLocaleDateString("pt-BR")}</p>
  <div class="fields">
    <div class="f"><label for="ad_plano">Plano</label><select id="ad_plano" name="plano">${["teste","consultorio","clinica","rede"].map(p=>`<option value="${p}" ${(a.plano||"teste")===p?"selected":""}>${p}</option>`).join("")}</select></div>
    <div class="f"><label for="ad_status">Situação</label><select id="ad_status" name="status">${["teste","ativa","atrasada","bloqueada","cancelada"].map(p=>`<option value="${p}" ${(a.status||"teste")===p?"selected":""}>${p}</option>`).join("")}</select></div>
    <div class="f"><label for="ad_teste">Teste até</label><input id="ad_teste" name="teste_ate" type="date" value="${esc(a.teste_ate||"")}"></div>
    <div class="f"><label for="ad_pago">Pago até</label><input id="ad_pago" name="pago_ate" type="date" value="${esc(a.pago_ate||"")}"></div>
    <div class="f"><label for="ad_valor">Mensalidade (R$)</label><input id="ad_valor" name="valor" type="number" step="0.01" min="0" value="${esc(a.valor||"")}"></div>
    <div class="f full"><label for="ad_obs">Observações</label><input id="ad_obs" name="obs" value="${esc(a.obs||"")}"></div>
  </div>
  <p class="note">"Atrasada" mostra um aviso à gestora e o app segue funcionando. "Bloqueada" suspende o acesso da equipe; a gestora ainda consegue exportar os dados.</p>
  <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar</button></div></div></form>`);
  $("fAdm").onsubmit=async e=>{ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target));
    try{ await run(sb.rpc("admin_assinatura",{p_clinica:id,p_plano:d.plano,p_status:d.status,p_teste_ate:d.teste_ate||null,p_pago_ate:d.pago_ate||null,p_valor:d.valor?Number(d.valor):null,p_obs:d.obs||null})); toast("Assinatura salva"); closeSheet(); await admCarregar(); render(); }catch(err){ fail(err); } };
}
function telaAdminSolo(){ // admin do Rythmos sem clínica própria
  S.adminSolo=true; S.me={nome:"Administração",papel:"admin",admin:true,clinica:"Rythmos"}; S.clinica={nome:"Administração"};
  $("gate").hidden=true; $("app").hidden=false; S.loaded=true; S.tab="admin"; render();
}

/* ---------- verificação em duas etapas (TOTP) ---------- */
async function mfaStatus(){ try{ const {data}=await sb.auth.mfa.listFactors(); return (data&&data.totp||[]).find(f=>f.status==="verified")||null; }catch(e){ return null; } }
async function mfaPrecisa(){ try{ const {data}=await sb.auth.mfa.getAuthenticatorAssuranceLevel(); return !!data&&data.nextLevel==="aal2"&&data.currentLevel!=="aal2"; }catch(e){ return false; } }
function telaMfa(){
  gate(`<form class="card" id="fMfa">${gateBrand()}<h2>Verificação em duas etapas</h2><p class="note">Abra o aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy) e digite o código de 6 dígitos.</p>
  <div class="f"><label for="mfa_code">Código</label><input id="mfa_code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus></div>
  <button class="btn primary big" type="submit">Entrar</button><button class="btn" type="button" id="mfaSair">Sair</button></form>`);
  $("mfaSair").onclick=sair;
  $("fMfa").onsubmit=async e=>{ e.preventDefault(); const code=new FormData(e.target).get("code");
    try{ const f=await mfaStatus(); if(!f) throw new Error("Nenhum autenticador cadastrado."); const {data:ch,error:e1}=await sb.auth.mfa.challenge({factorId:f.id}); if(e1) throw e1; const {error:e2}=await sb.auth.mfa.verify({factorId:f.id,challengeId:ch.id,code}); if(e2) throw e2; await iniciar(); auditar("login_mfa","membros"); }catch(err){ fail(err); } };
}
async function mfaSecao(){
  const f=await mfaStatus(); const box=$("mfaBox"); if(!box) return;
  box.innerHTML=f?`<div class="toolbar" style="justify-content:space-between"><span><b>Verificação em duas etapas ativa</b><br><span class="note">Pedimos o código do autenticador a cada novo login.</span></span><button type="button" class="btn danger" data-act="mfaDesligar" data-id="${f.id}">Desligar</button></div>`
    :`<div class="toolbar" style="justify-content:space-between"><span><b>Verificação em duas etapas</b><br><span class="note">Um código do celular além da senha. ${isDona()?"Recomendado para a gestora.":""}</span></span><button type="button" class="btn primary" data-act="mfaLigar">Ativar</button></div>`;
}
async function mfaLigar(){
  try{
    const {data,error}=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"Rythmos"}); if(error) throw error;
    openSheet(`<form id="fMfaOn"><header><h2>Ativar verificação em duas etapas</h2><button type="button" class="iconbtn" data-act="close">Cancelar</button></header>
    <p class="note">1. Abra o Google Authenticator (ou similar) e leia o código. 2. Digite os 6 dígitos que aparecerem.</p>
    <div style="text-align:center;margin:10px 0"><img src="${data.totp.qr_code}" alt="QR code" style="width:200px;height:200px;background:#fff;border-radius:12px;padding:8px"></div>
    <p class="note" style="text-align:center">Sem câmera? Chave manual: <code style="user-select:all">${esc(data.totp.secret)}</code></p>
    <div class="f"><label for="mfa_on">Código de 6 dígitos</label><input id="mfa_on" name="code" inputmode="numeric" maxlength="6" required></div>
    <div class="foot"><div class="r"><button class="btn primary" type="submit">Confirmar</button></div></div></form>`);
    $("fMfaOn").onsubmit=async e=>{ e.preventDefault(); const code=new FormData(e.target).get("code");
      try{ const {data:ch,error:e1}=await sb.auth.mfa.challenge({factorId:data.id}); if(e1) throw e1; const {error:e2}=await sb.auth.mfa.verify({factorId:data.id,challengeId:ch.id,code}); if(e2) throw e2; toast("Verificação em duas etapas ativada"); closeSheet(); sheetConta(); }catch(err){ fail(err); } };
  }catch(e){ fail(e.message&&/not enabled|disabled/i.test(e.message)?new Error("A verificação em duas etapas precisa ser ligada no Supabase (Authentication → Multi-Factor → TOTP)."):e); }
}
async function mfaDesligar(id){ try{ const {error}=await sb.auth.mfa.unenroll({factorId:id}); if(error) throw error; toast("Verificação em duas etapas desligada"); mfaSecao(); }catch(e){ fail(e); } }

/* ---------- exportação completa (LGPD: a clínica leva tudo) ---------- */
function baixar(blob,nome){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=nome; document.body.appendChild(a); a.click(); a.remove(); }
function carregarJSZip(){ if(window.JSZip) return Promise.resolve(); return new Promise((ok,err)=>{ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload=ok; s.onerror=()=>err(new Error("Não foi possível carregar o compactador. Confira a internet.")); document.head.appendChild(s); }); }
function csvDe(rows){ if(!rows.length) return ""; const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const esc2=v=>{ if(v==null) return ""; v=typeof v==="object"?JSON.stringify(v):String(v); return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v }; return "﻿"+[cols,...rows.map(r=>cols.map(c=>esc2(r[c])))].map(r=>r.join(";")).join("\r\n"); }
async function exportarTudo(){
  if(!isDona()) return toast("Só a gestora exporta os dados da clínica.");
  await carregarJSZip();
  const zip=new JSZip(), pasta=zip.folder("rythmos-"+(S.clinica.nome||"clinica").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\W+/g,"-").toLowerCase());
  const tabelas=["pacientes","vinculos","sessoes","evolucoes","pagamentos","unimed_ciclos","prontuarios","metas","metas_notas","documentos","membros","reunioes"];
  const tudo={exportado_em:new Date().toISOString(),clinica:S.clinica};
  for(const t of tabelas){ let rows=[]; try{ rows=await fetchAll(()=>sb.from(t).select("*").order(t==="membros"?"user_id":"id")); }catch(e){ try{ rows=await fetchAll(()=>sb.from(t).select("*")); }catch(e2){ rows=[]; } } tudo[t]=rows; pasta.file(t+".csv",csvDe(rows)); }
  pasta.file("tudo.json",JSON.stringify(tudo,null,2));
  pasta.file("LEIA-ME.txt",`Exportação completa do Rythmos — ${S.clinica.nome||""}\nGerada em ${new Date().toLocaleString("pt-BR")}\n\nCada arquivo .csv é uma tabela (abre no Excel; separador ponto e vírgula). tudo.json tem os mesmos dados em formato aberto.\nA pasta documentos/ tem os arquivos anexados aos pacientes (laudos, relatórios), quando houver.\nColunas com _id ligam as tabelas: paciente_id → pacientes.id, vinculo_id → vinculos.id, profissional_id → membros.user_id.\n`);
  // documentos (arquivos), melhor esforço, até 200 MB
  let total=0, docs=tudo.documentos||[]; const pd=zip.folder(pasta.name? pasta.name:"docs");
  for(const d of docs){ if(total>200*1024*1024) break; try{ const {data,error}=await sb.storage.from("documentos").createSignedUrl(d.caminho,120); if(error) continue; const r=await fetch(data.signedUrl); if(!r.ok) continue; const b=await r.blob(); total+=b.size; const p=pacById(d.paciente_id); pasta.folder("documentos").file(`${(p?p.nome:"paciente").replace(/[\\/:*?"<>|]+/g,"-")}/${d.nome}`,b); }catch(e){} }
  const blob=await zip.generateAsync({type:"blob"});
  baixar(blob,`rythmos-exportacao-${hoje()}.zip`);
  toast("Exportação pronta"); auditar("exportar","clinica",null,null,{tabelas:tabelas.length,documentos:docs.length});
}

/* ---------- ações ---------- */
function admAcao(a,t){
  const id=t.dataset.id;
  if(a==="audCsv"){ audCsv(); return true; }
  if(a==="admAtualizar"){ ADM.admCarregado=false; ADM.clinicas=[]; render(); return true; }
  if(a==="admClinica"){ sheetAdmClinica(id); return true; }
  if(a==="mfaLigar"){ mfaLigar(); return true; }
  if(a==="mfaDesligar"){ confirmInline(t,"Desligar a verificação em duas etapas?",()=>mfaDesligar(id)); return true; }
  if(a==="exportarTudo"){ t.disabled=true; t.textContent="Preparando…"; exportarTudo().catch(fail).finally(()=>{ t.disabled=false; t.textContent="Exportar tudo (.zip)"; }); return true; }
  return false;
}
