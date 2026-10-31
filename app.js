/* Rythmos — app da clínica. Sem etapa de build: este arquivo roda direto no navegador.
   Quem protege os dados é o banco (supabase/schema.sql); o app só mostra o que o banco entrega. */
"use strict";

/* ================= utilidades ================= */
const $ = id => document.getElementById(id);
const TERAPIAS = ["Fonoaudiologia","Terapia ocupacional","Psicologia","ABA","Psicopedagogia","Fisioterapia","Musicoterapia","Neuropsicologia"];
const STATUS = {agendada:"Agendada",confirmada:"Confirmada",presente:"Presente",falta:"Falta",desmarcada:"Desmarcada"};
const SITUACAO = {ativo:"Ativo",fila:"Na fila",pausado:"Pausado",alta:"Alta"};
const PAPEL = {dona:"Dona da clínica",profissional:"Profissional"};
const FORMAS = ["Pix","Dinheiro","Cartão de débito","Cartão de crédito","Transferência"];
const DEF = {
  confirmacao:"Olá, {responsavel}! Aqui é da {clinica}. Passando para confirmar a sessão de {paciente} em {data}, às {hora}, com {terapeuta}. Podemos confirmar? Responda SIM ou NÃO, por favor.",
  fila:"Olá, {responsavel}! Aqui é da {clinica}. Abriu uma vaga em {terapia} para {paciente}. Podemos conversar sobre os horários disponíveis?",
  unimed:"Olá, {responsavel}! Aqui é da {clinica}. Lembrando que a nova guia da Unimed de {paciente} ({terapia}) precisa chegar até {dia1}, na primeira sessão de {mes}. Se ainda não levou o pedido de prorrogação à Unimed, dá tempo de fazer isso esta semana. Sem a guia nova, o atendimento fica pausado até a autorização chegar. Qualquer dúvida, é só chamar!",
  guia:"Olá, {responsavel}! Aqui é da {clinica}. Ainda não recebemos a nova guia da Unimed de {paciente} ({terapia}) para {mes}. Sem ela, o atendimento fica pausado. Consegue trazer na próxima sessão?"
};

function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function hoje(){return iso(new Date())}
function parse(s){const[y,m,d]=String(s).slice(0,10).split("-").map(Number);return new Date(y,m-1,d)}
function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return iso(d)}
function diffDays(a,b){return Math.round((parse(b)-parse(a))/864e5)}
function fmtDia(s,o){return parse(s).toLocaleDateString("pt-BR",o||{weekday:"short",day:"numeric",month:"short"}).replace(/\./g,"")}
function fmtLongo(s){return fmtDia(s,{weekday:"long",day:"numeric",month:"long"})}
function curto(s){return s?parse(s).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):""}
function ymOf(s){return String(s||"").slice(0,7)}
function addMonths(ym,n){let[y,m]=ym.split("-").map(Number);m+=n;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return y+"-"+String(m).padStart(2,"0")}
function nomeMes(ym){return parse(ym+"-01").toLocaleDateString("pt-BR",{month:"long"})}
function mesAno(ym){return parse(ym+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}
function fimMes(ym){return addDays(addMonths(ym,1)+"-01",-1)}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function hhmm(t){return String(t||"").slice(0,5)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function first(n){return String(n||"").trim().split(/\s+/)[0]}
function chamar(n){return first(String(n||"").replace(/^(dra?\.?|dr\.?)\s+/i,""))}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function waNum(t){let d=String(t||"").replace(/\D/g,"");if(!d)return"";if(d.length<=11)d="55"+d;return d}
function waLink(tel,msg){const n=waNum(tel);return n?`https://wa.me/${n}?text=${encodeURIComponent(msg)}`:""}
function fill(tpl,v){return String(tpl).replace(/\{(\w+)\}/g,(m,k)=>v[k]??m)}
function uuid(){return crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16))}
function byNome(a,b){return String(a.nome).localeCompare(String(b.nome),"pt-BR")}
function lsGet(k){try{return localStorage.getItem(k)}catch{return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch{}}

function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,2800)}
function errMsg(e){
  const m=String(e&&(e.message||e.error_description||e)||"");
  if(/row-level security|permission denied/i.test(m))return"Você não tem permissão para essa ação.";
  if(/Invalid login credentials/i.test(m))return"E-mail ou senha incorretos.";
  if(/Email not confirmed/i.test(m))return"Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if(/User already registered/i.test(m))return"Já existe uma conta com esse e-mail. Use Entrar.";
  if(/Password should be at least/i.test(m))return"A senha precisa ter pelo menos 6 caracteres.";
  if(/Failed to fetch|NetworkError/i.test(m))return"Sem conexão com o servidor. Confira a internet e tente de novo.";
  return m||"Algo deu errado. Tente de novo.";
}
function fail(e){console.error(e);toast(errMsg(e))}

/* ================= Supabase ================= */
const CFG=window.RYTHMOS_CONFIG||window.SESSIO_CONFIG||window.ORBITA_CONFIG||window.LUMO_CONFIG||{};
const configurado=CFG.SUPABASE_URL&&/^https:\/\//.test(CFG.SUPABASE_URL)&&CFG.SUPABASE_ANON_KEY&&!/COLE_AQUI/.test(CFG.SUPABASE_ANON_KEY);
const sb=configurado&&window.supabase?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
async function run(p){const{data,error}=await p;if(error)throw error;return data}
async function fetchAll(build){let out=[],from=0;const step=1000;for(;;){const{data,error}=await build().range(from,from+step-1);if(error)throw error;out=out.concat(data||[]);if(!data||data.length<step)break;from+=step}return out}

/* ================= estado ================= */
const S={
  user:null, me:null, clinica:{}, membros:[], pac:[], vin:[], ses:[], evo:{}, pag:{}, cic:{},
  tab:lsGet("rythmos.tab")||"agenda", dia:hoje(), uniMes:ymOf(hoje()), cxMes:ymOf(hoje()),
  prof:lsGet("rythmos.prof")||"", busca:"", filtroSit:"ativo", envio:null, loaded:false, lastLoad:0,
  fxMes:ymOf(hoje()), fxSub:"receita", notas:[], reunioes:[], rec:null,
  extra:{} // caixa de meses fora da janela carregada
};
const JANELA_INI=()=>addDays(hoje(),-120);

const papel=()=>S.me&&S.me.papel;
const isDona=()=>papel()==="dona";
const isEquipe=()=>papel()==="dona"; // só a dona vê a clínica inteira
const isProf=()=>papel()==="profissional";
const canCaixa=()=>isDona()||isProf();
const meuId=()=>S.me&&S.me.user_id;
const profFiltro=()=>isEquipe()?S.prof:meuId();
const atendentes=()=>S.membros.filter(m=>m.ativo&&(m.papel==="profissional"||m.papel==="dona")).sort(byNome);
const membro=id=>S.membros.find(m=>m.user_id===id);
const nomeProf=id=>{const m=membro(id);return m?m.nome:"Sem profissional"};
const pacById=id=>S.pac.find(p=>p.id===id);
const vinById=id=>S.vin.find(v=>v.id===id);
const modelo=k=>(S.clinica.modelos&&S.clinica.modelos[k])||DEF[k];
const podeEditarSessao=s=>isEquipe()||s.profissional_id===meuId();
const podeEvolucao=s=>isDona()||s.profissional_id===meuId();

const L={
  clinica:async()=>{S.clinica=(await run(sb.from("clinicas").select("*").maybeSingle()))||{}},
  membros:async()=>{S.membros=await run(sb.from("membros").select("*").order("nome"))},
  pac:async()=>{S.pac=await fetchAll(()=>sb.from("pacientes").select("*").order("nome").order("id"))},
  vin:async()=>{S.vin=await fetchAll(()=>sb.from("vinculos").select("*").order("criado_em").order("id"))},
  ses:async()=>{S.ses=await fetchAll(()=>sb.from("sessoes").select("*").gte("data",JANELA_INI()).lte("data",addDays(hoje(),200)).order("data").order("hora").order("id"))},
  evo:async()=>{const r=await fetchAll(()=>sb.from("evolucoes").select("sessao_id,paciente_id,profissional_id,data").gte("data",JANELA_INI()).order("sessao_id"));S.evo=Object.fromEntries(r.map(e=>[e.sessao_id,e]))},
  pag:async()=>{if(!canCaixa()){S.pag={};return}const r=await fetchAll(()=>sb.from("pagamentos").select("*").gte("data",JANELA_INI()).order("sessao_id"));S.pag=Object.fromEntries(r.map(p=>[p.sessao_id,p]))},
  reunioes:async()=>{S.reunioes=isDona()?await fetchAll(()=>sb.from("reunioes").select("id,titulo,data,participantes,origem,status,erro,arquivo,criado_em,atualizado_em").order("data",{ascending:false}).order("criado_em",{ascending:false})):[]},
  notas:async()=>{S.notas=await fetchAll(()=>sb.from("notas_fiscais").select("id,clinica_id,profissional_id,paciente_id,sessao_ids,competencia,valor,status,numero,url_pdf,url_xml,erro,ambiente,emitida_em,criado_em").order("criado_em",{ascending:false}).order("id"))},
  cic:async()=>{const r=await fetchAll(()=>sb.from("unimed_ciclos").select("*").gte("mes",addMonths(ymOf(hoje()),-6)).order("mes").order("vinculo_id"));S.cic=Object.fromEntries(r.map(c=>[c.vinculo_id+"_"+c.mes,c]))}
};
async function reload(keys){
  try{await Promise.all(keys.map(k=>L[k]()));S.extra={}}catch(e){fail(e)}
  render();
}
async function loadAll(){
  S.loaded=false;render();
  try{await Promise.all(Object.keys(L).map(k=>L[k]()));S.loaded=true;S.lastLoad=Date.now();S.extra={}}
  catch(e){fail(e);S.loaded=true}
  if(isEquipe()&&S.prof&&!membro(S.prof))S.prof="";
  render();
}

/* ================= entrada (login, clínica, aprovação) ================= */
function gate(html){$("app").hidden=true;const g=$("gate");g.hidden=false;g.innerHTML=html}
const LOGO=`<svg class="mark" viewBox="0 0 60 40" aria-hidden="true"><path class="mk-line" d="M5 29 C12 29 13 20 20 20 C27 20 28 27 35 25 C41 23 42 14 46 12" fill="none" stroke-width="5" stroke-linecap="round"/><circle class="mk-dot" cx="53" cy="10" r="6"/></svg>`;
function gateBrand(){return`<div class="brand">${LOGO}<span class="word">rythmos</span></div>`}

function telaConfig(){
  gate(`<div class="card">${gateBrand()}<h2>Falta conectar o banco</h2>
  <p class="note">Abra o arquivo <b>config.js</b> no GitHub e cole a <b>Project URL</b> e a chave <b>anon public</b> do seu projeto no Supabase (Project Settings → API). Depois de salvar, a Vercel publica de novo em cerca de um minuto.</p></div>`);
}

function telaLogin(modo,msg){
  modo=modo||"entrar";
  const t={entrar:"Entrar",criar:"Criar conta",esqueci:"Recuperar senha"}[modo];
  gate(`<form class="card" id="fAuth">${gateBrand()}
    <div><h2>${t}</h2><p class="note">${modo==="criar"?"Use seu e-mail. Depois você cria a clínica ou entra com o código que a clínica te passar.":modo==="esqueci"?"Enviamos um link para você criar uma senha nova.":"Agenda, pacientes e evoluções da clínica."}</p></div>
    <div class="f"><label for="a_email">E-mail</label><input id="a_email" name="email" type="email" autocomplete="email" required></div>
    ${modo!=="esqueci"?`<div class="f"><label for="a_senha">Senha</label><input id="a_senha" name="senha" type="password" minlength="6" autocomplete="${modo==="criar"?"new-password":"current-password"}" required></div>`:""}
    ${msg?`<p class="${msg.ok?"note":"err"}">${esc(msg.t)}</p>`:""}
    <button class="btn primary big" type="submit">${t}</button>
    <div class="toolbar" style="justify-content:space-between">
      ${modo!=="entrar"?'<button type="button" class="linkbtn" data-modo="entrar">Já tenho conta</button>':'<button type="button" class="linkbtn" data-modo="criar">Criar conta</button>'}
      ${modo==="entrar"?'<button type="button" class="linkbtn" data-modo="esqueci">Esqueci a senha</button>':""}
    </div></form>`);
  $("gate").querySelectorAll("[data-modo]").forEach(b=>b.onclick=()=>telaLogin(b.dataset.modo));
  $("fAuth").onsubmit=async e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const btn=e.target.querySelector("[type=submit]");btn.disabled=true;
    try{
      if(modo==="entrar"){await run(sb.auth.signInWithPassword({email:d.email,password:d.senha}))}
      else if(modo==="criar"){
        const r=await run(sb.auth.signUp({email:d.email,password:d.senha,options:{emailRedirectTo:location.origin}}));
        if(!r.session)return telaLogin("entrar",{ok:true,t:"Conta criada. Abra o e-mail que enviamos e clique no link de confirmação; depois entre aqui."});
      }else{
        await run(sb.auth.resetPasswordForEmail(d.email,{redirectTo:location.origin}));
        return telaLogin("entrar",{ok:true,t:"Se o e-mail tiver conta, chega um link em instantes para criar a senha nova."});
      }
    }catch(err){telaLogin(modo,{t:errMsg(err)})}
  };
}

function telaNovaSenha(){
  gate(`<form class="card" id="fSenha">${gateBrand()}<h2>Crie uma senha nova</h2>
    <div class="f"><label for="n_senha">Senha nova</label><input id="n_senha" name="senha" type="password" minlength="6" autocomplete="new-password" required></div>
    <button class="btn primary big" type="submit">Salvar senha</button></form>`);
  $("fSenha").onsubmit=async e=>{e.preventDefault();try{await run(sb.auth.updateUser({password:new FormData(e.target).get("senha")}));toast("Senha alterada");iniciar()}catch(err){fail(err)}};
}

function telaOnboarding(){
  gate(`<div style="display:flex;flex-direction:column;gap:16px;align-items:center;width:100%">
  <div class="card" style="max-width:820px">${gateBrand()}<div><h2>Bem-vinda ao Rythmos</h2><p class="note">Sua conta (${esc(S.user.email)}) ainda não está em nenhuma clínica.</p></div></div>
  <div class="cards2">
    <form class="card" id="fEntrar"><h2>Entrar na clínica</h2><p class="note">Para as profissionais da clínica. Peça o código à dona.</p>
      <div class="f"><label for="o_cod">Código da clínica</label><input id="o_cod" name="codigo" required autocapitalize="characters" maxlength="12" style="text-transform:uppercase;letter-spacing:.15em"></div>
      <div class="f"><label for="o_nome1">Seu nome</label><input id="o_nome1" name="nome" required placeholder="Como aparece na agenda"></div>
      <button class="btn primary big" type="submit">Pedir acesso</button></form>
    <form class="card" id="fCriar"><h2>Cadastrar minha clínica</h2><p class="note">Para a dona ou gestora. Você controla quem entra e o que cada um vê.</p>
      <div class="f"><label for="o_cli">Nome da clínica</label><input id="o_cli" name="clinica" required></div>
      <div class="f"><label for="o_nome2">Seu nome</label><input id="o_nome2" name="nome" required></div>
      <button class="btn big" type="submit">Cadastrar clínica</button></form>
  </div>
  <button class="linkbtn" id="oSair">Sair desta conta</button></div>`);
  $("oSair").onclick=sair;
  $("fEntrar").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{await run(sb.rpc("entrar_clinica",{p_codigo:d.codigo,p_meu_nome:d.nome}));iniciar()}catch(err){fail(err)}};
  $("fCriar").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{await run(sb.rpc("criar_clinica",{p_nome:d.clinica,p_meu_nome:d.nome}));iniciar()}catch(err){fail(err)}};
}

function telaAguardando(){
  gate(`<div class="card">${gateBrand()}<h2>Aguardando aprovação</h2>
  <p>Seu pedido para entrar na <b>${esc(S.me.clinica)}</b> foi enviado. Assim que a dona da clínica aprovar, sua agenda aparece aqui.</p>
  <div class="toolbar"><button class="btn primary" id="gAtual">Verificar de novo</button><button class="btn" id="gSair">Sair</button></div></div>`);
  $("gAtual").onclick=iniciar;$("gSair").onclick=sair;
}

async function sair(){try{await sb.auth.signOut()}catch{}S.me=null;S.user=null;telaLogin("entrar")}

let iniciando=false;
async function iniciar(){
  if(iniciando)return;iniciando=true;
  try{await iniciar2()}finally{iniciando=false}
}
async function iniciar2(){
  if(!sb)return telaConfig();
  const{data:{session}}=await sb.auth.getSession();
  if(!session)return telaLogin("entrar");
  S.user=session.user;
  try{S.me=await run(sb.rpc("meu_status"))}catch(e){fail(e);return telaLogin("entrar")}
  if(!S.me)return telaOnboarding();
  if(!S.me.ativo)return telaAguardando();
  $("gate").hidden=true;$("app").hidden=false;
  if(!tabs().some(t=>t[0]===S.tab))S.tab="agenda";
  await loadAll();
}

/* ================= casca do app ================= */
function tabs(){
  const t=[["agenda","Agenda"],["pacientes","Pacientes"],["fila","Fila"],["unimed","Unimed"]];
  if(canCaixa())t.push(["caixa","Caixa"],["fiscal","Fiscal"]);
  if(isDona())t.push(["reunioes","Reuniões"]);
  return t;
}
function render(){
  if($("app").hidden)return;
  $("clinicName").textContent=S.me?(S.clinica.nome||S.me.clinica)+" · "+(isProf()?S.me.nome:PAPEL[papel()]):"";
  $("btnClinica").hidden=!isDona();
  const lg=$("clinicLogo");if(S.clinica.logo){lg.src=S.clinica.logo;lg.hidden=false}else lg.hidden=true;
  const pend=S.loaded?{agenda:minhasPendencias().length,fila:filaLista().length,unimed:pendUnimed(),fiscal:canCaixa()?pendFiscal():0}:{};
  $("tabs").innerHTML=tabs().map(([k,l])=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="${S.tab===k}">${l}${pend[k]?`<span class="n${k!=="fila"?" dot":""}">${pend[k]}</span>`:""}</button>`).join("");
  const fab=$("fab");
  const fl={agenda:"+ Nova sessão",pacientes:"+ Novo paciente",fila:"+ Adicionar à fila",reunioes:"+ Nova reunião"}[S.tab];
  const pendFx=S.loaded&&canCaixa()?pendFiscal():0;
  fab.hidden=!fl||!S.loaded;fab.textContent=fl||"";
  let h="";
  if(!S.loaded)h='<div class="empty"><span>Carregando…</span></div>';
  else h=({agenda:vAgenda,pacientes:vPacientes,fila:vFila,unimed:vUnimed,caixa:vCaixa,fiscal:vFiscal,reunioes:vReunioes}[S.tab]||vAgenda)();
  $("view").innerHTML=h;
}
function filtroProf(opts){
  if(!isEquipe())return"";
  const lista=atendentes();
  return`<div class="filtro"><label for="selProf">Profissional</label><select id="selProf" data-change="prof">
    <option value="">${opts&&opts.todas||"Todas as profissionais"}</option>${lista.map(m=>`<option value="${m.user_id}" ${S.prof===m.user_id?"selected":""}>${esc(m.nome)}</option>`).join("")}</select></div>`;
}
function daynav(label,act,valor,isHoje,hojeAct){
  return`<div class="daynav"><button class="nav" data-act="${act}" data-n="-1" aria-label="Anterior">‹</button>
  <div class="day"><div class="eyebrow">${label}</div><h2>${esc(valor)}</h2></div>
  ${isHoje?"":`<button class="chip-today" data-act="${hojeAct}">${act==="dia"?"Hoje":"Mês atual"}</button>`}
  <button class="nav" data-act="${act}" data-n="1" aria-label="Próximo">›</button></div>`;
}

/* ================= Agenda ================= */
function sesVisiveis(){const f=profFiltro();return f?S.ses.filter(s=>s.profissional_id===f):S.ses}
function minhasPendencias(){
  if(isEquipe()&&!(isDona()&&S.prof===meuId()))return[];
  const lim=addDays(hoje(),-30);
  return S.ses.filter(s=>s.profissional_id===meuId()&&s.status==="presente"&&s.data<=hoje()&&s.data>=lim&&!S.evo[s.id]).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora));
}
function vAgenda(){
  const d=S.dia,isHoje=d===hoje();
  const ss=sesVisiveis().filter(s=>s.data===d).sort((a,b)=>String(a.hora).localeCompare(String(b.hora)));
  const n=k=>ss.filter(s=>s.status===k).length;
  const rot=isHoje?"Hoje":d===addDays(hoje(),1)?"Amanhã":d===addDays(hoje(),-1)?"Ontem":"Agenda";
  let h=filtroProf()+daynav(rot,"dia",fmtLongo(d),isHoje,"hoje");
  if(isHoje)h+=bannerUnimed();
  h+=`<div class="stats"><div class="stat"><b>${ss.filter(s=>s.status!=="desmarcada").length}</b><span>sessões</span></div>
    <div class="stat ${n("agendada")?"hl":""}"><b>${n("agendada")}</b><span>a confirmar</span></div>
    <div class="stat"><b>${n("confirmada")+n("presente")}</b><span>confirmadas</span></div>
    <div class="stat"><b>${n("falta")}</b><span>faltas</span></div></div>`;
  if(!S.vin.length){
    h+=`<div class="empty"><strong>Comece pelos pacientes</strong><span>Cadastre um paciente com a terapia e a profissional. Depois é só agendar e confirmar pelo WhatsApp.</span><button class="btn primary" data-act="novoPac">Cadastrar paciente</button>${isDona()?'<button class="btn" data-act="abrirClinica" data-sub="exemplos">Ou carregue dados de exemplo</button>':""}</div>`;
  }else if(!ss.length){
    h+=`<div class="empty"><strong>Nenhuma sessão neste dia</strong><span>Toque em Nova sessão para agendar. Dá para repetir toda semana de uma vez.</span></div>`;
  }else{
    const mostrarProf=isEquipe()&&!S.prof;
    h+='<div class="list">';
    for(const s of ss){
      const p=pacById(s.paciente_id)||{nome:"Paciente"},v=vinById(s.vinculo_id);
      const passou=s.data<=hoje(),pode=podeEditarSessao(s),link=waLink(p.telefone,msgConfirmacao(s));
      h+=`<div class="row ${s.status==="desmarcada"?"dim":""}">
        <div class="time">${hhmm(s.hora)}</div>
        <div class="who" data-act="editSes" data-id="${s.id}"><div class="name">${esc(p.nome)}${p.exemplo?'<span class="ex">exemplo</span>':""}${v?uniPill(v,s):""}</div>
          <div class="sub">${esc([s.terapia,mostrarProf?nomeProf(s.profissional_id):""].filter(Boolean).join(" · "))}${S.evo[s.id]?" · evolução registrada":""}</div></div>
        <span class="pill p-${s.status}">${STATUS[s.status]}</span>
        ${pode&&s.status!=="desmarcada"?`<div class="acts">
          ${s.status==="agendada"&&link?`<a class="btn wa" href="${link}" target="_blank" rel="noopener">WhatsApp</a>`:""}
          ${s.status==="agendada"?`<button class="btn" data-act="st" data-id="${s.id}" data-v="confirmada">Confirmou</button>`:""}
          ${passou&&s.status!=="presente"&&s.status!=="falta"?`<button class="btn" data-act="st" data-id="${s.id}" data-v="presente">Presente</button><button class="btn danger" data-act="st" data-id="${s.id}" data-v="falta">Falta</button>`:""}
          ${passou&&s.status==="presente"&&podeEvolucao(s)?`<button class="btn ${S.evo[s.id]?"":"primary"}" data-act="evo" data-id="${s.id}">${S.evo[s.id]?"Ver evolução":"Escrever evolução"}</button>`:""}
        </div>`:""}
      </div>`;
    }
    h+="</div>";
  }
  const pend=minhasPendencias();
  if(pend.length){
    h+=`<div><div class="eyebrow">Suas evoluções pendentes · últimos 30 dias</div></div><div class="list">`;
    for(const s of pend){const p=pacById(s.paciente_id)||{nome:"Paciente"};
      h+=`<div class="row"><div class="time" style="font-size:13px">${curto(s.data)}</div><div class="who" data-act="evo" data-id="${s.id}"><div class="name">${esc(p.nome)}</div><div class="sub">${hhmm(s.hora)} · ${esc(s.terapia||"")}</div></div><button class="btn primary" data-act="evo" data-id="${s.id}">Escrever</button></div>`}
    h+="</div>";
  }
  return h;
}
function msgConfirmacao(s){
  const p=pacById(s.paciente_id)||{};
  return fill(modelo("confirmacao"),{responsavel:first(p.responsavel)||"tudo bem",paciente:first(p.nome),data:fmtLongo(s.data),hora:hhmm(s.hora),terapeuta:nomeProf(s.profissional_id),terapia:s.terapia||"",clinica:S.clinica.nome||""});
}

/* ================= Pacientes ================= */
function pacVisiveis(){
  const f=profFiltro();
  let ps=S.pac;
  if(f)ps=ps.filter(p=>S.vin.some(v=>v.paciente_id===p.id&&v.profissional_id===f));
  return ps;
}
function freqOf(pid){
  const lim=addDays(hoje(),-90),ss=S.ses.filter(s=>s.paciente_id===pid&&s.data>=lim&&s.data<=hoje());
  const pres=ss.filter(s=>s.status==="presente").length,falt=ss.filter(s=>s.status==="falta").length;
  return{pres,falt,pct:pres+falt?Math.round(pres*100/(pres+falt)):null};
}
function freqPill(f){if(f.pct==null)return'<span class="pill p-mute">sem histórico</span>';return`<span class="pill ${f.pct>=85?"p-ok":f.pct>=70?"p-warn":"p-bad"}">${f.pct}% presença</span>`}
function vPacientes(){
  const q=S.busca.trim().toLowerCase();
  const f=profFiltro();
  let ps=pacVisiveis();
  const sitDe=p=>{const vs=S.vin.filter(v=>v.paciente_id===p.id&&(!f||v.profissional_id===f));return vs.some(v=>v.situacao==="ativo")?"ativo":vs.some(v=>v.situacao==="fila")?"fila":vs.some(v=>v.situacao==="pausado")?"pausado":vs.length?"alta":"sem"};
  const cont=k=>ps.filter(p=>sitDe(p)===k).length;
  if(q)ps=ps.filter(p=>[p.nome,p.responsavel,p.telefone].join(" ").toLowerCase().includes(q));
  else ps=ps.filter(p=>S.filtroSit==="todos"||sitDe(p)===S.filtroSit||(S.filtroSit==="ativo"&&sitDe(p)==="sem"));
  ps=[...ps].sort(byNome);
  let h=filtroProf()+`<div class="toolbar"><input class="search" id="busca" type="search" placeholder="Buscar paciente ou responsável" value="${esc(S.busca)}" aria-label="Buscar">
    <div class="seg" role="group">${[["ativo","Ativos"],["pausado","Pausados"],["alta","Alta"],["todos","Todos"]].map(([k,l])=>`<button data-act="sit" data-v="${k}" aria-pressed="${!q&&S.filtroSit===k}">${l}${k!=="todos"?" "+cont(k):""}</button>`).join("")}</div></div>`;
  if(!ps.length)return h+`<div class="empty"><strong>${q?"Ninguém encontrado":"Nenhum paciente aqui"}</strong><span>${q?"Confira a grafia ou busque pelo responsável.":"Cadastre com o botão Novo paciente."}</span></div>`;
  h+='<div class="list">';
  for(const p of ps){
    const vs=S.vin.filter(v=>v.paciente_id===p.id);
    h+=`<div class="prow" data-act="editPac" data-id="${p.id}" tabindex="0">
      <div style="min-width:0"><div class="name">${esc(p.nome)}${p.exemplo?'<span class="ex">exemplo</span>':""}</div>
        <div class="sub">${p.responsavel?"Resp. "+esc(p.responsavel):"Responsável não informado"}</div>
        <div class="chips">${vs.map(v=>`<span class="chip ${v.situacao}"><b>${esc(v.terapia)}</b> · ${esc(v.profissional_id?chamar(nomeProf(v.profissional_id)):"sem profissional")}${v.situacao!=="ativo"?" · "+SITUACAO[v.situacao].toLowerCase():""}</span>`).join("")}</div></div>
      <div class="right">${p.convenio==="Unimed"?'<span class="pill uni">Unimed</span>':""}${freqPill(freqOf(p.id))}</div></div>`;
  }
  return h+'</div><p class="note">Presença dos últimos 90 dias, considerando as sessões que você pode ver.</p>';
}

/* ================= Fila ================= */
function filaLista(){
  const f=profFiltro();
  return S.vin.filter(v=>v.situacao==="fila"&&(!f||v.profissional_id===f))
    .sort((a,b)=>(b.prioridade==="alta")-(a.prioridade==="alta")||String(a.entrada_fila||"").localeCompare(String(b.entrada_fila||"")));
}
function vFila(){
  const fila=filaLista();
  let h=filtroProf()+`<div><div class="eyebrow">Por prioridade e ordem de chegada</div><h2>${fila.length} ${fila.length===1?"família aguardando":"famílias aguardando"}</h2></div>`;
  if(!fila.length)return h+'<div class="empty"><strong>Fila vazia</strong><span>Quando uma família pedir vaga, adicione com a terapia desejada. Ao abrir horário, chame pelo WhatsApp e inicie o atendimento.</span></div>';
  h+='<div class="list">';
  fila.forEach((v,i)=>{
    const p=pacById(v.paciente_id)||{nome:"Paciente"},dias=v.entrada_fila?diffDays(v.entrada_fila,hoje()):null;
    const link=waLink(p.telefone,fill(modelo("fila"),{responsavel:first(p.responsavel)||"tudo bem",paciente:first(p.nome),terapia:v.terapia,clinica:S.clinica.nome||"",terapeuta:v.profissional_id?nomeProf(v.profissional_id):"",data:"",hora:""}));
    h+=`<div class="row"><div class="pos">${i+1}</div>
      <div class="who" data-act="editPac" data-id="${p.id}"><div class="name">${esc(p.nome)}${v.prioridade==="alta"?'<span class="pill p-warn">prioridade</span>':""}${p.exemplo?'<span class="ex">exemplo</span>':""}</div>
        <div class="sub">${esc(v.terapia)} · ${esc(v.profissional_id?nomeProf(v.profissional_id):"sem profissional definida")}${p.responsavel?" — "+esc(p.responsavel):""}</div></div>
      <div class="wait">${dias??"–"}<small>dias</small></div>
      <div class="acts">${link?`<a class="btn wa" href="${link}" target="_blank" rel="noopener">Chamar no WhatsApp</a>`:""}<button class="btn primary" data-act="iniciarVin" data-id="${v.id}">Iniciar atendimento</button></div></div>`;
  });
  return h+"</div>";
}

/* ================= Unimed ================= */
const cyc=(vid,ym)=>S.cic[vid+"_"+ym]||null;
const isUniV=v=>{const p=pacById(v.paciente_id);return!!p&&p.convenio==="Unimed"};
const iniYm=v=>v.inicio_convenio?ymOf(v.inicio_convenio):"";
const vinFiltro=v=>{const f=profFiltro();return!f||v.profissional_id===f};
function cicloDe(M){return S.vin.filter(v=>isUniV(v)&&vinFiltro(v)&&(v.situacao==="ativo"||(v.situacao==="pausado"&&(cyc(v.id,M)||{}).pausado_em))&&(!iniYm(v)||iniYm(v)<=M))}
function guiasPend(M){
  if(M>ymOf(hoje()))return[];
  const ant=addMonths(M,-1);
  return S.vin.filter(v=>{const c=cyc(v.id,ant)||{};return isUniV(v)&&vinFiltro(v)&&(v.situacao==="ativo"||(v.situacao==="pausado"&&c.pausado_em))&&(!iniYm(v)||iniYm(v)<M)&&!c.guia_em});
}
const JANELA_PEDIDO=15, JANELA_LEMBRETE=26;
function diaDe(t){return Number(t.slice(8,10))}
function alertasUnimed(){
  const t=hoje(),M=ymOf(t),d=diaDe(t),ciclo=cicloDe(M);
  const pedidos=d>=JANELA_PEDIDO?ciclo.filter(v=>!(cyc(v.id,M)||{}).pedido_em):[];
  const lembretes=d>=JANELA_LEMBRETE?ciclo.filter(v=>!(cyc(v.id,M)||{}).msg_em):[];
  const guias=guiasPend(M);
  return{pedidos,lembretes,guias,d,M};
}
function pendUnimed(){const A=alertasUnimed();return A.pedidos.length+A.lembretes.length+A.guias.length}
function bannerUnimed(){
  const A=alertasUnimed();if(!S.vin.some(isUniV))return"";
  const prazo=A.M+"-20",d1=addMonths(A.M,1)+"-01",t=hoje();
  if(A.guias.length)return`<div class="phase bad"><span><b>Unimed:</b> ${A.guias.length} ${A.guias.length===1?"família ainda não trouxe":"famílias ainda não trouxeram"} a guia nova. Cobre pelo WhatsApp ou pause o atendimento.</span><button class="btn" data-act="irUnimed">Abrir Unimed</button></div>`;
  if(A.lembretes.length)return`<div class="phase warn"><span><b>Unimed:</b> guias novas vencem em 1º de ${nomeMes(addMonths(A.M,1))}${diffDays(t,d1)===1?" (amanhã)":` (em ${diffDays(t,d1)} dias)`}. Mande o lembrete para ${A.lembretes.length} ${A.lembretes.length===1?"família":"famílias"}.</span><button class="btn" data-act="irUnimed">Enviar lembretes</button></div>`;
  if(A.pedidos.length)return`<div class="phase ${A.d>=18?"bad":"warn"}"><span><b>Unimed:</b> ${t>prazo?"o dia 20 passou e":"até dia 20,"} ${A.pedidos.length} ${A.pedidos.length===1?"pedido de prorrogação ainda precisa":"pedidos de prorrogação ainda precisam"} ser ${A.pedidos.length===1?"entregue":"entregues"} à família.</span><button class="btn" data-act="irUnimed">Ver pedidos</button></div>`;
  return"";
}
function uniPill(v,s){
  if(!isUniV(v))return"";
  const M=ymOf(s.data),cur=ymOf(hoje());
  let g=null;
  if(s.status!=="desmarcada"&&M>=cur&&!(iniYm(v)&&iniYm(v)>=M)&&!(cyc(v.id,addMonths(M,-1))||{}).guia_em)g=M===cur?"bad":"warn";
  return g==="bad"?'<span class="pill p-bad">sem guia Unimed</span>':g==="warn"?'<span class="pill p-warn">Unimed · aguarda guia</span>':'<span class="pill uni">Unimed</span>';
}
function varsV(v){const p=pacById(v.paciente_id)||{};return{responsavel:first(p.responsavel)||"tudo bem",paciente:first(p.nome),clinica:S.clinica.nome||"",terapia:v.terapia||"",terapeuta:v.profissional_id?nomeProf(v.profissional_id):"",data:"",hora:""}}
function msgUnimed(v,M){const nx=addMonths(M,1);return fill(modelo("unimed"),{...varsV(v),prazo:curto(M+"-20"),dia1:"1º de "+nomeMes(nx),mes:nomeMes(nx)})}
function msgGuia(v,M){return fill(modelo("guia"),{...varsV(v),prazo:curto(addMonths(M,-1)+"-20"),dia1:"1º de "+nomeMes(M),mes:nomeMes(M)})}
async function writeCyc(vid,ym,patch){
  S.cic={...S.cic,[vid+"_"+ym]:{...(cyc(vid,ym)||{vinculo_id:vid,mes:ym}),...patch}};render();
  await run(sb.from("unimed_ciclos").upsert({vinculo_id:vid,mes:ym,...patch},{onConflict:"vinculo_id,mes"}));
}
function vUnimed(){
  const t=hoje(),cur=ymOf(t),M=S.uniMes,nx=addMonths(M,1),ant=addMonths(M,-1),prazo=M+"-20",d1=nx+"-01";
  const mostrarProf=isEquipe()&&!S.prof;
  let h=filtroProf()+daynav("Ciclo da Unimed","mes",cap(mesAno(M)),M===cur,"mesAtual");
  if(!S.vin.some(isUniV))return h+`<div class="empty"><strong>Nenhum paciente da Unimed</strong><span>Na ficha do paciente, escolha Convênio: Unimed. Em cada terapia, informe a data do atendimento inicial. A partir daí ele entra no ciclo de cada mês.</span></div>`;
  const nomeV=v=>(pacById(v.paciente_id)||{}).nome||"";
  const ciclo=cicloDe(M).sort((a,b)=>nomeV(a).localeCompare(nomeV(b),"pt-BR")),gp=guiasPend(M).sort((a,b)=>nomeV(a).localeCompare(nomeV(b),"pt-BR"));
  const cs=ciclo.map(v=>cyc(v.id,M)||{}),N=ciclo.length;
  const nPed=cs.filter(c=>c.pedido_em).length,nMsg=cs.filter(c=>c.msg_em).length,nGuia=cs.filter(c=>c.guia_em).length;
  const semMsg=ciclo.filter(v=>!(cyc(v.id,M)||{}).msg_em);
  const btn=semMsg.length&&M<=cur?`<button class="btn primary" data-act="disparo">Enviar lembretes (${semMsg.length})</button>`:"";
  if(M===cur){
    const d=diaDe(t),falt=N-nPed,nd1=diffDays(t,d1);
    if(d<JANELA_PEDIDO)h+=`<div class="phase info"><span><b>1ª etapa · até dia 20:</b> entregar à família o pedido de prorrogação, para ela levar à Unimed. Faltam ${diffDays(t,prazo)} dias.</span></div>`;
    else if(t<=prazo)h+=`<div class="phase ${falt?(d>=18?"bad":"warn"):"info"}"><span><b>1ª etapa · até dia 20:</b> ${falt?`${falt} ${falt===1?"pedido ainda precisa":"pedidos ainda precisam"} ser ${falt===1?"entregue":"entregues"} à família${t===prazo?" — é hoje":` (faltam ${diffDays(t,prazo)} dias)`}.`:"todos os pedidos foram entregues."}</span></div>`;
    else if(d<JANELA_LEMBRETE)h+=`<div class="phase ${falt?"bad":"info"}"><span>${falt?`<b>Atenção:</b> ${falt} ${falt===1?"pedido ainda não foi entregue":"pedidos ainda não foram entregues"} e o dia 20 já passou. `:"Pedidos entregues. "}A partir do dia ${JANELA_LEMBRETE}, mande o lembrete da guia nova às famílias.</span></div>`;
    else h+=`<div class="phase ${semMsg.length?"warn":"info"}"><span><b>2ª etapa · até dia 1º:</b> a família precisa trazer a guia nova em 1º de ${nomeMes(nx)}${nd1===1?" (amanhã)":` (em ${nd1} dias)`}, senão o atendimento pausa. ${semMsg.length?`${semMsg.length} ${semMsg.length===1?"família ainda não recebeu":"famílias ainda não receberam"} o lembrete.`:"Todas as famílias já receberam o lembrete."}${falt?` ${falt} ${falt===1?"pedido continua":"pedidos continuam"} sem entrega.`:""}</span>${btn}</div>`;
  }else if(M>cur)h+=`<div class="phase info"><span>Este ciclo ainda não começou. Pedidos de prorrogação até ${curto(prazo)}; lembrete da guia a partir do dia ${JANELA_LEMBRETE}.</span></div>`;
  h+=`<div class="cycle"><div><span class="k">Até ${curto(prazo)}</span><b>${nPed}/${N}</b><span>pedidos entregues</span></div>
    <div><span class="k">Dia ${JANELA_LEMBRETE} a 1º</span><b>${nMsg}/${N}</b><span>lembretes da guia</span></div>
    <div><span class="k">${curto(d1)}</span><b>${nGuia}/${N}</b><span>guias de ${nomeMes(nx)}</span></div></div>`;
  const ex='<span class="ex">exemplo</span>';
  if(gp.length){
    h+=`<div><div class="eyebrow">Guia de ${nomeMes(M)} não chegou</div><h2>${gp.length} ${gp.length===1?"atendimento sem guia":"atendimentos sem guia"}</h2></div><div class="list">`;
    for(const v of gp){
      const p=pacById(v.paciente_id)||{},ca=cyc(v.id,ant)||{},pausado=v.situacao==="pausado",link=waLink(p.telefone,msgGuia(v,M));
      h+=`<div class="urow"><div class="who" data-act="editPac" data-id="${p.id}"><div class="name">${esc(p.nome)}${p.exemplo?ex:""}</div>
        <div class="sub">${esc(v.terapia)}${mostrarProf?" · "+esc(nomeProf(v.profissional_id)):""} · ${ca.pedido_em?"pedido entregue em "+curto(ca.pedido_em):"pedido não registrado"}</div></div>
        <span class="pill ${pausado?"p-mute":"p-bad"}">${pausado?"Pausado":"Sem guia"}</span>
        <div class="acts"><button class="btn primary" data-act="guiaOk" data-id="${v.id}" data-m="${ant}">Guia recebida</button>${link?`<a class="btn wa" href="${link}" target="_blank" rel="noopener">Cobrar guia no WhatsApp</a>`:""}${pausado?"":`<button class="btn danger" data-act="pausarUni" data-id="${v.id}" data-m="${ant}">Pausar atendimento</button>`}</div></div>`;
    }
    h+="</div>";
  }
  h+=`<div><div class="eyebrow">Prorrogação</div><h2>${cap(nomeMes(M))} → ${nomeMes(nx)}</h2></div>`;
  if(!N)return h+'<div class="empty"><span>Nenhum atendimento ativo da Unimed neste ciclo.</span></div>';
  h+='<div class="list">';
  for(const v of ciclo){
    const p=pacById(v.paciente_id)||{},c=cyc(v.id,M)||{},ini=iniYm(v)===M,iniTarde=ini&&v.inicio_convenio>prazo;
    const und=(f,txt)=>`<button class="step done" data-act="undoUni" data-id="${v.id}" data-m="${M}" data-f="${f}" title="Toque para desfazer">${txt}</button>`;
    const ped=c.pedido_em?und("pedido_em","Pedido entregue "+curto(c.pedido_em)):(t>prazo&&M<=cur)?`<span class="step ${iniTarde?"soon":"late"}">${iniTarde?"Pedido: entregar já":"Pedido atrasado"}</span>`:`<span class="step ${M===cur&&diffDays(t,prazo)<=5?"soon":""}">Pedido até ${curto(prazo)}</span>`;
    const msg=c.msg_em?und("msg_em","Lembrete "+curto(String(c.msg_em).slice(0,10))):`<span class="step ${M===cur&&diaDe(t)>=JANELA_LEMBRETE?"soon":""}">Lembrete da guia</span>`;
    const late=!c.guia_em&&t>=d1;
    const gui=c.guia_em?und("guia_em","Guia de "+nomeMes(nx)+" "+curto(c.guia_em)):`<span class="step ${late?"late":""}">${late?"Guia de "+nomeMes(nx)+" atrasada":"Guia em "+curto(d1)}</span>`;
    h+=`<div class="urow"><div class="who" data-act="editPac" data-id="${p.id}"><div class="name">${esc(p.nome)}${p.exemplo?ex:""}${ini?'<span class="pill p-confirmada">atendimento inicial</span>':""}${v.situacao==="pausado"?'<span class="pill p-mute">pausado</span>':""}</div>
      <div class="sub">${esc([v.terapia,mostrarProf?nomeProf(v.profissional_id):"",p.responsavel].filter(Boolean).join(" · "))}</div></div><span></span>
      <div class="steps">${ped}${msg}${gui}</div>
      <div class="acts">${c.pedido_em?"":`<button class="btn ${t>=addDays(prazo,-5)&&M<=cur?"primary":""}" data-act="pedidoOk" data-id="${v.id}" data-m="${M}">Pedido entregue</button>`}
        <button class="btn wa" data-act="disparoUm" data-id="${v.id}">${c.msg_em?"Reenviar lembrete":"Enviar lembrete da guia"}</button>
        ${c.guia_em?"":`<button class="btn" data-act="guiaOk" data-id="${v.id}" data-m="${M}">Guia recebida</button>`}
        ${late&&v.situacao!=="pausado"?`<button class="btn danger" data-act="pausarUni" data-id="${v.id}" data-m="${M}">Pausar atendimento</button>`:""}</div></div>`;
  }
  return h+`</div><p class="note">Regra da Unimed: no atendimento inicial a família já traz a primeira guia. <b>Até o dia 20</b>, a equipe entrega à família o pedido de prorrogação, para ela levar à Unimed. <b>Até o dia 1º</b> do mês seguinte, a família traz a guia nova; sem ela, o atendimento é pausado. O app avisa a partir do dia ${JANELA_PEDIDO} (pedidos) e do dia ${JANELA_LEMBRETE} (lembretes).</p>`;
}
function sheetDisparo(ids){S.envio={ids,i:0,feitos:0};stepDisparo()}
function stepDisparo(){
  const q=S.envio,M=S.uniMes;
  if(q.i>=q.ids.length){openSheet(`<header><h2>Pronto</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header><p>${q.feitos} ${q.feitos===1?"responsável marcado como avisado":"responsáveis marcados como avisados"} neste envio.</p><div class="foot"><div class="r"><button type="button" class="btn primary" data-act="close">Concluir</button></div></div>`);return}
  const v=vinById(q.ids[q.i]);if(!v){q.i++;return stepDisparo()}
  const p=pacById(v.paciente_id)||{},msg=msgUnimed(v,M),link=waLink(p.telefone,msg),many=q.ids.length>1;
  openSheet(`<header><div style="min-width:0"><div class="eyebrow">${many?`Lembrete ${q.i+1} de ${q.ids.length}`:"Lembrete da guia"}</div><h2>${esc(p.nome)}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <p class="note">Para ${esc(p.responsavel||"o responsável")} · ${p.telefone?esc(p.telefone):"sem WhatsApp cadastrado"} · ${esc(v.terapia)}</p>
  <div class="msgbox" id="msgtxt">${esc(msg)}</div>
  <div class="foot">${many?'<button type="button" class="btn" data-act="envPular">Pular</button>':""}<div class="r"><button type="button" class="btn" data-act="copy">Copiar</button>${link?`<a class="btn primary" href="${link}" target="_blank" rel="noopener" data-act="envFeito">Abrir no WhatsApp</a>`:`<button type="button" class="btn primary" data-act="envFeito">Marcar como avisado</button>`}</div></div>
  <p class="note">${link?"Ao abrir o WhatsApp, o responsável fica marcado como avisado":"Copie e envie pelo seu WhatsApp; depois marque como avisado"}${many?" e a próxima mensagem aparece":""}.</p>`);
}

/* ================= Caixa ================= */
async function caixaDados(M){
  const ini=M+"-01",fim=fimMes(M);
  if(ini>=JANELA_INI())return{ses:S.ses.filter(s=>s.data>=ini&&s.data<=fim),pag:S.pag};
  if(S.extra[M])return S.extra[M];
  const ses=await fetchAll(()=>sb.from("sessoes").select("*").gte("data",ini).lte("data",fim).order("data").order("id"));
  const pr=await fetchAll(()=>sb.from("pagamentos").select("*").gte("data",ini).lte("data",fim).order("sessao_id"));
  S.extra[M]={ses,pag:Object.fromEntries(pr.map(p=>[p.sessao_id,p]))};
  return S.extra[M];
}
function vCaixa(){
  const M=S.cxMes,cur=ymOf(hoje()),ini=M+"-01";
  let h=filtroProf({todas:"Clínica inteira"})+daynav("Caixa","cx",cap(mesAno(M)),M===cur,"cxAtual");
  if(ini<JANELA_INI()&&!S.extra[M]){caixaDados(M).then(render).catch(fail);return h+'<div class="empty"><span>Carregando o mês…</span></div>'}
  const D=ini>=JANELA_INI()?{ses:S.ses.filter(s=>s.data>=ini&&s.data<=fimMes(M)),pag:S.pag}:S.extra[M];
  const f=profFiltro();
  const ss=D.ses.filter(s=>s.status==="presente"&&(!f||s.profissional_id===f)).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  const linha=s=>{
    const v=vinById(s.vinculo_id)||{},p=pacById(s.paciente_id)||{},pg=D.pag[s.id];
    const uni=p.convenio==="Unimed";
    const valor=pg?Number(pg.valor):Number(v.valor_sessao||0);
    const status=uni?"convenio":(pg?pg.status:"pendente");
    return{s,v,p,pg,uni,valor,status};
  };
  const L2=ss.map(linha);
  const soma=arr=>arr.reduce((a,x)=>a+x.valor,0);
  const part=L2.filter(x=>!x.uni),rec=part.filter(x=>x.status==="pago"),abe=part.filter(x=>x.status!=="pago"),uni=L2.filter(x=>x.uni);
  const total=soma(L2);
  const porProf={};
  for(const x of L2){const k=x.s.profissional_id||"-";(porProf[k]=porProf[k]||[]).push(x)}
  const repasseDe=(k,arr)=>{const m=membro(k);return soma(arr)*Number(m&&m.repasse_pct||0)/100};
  const repasse=Object.entries(porProf).reduce((a,[k,arr])=>a+repasseDe(k,arr),0);
  h+=`<div class="stats"><div class="stat"><b class="money">${money(soma(rec))}</b><span>particular recebido</span></div>
    <div class="stat ${abe.length?"hl":""}"><b class="money">${money(soma(abe))}</b><span>particular em aberto (${abe.length})</span></div>
    <div class="stat"><b class="money">${money(soma(uni))}</b><span>Unimed · ${uni.length} ${uni.length===1?"sessão":"sessões"}</span></div>
    <div class="stat"><b class="money">${money(total)}</b><span>total produzido</span></div></div>`;
  if(f){
    const m=membro(f),pct=Number(m&&m.repasse_pct||0);
    h+=`<div class="list"><div class="urow"><div><div class="name">Repasse à clínica</div><div class="sub">${pct}% sobre o total produzido</div></div><b class="money">${money(repasse)}</b></div>
      <div class="urow"><div><div class="name">Líquido da profissional</div><div class="sub">Total produzido menos o repasse</div></div><b class="money">${money(total-repasse)}</b></div></div>`;
  }else if(isDona()){
    const rows=Object.entries(porProf).map(([k,arr])=>{const m=membro(k);return{nome:m?m.nome:"Sem profissional",n:arr.length,tot:soma(arr),rec:soma(arr.filter(x=>!x.uni&&x.status==="pago")),abe:soma(arr.filter(x=>!x.uni&&x.status!=="pago")),uni:soma(arr.filter(x=>x.uni)),rep:repasseDe(k,arr)}}).sort(byNome);
    if(rows.length)h+=`<div><div class="eyebrow">Fechamento por profissional</div></div><div class="tablewrap"><table><thead><tr><th>Profissional</th><th class="n">Sessões</th><th class="n">Recebido</th><th class="n">Em aberto</th><th class="n">Unimed</th><th class="n">Repasse à clínica</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.nome)}</td><td class="n">${r.n}</td><td class="n">${money(r.rec)}</td><td class="n">${money(r.abe)}</td><td class="n">${money(r.uni)}</td><td class="n">${money(r.rep)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>Total</td><td class="n">${L2.length}</td><td class="n">${money(soma(rec))}</td><td class="n">${money(soma(abe))}</td><td class="n">${money(soma(uni))}</td><td class="n">${money(repasse)}</td></tr></tfoot></table></div>`;
  }
  if(!L2.length)return h+'<div class="empty"><strong>Nenhuma sessão realizada neste mês</strong><span>As sessões marcadas como Presente aparecem aqui com o valor do atendimento.</span></div>';
  h+=`<div><div class="eyebrow">Sessões realizadas</div></div><div class="list">`;
  for(const x of L2){
    h+=`<div class="row"><div class="time" style="font-size:13px">${curto(x.s.data)}</div>
      <div class="who" data-act="pagar" data-id="${x.s.id}"><div class="name">${esc(x.p.nome||"Paciente")}</div><div class="sub">${esc([x.s.terapia,!f?nomeProf(x.s.profissional_id):""].filter(Boolean).join(" · "))}${x.pg&&x.pg.forma?" · "+esc(x.pg.forma):""}</div></div>
      <div style="text-align:right"><div class="money" style="font-weight:700">${money(x.valor)}</div>
        <span class="pill ${x.status==="pago"?"p-ok":x.status==="convenio"?"uni":"p-warn"}">${x.status==="pago"?"Pago":x.status==="convenio"?"Unimed":"Em aberto"}</span></div>
      ${x.uni?"":`<div class="acts">${x.status==="pago"?`<button class="btn" data-act="pagar" data-id="${x.s.id}">Editar pagamento</button>`:`<button class="btn primary" data-act="pagar" data-id="${x.s.id}">Registrar pagamento</button>`}</div>`}</div>`;
  }
  return h+'</div><p class="note">Faltas não entram no caixa. O valor vem da terapia do paciente e pode ser ajustado em cada pagamento.</p>';
}
function sheetPagamento(sid){
  const s=S.ses.find(x=>x.id===sid)||Object.values(S.extra).flatMap(e=>e.ses).find(x=>x.id===sid);if(!s)return;
  const pg=S.pag[sid]||Object.values(S.extra).map(e=>e.pag[sid]).find(Boolean)||{};
  const v=vinById(s.vinculo_id)||{},p=pacById(s.paciente_id)||{};
  if(p.convenio==="Unimed"){toast("Sessão da Unimed: o valor vem do convênio");return}
  openSheet(`<form id="fPag"><header><div style="min-width:0"><div class="eyebrow">${esc(fmtDia(s.data))} · ${hhmm(s.hora)} · ${esc(s.terapia||"")}</div><h2>${esc(p.nome||"Paciente")}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <div class="fields">
    <div class="f"><label for="g_valor">Valor (R$)</label><input id="g_valor" name="valor" type="number" min="0" step="0.01" inputmode="decimal" required value="${esc(pg.valor??v.valor_sessao??"")}"></div>
    <div class="f"><label for="g_status">Situação</label><select id="g_status" name="status"><option value="pago" ${pg.status!=="pendente"?"selected":""}>Pago</option><option value="pendente" ${pg.status==="pendente"?"selected":""}>Em aberto</option></select></div>
    <div class="f"><label for="g_forma">Forma de pagamento</label><select id="g_forma" name="forma"><option value="">—</option>${FORMAS.map(x=>`<option ${pg.forma===x?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="f"><label for="g_data">Pago em</label><input id="g_data" name="pago_em" type="date" value="${esc(pg.pago_em||hoje())}"></div>
  </div>
  <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar</button></div></div></form>`);
  $("fPag").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    try{await run(sb.from("pagamentos").upsert({sessao_id:sid,valor:Number(d.valor||0),status:d.status,forma:d.forma||null,pago_em:d.status==="pago"?(d.pago_em||hoje()):null},{onConflict:"sessao_id"}));closeSheet();toast("Pagamento salvo");reload(["pag"])}catch(err){fail(err)}};
}

/* ================= Fiscal ================= */
function cpfFmt(c){const d=String(c||"").replace(/\D/g,"");return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4"):c||""}
function cpfValido(c){const d=String(c||"").replace(/\D/g,"");if(d.length!==11||/^(\d)\1+$/.test(d))return false;const calc=n=>{let s=0;for(let i=0;i<n;i++)s+=Number(d[i])*(n+1-i);const r=(s*10)%11;return r===10?0:r};return calc(9)===Number(d[9])&&calc(10)===Number(d[10])}
function cnpjFmt(c){const d=String(c||"").replace(/\D/g,"");return d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5"):c||""}
function fxDados(M){
  const ini=M+"-01",fim=fimMes(M);
  const D=ini>=JANELA_INI()?{ses:S.ses.filter(s=>s.data>=ini&&s.data<=fim),pag:S.pag}:S.extra[M];
  if(!D)return null;
  const f=profFiltro();
  return D.ses.filter(s=>s.status==="presente"&&(!f||s.profissional_id===f)).map(s=>{
    const v=vinById(s.vinculo_id)||{},p=pacById(s.paciente_id)||{},pg=D.pag[s.id]||null,m=membro(s.profissional_id)||{};
    return{s,v,p,pg,m,uni:p.convenio==="Unimed",pago:!!pg&&pg.status==="pago",valor:pg?Number(pg.valor):Number(v.valor_sessao||0),via:m.recebe==="pf"?"pf":"clinica"};
  }).filter(x=>!x.uni&&x.pago);
}
function pendFiscal(){const L=fxDados(ymOf(hoje()))||[];return L.filter(x=>x.via==="pf"?!x.pg.receita_saude_em:!x.pg.nota_id).length}
function notaDe(id){return S.notas.find(n=>n.id===id)}
const NOTA_ST={pendente:["p-mute","Aguardando envio"],processando:["p-confirmada","Processando na prefeitura"],autorizada:["p-ok","Autorizada"],erro:["p-bad","Erro"],cancelada:["p-mute","Cancelada"]};
function vFiscal(){
  const M=S.fxMes,cur=ymOf(hoje());
  let h=filtroProf({todas:"Clínica inteira"})+daynav("Fiscal","fx",cap(mesAno(M)),M===cur,"fxAtual");
  if(M+"-01"<JANELA_INI()&&!S.extra[M]){caixaDados(M).then(render).catch(fail);return h+'<div class="empty"><span>Carregando o mês…</span></div>'}
  const L=fxDados(M)||[];
  const pf=L.filter(x=>x.via==="pf"),cl=L.filter(x=>x.via==="clinica");
  const semCpf=L.filter(x=>!x.p.cpf_pagador).length;
  h+=`<div class="subtabs"><button type="button" data-act="fxSub" data-v="receita" aria-pressed="${S.fxSub==="receita"}">Receita Saúde${pf.filter(x=>!x.pg.receita_saude_em).length?` <span class="n dot">${pf.filter(x=>!x.pg.receita_saude_em).length}</span>`:""}</button>
    <button type="button" data-act="fxSub" data-v="notas" aria-pressed="${S.fxSub==="notas"}">Notas fiscais${cl.filter(x=>!x.pg.nota_id).length?` <span class="n dot">${cl.filter(x=>!x.pg.nota_id).length}</span>`:""}</button>
    <button type="button" data-act="fxSub" data-v="contador" aria-pressed="${S.fxSub==="contador"}">Contador</button></div>`;
  if(semCpf)h+=`<div class="banner">${semCpf} ${semCpf===1?"sessão paga sem CPF de quem pagou":"sessões pagas sem CPF de quem pagou"}. Informe na ficha do paciente, em "Quem paga".</div>`;
  if(S.fxSub==="receita")return h+vReceitaSaude(pf);
  if(S.fxSub==="notas")return h+vNotas(cl,M);
  return h+vContador(L,M);
}
function agrupar(L){const g={};for(const x of L){const k=x.s.paciente_id+"|"+x.s.profissional_id;(g[k]=g[k]||{p:x.p,m:x.m,itens:[]}).itens.push(x)}return Object.values(g).sort((a,b)=>byNome(a.p,b.p))}
function vReceitaSaude(pf){
  const mostrarProf=isEquipe()&&!S.prof;
  let h=`<p class="note">Sessões particulares pagas a profissionais autônomas. Desde 2025, o recibo é obrigatório pelo app <b>Receita Saúde</b> (gov.br), em nome da própria profissional. O Rythmos prepara o que lançar e marca o que já foi emitido.</p>`;
  if(!pf.length)return h+'<div class="empty"><strong>Nada a lançar neste mês</strong><span>Aparecem aqui as sessões pagas de profissionais que recebem como pessoa física (Equipe → "Quem recebe").</span></div>';
  for(const g of agrupar(pf)){
    const pend=g.itens.filter(x=>!x.pg.receita_saude_em),tot=g.itens.reduce((a,x)=>a+x.valor,0);
    h+=`<div><div class="list" style="border-radius:12px 12px 0 0"><div class="urow"><div><div class="name">${esc(g.p.nome)}${mostrarProf?`<span class="pill p-mute">${esc(chamar(g.m.nome||""))}</span>`:""}</div>
      <div class="sub">Pagador: ${g.p.nome_pagador?esc(g.p.nome_pagador):esc(g.p.responsavel||"não informado")} · CPF ${g.p.cpf_pagador?esc(cpfFmt(g.p.cpf_pagador)):'<span class="pill p-bad">faltando</span>'}${g.m.registro?" · "+esc(g.m.registro):""}</div></div>
      <div style="text-align:right"><div class="money" style="font-weight:700">${money(tot)}</div><span class="pill ${pend.length?"p-warn":"p-ok"}">${pend.length?pend.length+" a lançar":"tudo emitido"}</span></div>
      <div class="acts">${pend.length?`<button class="btn" data-act="copyRS" data-k="${g.p.id}|${g.m.user_id}">Copiar dados</button><button class="btn primary" data-act="rsOk" data-k="${g.p.id}|${g.m.user_id}">Marcar como emitido (${pend.length})</button>`:`<button class="btn" data-act="rsUndo" data-k="${g.p.id}|${g.m.user_id}">Desfazer</button>`}</div></div>`;
    h+=`<div class="hist" style="border-top:0;border-radius:0 0 12px 12px">${g.itens.map(x=>`<div><span>${curto(x.s.data)} · ${esc(x.s.terapia||"")}${x.pg.forma?" · "+esc(x.pg.forma):""}</span><span style="display:flex;gap:6px"><span class="money">${money(x.valor)}</span>${x.pg.receita_saude_em?'<span class="pill p-ok">emitido</span>':'<span class="pill p-warn">a lançar</span>'}</span></div>`).join("")}</div></div></div>`;
  }
  return h;
}
function vNotas(cl,M){
  const mostrarProf=isEquipe()&&!S.prof;
  const fx=S.clinica.fiscal||{},cfgOk=fx.cnpj&&fx.inscricao_municipal&&fx.codigo_municipio;
  let h=`<p class="note">Sessões particulares pagas à clínica (CNPJ). A nota fiscal de serviço (NFS-e) é emitida pelo Rythmos em nome da clínica${fx.ambiente==="producao"?"":", <b>em ambiente de testes</b> até você ligar a produção em Clínica → Fiscal"}.</p>`;
  if(isDona()&&!cfgOk)h+=`<div class="phase warn"><span>Antes de emitir, preencha os dados fiscais da clínica (CNPJ, inscrição municipal, município).</span><button class="btn" data-act="abrirClinica" data-sub="fiscal">Preencher</button></div>`;
  const semNota=cl.filter(x=>!x.pg.nota_id);
  if(semNota.length){
    h+=`<div><div class="eyebrow">Sem nota · ${semNota.length}</div></div>`;
    for(const g of agrupar(semNota)){
      const tot=g.itens.reduce((a,x)=>a+x.valor,0),ok=!!g.p.cpf_pagador&&cpfValido(g.p.cpf_pagador);
      h+=`<div class="list"><div class="urow"><div><div class="name">${esc(g.p.nome)}${mostrarProf?`<span class="pill p-mute">${esc(chamar(g.m.nome||""))}</span>`:""}</div>
        <div class="sub">${g.itens.length} ${g.itens.length===1?"sessão":"sessões"} · ${g.itens.map(x=>curto(x.s.data)).join(", ")} · tomador: ${g.p.nome_pagador?esc(g.p.nome_pagador):esc(g.p.responsavel||"não informado")}${g.p.cpf_pagador?" · CPF "+esc(cpfFmt(g.p.cpf_pagador)):""}</div></div>
        <div style="text-align:right"><div class="money" style="font-weight:700">${money(tot)}</div>${ok?"":'<span class="pill p-bad">CPF do pagador faltando ou inválido</span>'}</div>
        ${isDona()?`<div class="acts"><button class="btn primary" data-act="emitirNota" data-k="${g.p.id}|${g.m.user_id}" ${ok&&cfgOk?"":"disabled"}>Emitir nota (${money(tot)})</button><button class="btn" data-act="editPac" data-id="${g.p.id}">Ficha do paciente</button></div>`:""}</div></div>`;
    }
  }else h+='<div class="empty"><strong>Todas as sessões pagas à clínica têm nota</strong><span>Aparecem aqui as sessões pagas de profissionais que recebem pela clínica (Equipe → "Quem recebe").</span></div>';
  const ns=S.notas.filter(n=>n.competencia===M&&(!profFiltro()||n.profissional_id===profFiltro()));
  if(ns.length){
    h+=`<div><div class="eyebrow">Notas do mês · ${ns.length}</div></div><div class="list">`;
    for(const n of ns){const p=pacById(n.paciente_id)||{},[cls,lbl]=NOTA_ST[n.status]||["p-mute",n.status];
      h+=`<div class="urow"><div><div class="name">${esc(p.nome||"Paciente")}${n.numero?` <span class="pill p-mute">nº ${esc(n.numero)}</span>`:""}${n.ambiente==="homologacao"?' <span class="ex">teste</span>':""}</div>
        <div class="sub">${n.sessao_ids.length} ${n.sessao_ids.length===1?"sessão":"sessões"}${mostrarProf?" · "+esc(nomeProf(n.profissional_id)):""}${n.emitida_em?" · emitida em "+esc(new Date(n.emitida_em).toLocaleDateString("pt-BR")):""}${n.erro?`<div class="err" style="margin-top:4px">${esc(n.erro)}</div>`:""}</div></div>
        <div style="text-align:right"><div class="money" style="font-weight:700">${money(n.valor)}</div><span class="pill ${cls}">${lbl}</span></div>
        <div class="acts">${n.url_pdf?`<a class="btn" href="${esc(n.url_pdf)}" target="_blank" rel="noopener">Abrir PDF</a>`:""}${n.url_xml?`<a class="btn" href="${esc(n.url_xml)}" target="_blank" rel="noopener">XML</a>`:""}
          ${isDona()&&n.status==="processando"?`<button class="btn" data-act="consultarNota" data-id="${n.id}">Atualizar</button>`:""}
          ${isDona()&&n.status==="erro"?`<button class="btn primary" data-act="reenviarNota" data-id="${n.id}">Tentar de novo</button><button class="btn danger" data-act="descartarNota" data-id="${n.id}">Descartar</button>`:""}
          ${isDona()&&n.status==="pendente"?`<button class="btn primary" data-act="reenviarNota" data-id="${n.id}">Enviar</button><button class="btn danger" data-act="descartarNota" data-id="${n.id}">Descartar</button>`:""}
          ${isDona()&&n.status==="autorizada"?`<button class="btn danger" data-act="cancelarNota" data-id="${n.id}">Cancelar nota</button>`:""}</div></div>`;
    }
    h+="</div>";
  }
  return h;
}
function vContador(L,M){
  const porVia={pf:L.filter(x=>x.via==="pf"),clinica:L.filter(x=>x.via==="clinica")};
  const soma=a=>a.reduce((t,x)=>t+x.valor,0);
  return`<p class="note">Resumo do mês para enviar ao contador. A planilha traz cada sessão paga, com CPF do pagador, forma de pagamento, nota ou recibo e repasse.</p>
  <div class="stats three"><div class="stat"><b class="money">${money(soma(porVia.clinica))}</b><span>faturado pela clínica (NFS-e)</span></div><div class="stat"><b class="money">${money(soma(porVia.pf))}</b><span>recebido por autônomas (Receita Saúde)</span></div><div class="stat"><b class="money">${money(soma(L))}</b><span>particular pago no mês</span></div></div>
  <div class="toolbar"><button class="btn primary" data-act="exportCsv" data-m="${M}">Baixar planilha de ${esc(nomeMes(M))} (.csv)</button><span class="note">Abre no Excel e no Google Planilhas.</span></div>`;
}
function exportCsv(M){
  const L=fxDados(M)||[];
  const cab=["Data","Hora","Paciente","Pagador","CPF do pagador","Profissional","CPF profissional","Registro","Recebe","Terapia","Valor","Forma","Pago em","Documento","Nº nota","Receita Saúde em","Repasse %","Repasse R$"];
  const esc2=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=L.sort((a,b)=>(a.s.data+a.s.hora).localeCompare(b.s.data+b.s.hora)).map(x=>{const n=x.pg.nota_id?notaDe(x.pg.nota_id):null;const pct=Number(x.m.repasse_pct||0);
    return[curto(x.s.data)+"/"+x.s.data.slice(0,4),hhmm(x.s.hora),x.p.nome,x.p.nome_pagador||x.p.responsavel||"",cpfFmt(x.p.cpf_pagador),x.m.nome||"",cpfFmt(x.m.cpf),x.m.registro||"",x.via==="pf"?"Profissional (PF)":"Clínica (CNPJ)",x.s.terapia||"",x.valor.toFixed(2).replace(".",","),x.pg.forma||"",x.pg.pago_em?curto(x.pg.pago_em)+"/"+x.pg.pago_em.slice(0,4):"",x.via==="pf"?"Receita Saúde":"NFS-e",n?(n.numero||n.status):"",x.pg.receita_saude_em?curto(x.pg.receita_saude_em)+"/"+x.pg.receita_saude_em.slice(0,4):"",pct?String(pct).replace(".",","):"0",(x.valor*pct/100).toFixed(2).replace(".",",")]});
  const csv="\ufeff"+[cab,...rows].map(r=>r.map(esc2).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`rythmos-${(S.clinica.nome||"clinica").replace(/\W+/g,"-").toLowerCase()}-${M}.csv`;document.body.appendChild(a);a.click();a.remove();
}
function dadosRS(k){const[pid,uid]=k.split("|");const L=(fxDados(S.fxMes)||[]).filter(x=>x.via==="pf"&&x.s.paciente_id===pid&&x.s.profissional_id===uid);return{pid,uid,L}}
async function nfseCall(body){const{data,error}=await sb.functions.invoke("nfse",{body});if(error){let m=error.message;try{const j=await error.context.json();if(j&&j.erro)m=j.erro}catch{}throw new Error(m)}if(data&&data.erro)throw new Error(data.erro);return data}
async function emitirNota(k){
  const{pid,uid,L}=dadosRS(k);
  const itens=(fxDados(S.fxMes)||[]).filter(x=>x.via==="clinica"&&x.s.paciente_id===pid&&x.s.profissional_id===uid&&!x.pg.nota_id);
  if(!itens.length)return;
  const p=pacById(pid)||{};
  const id=uuid();
  await run(sb.from("notas_fiscais").insert({id,sessao_ids:itens.map(x=>x.s.id),competencia:S.fxMes,valor:itens.reduce((a,x)=>a+x.valor,0),tomador_cpf:String(p.cpf_pagador).replace(/\D/g,""),tomador_nome:p.nome_pagador||p.responsavel||p.nome,tomador_email:p.email_pagador||null}));
  toast("Enviando para a prefeitura…");
  await reload(["notas","pag"]);
  const r=await nfseCall({acao:"emitir",nota_id:id});
  toast(r.status==="autorizada"?"Nota autorizada":r.status==="erro"?"A prefeitura recusou a nota. Veja o motivo.":"Nota em processamento");
  await reload(["notas","pag"]);
}

/* ================= Reuniões (só a dona) ================= */
const REU_ST={rascunho:["p-mute","Rascunho"],transcrevendo:["p-confirmada","Transcrevendo…"],transcrita:["p-warn","Transcrita · sem ata"],gerando_ata:["p-confirmada","Gerando ata…"],concluida:["p-ok","Ata pronta"],erro:["p-bad","Erro"]};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
function md(t){ // Markdown simples e seguro: títulos, negrito, listas e tabelas
  const lines=esc(t).split("\n");let h="",list=null,table=null;
  const flush=()=>{if(list){h+=`</${list}>`;list=null}if(table){h+="</tbody></table></div>";table=null}};
  for(let ln of lines){
    ln=ln.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
    if(/^\|.*\|\s*$/.test(ln)){const cells=ln.replace(/^\||\|\s*$/g,"").split("|").map(c=>c.trim());if(cells.every(c=>/^:?-+:?$/.test(c)))continue;if(!table){flush();table=true;h+=`<div class="tablewrap"><table><thead><tr>${cells.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>`}else h+=`<tr>${cells.map(c=>`<td style="white-space:normal">${c}</td>`).join("")}</tr>`;continue}
    if(table){flush()}
    let m;
    if((m=ln.match(/^(#{1,3})\s+(.*)/))){flush();h+=m[1].length===1?`<h2>${m[2]}</h2>`:`<h3 style="margin:14px 0 4px;font-family:var(--display);font-size:15px">${m[2]}</h3>`}
    else if((m=ln.match(/^\s*[-*]\s+(.*)/))){if(list!=="ul"){flush();list="ul";h+='<ul style="margin:4px 0;padding-left:20px">'}h+=`<li>${m[1]}</li>`}
    else if((m=ln.match(/^\s*\d+[.)]\s+(.*)/))){if(list!=="ol"){flush();list="ol";h+='<ol style="margin:4px 0;padding-left:20px">'}h+=`<li>${m[1]}</li>`}
    else if(!ln.trim()){flush()}
    else{flush();h+=`<p style="margin:4px 0">${ln}</p>`}
  }
  flush();return h;
}
function vReunioes(){
  let h=`<div><div class="eyebrow">Só você vê esta aba</div><h2>Reuniões e atas</h2></div>
  <p class="note">Grave a reunião ao vivo ou envie uma gravação. O Rythmos transcreve, gera a ata com pauta, decisões e encaminhamentos, e você revisa antes de guardar. Pacientes aparecem só pelas iniciais, e o áudio é apagado depois da transcrição.</p>`;
  if(!S.reunioes.length)return h+'<div class="empty"><strong>Nenhuma reunião ainda</strong><span>Toque em Nova reunião. Na reunião de equipe, deixe o celular sobre a mesa gravando.</span></div>';
  h+='<div class="list">';
  for(const r of S.reunioes){const[cls,lbl]=REU_ST[r.status]||["p-mute",r.status];
    h+=`<div class="prow" data-act="abrirReu" data-id="${r.id}" tabindex="0"><div style="min-width:0"><div class="name">${esc(r.titulo)}</div><div class="sub">${esc(fmtDia(r.data,{weekday:"short",day:"numeric",month:"long",year:"numeric"}))}${r.participantes?" · "+esc(r.participantes):""}${r.erro?`<div class="err" style="margin-top:2px">${esc(r.erro)}</div>`:""}</div></div><span class="pill ${cls}">${lbl}</span></div>`}
  return h+"</div>";
}
async function reuCall(body){const{data,error}=await sb.functions.invoke("reunioes",{body});if(error){let m=error.message;try{const j=await error.context.json();if(j&&j.erro)m=j.erro}catch{}throw new Error(m)}if(data&&data.erro)throw new Error(data.erro);return data}
function sheetReuniao(r){
  const novo=!r;r=r||{titulo:"Reunião de equipe",data:hoje(),participantes:""};
  openSheet(`<form id="fReu"><header><h2>${novo?"Nova reunião":"Editar reunião"}</h2><button type="button" class="iconbtn" data-act="${novo?"close":"abrirReu"}" data-id="${r.id||""}">${novo?"Fechar":"Voltar"}</button></header>
  <div class="fields">
    <div class="f full"><label for="r_tit">Título</label><input id="r_tit" name="titulo" required value="${esc(r.titulo)}"></div>
    <div class="f"><label for="r_data">Data</label><input id="r_data" name="data" type="date" required value="${esc(r.data)}"></div>
    <div class="f"><label for="r_part">Participantes</label><input id="r_part" name="participantes" placeholder="Nomes separados por vírgula" value="${esc(r.participantes||"")}"></div>
  </div>
  <div class="foot"><div class="r"><button class="btn primary" type="submit">${novo?"Criar e começar":"Salvar"}</button></div></div></form>`);
  $("fReu").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    try{
      let id=r.id;
      if(novo){id=uuid();await run(sb.from("reunioes").insert({id,titulo:d.titulo.trim(),data:d.data,participantes:d.participantes.trim()||null}))}
      else await run(sb.from("reunioes").update({titulo:d.titulo.trim(),data:d.data,participantes:d.participantes.trim()||null}).eq("id",r.id));
      await reload(["reunioes"]);sheetReuDetalhe(id);
    }catch(err){fail(err)}};
}
async function sheetReuDetalhe(id){
  const r0=S.reunioes.find(x=>x.id===id);if(!r0)return;
  openSheet(`<header><h2>${esc(r0.titulo)}</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header><div class="empty"><span>Carregando…</span></div>`);
  let r;try{r=await run(sb.from("reunioes").select("*").eq("id",id).single())}catch(e){fail(e);return}
  const[cls,lbl]=REU_ST[r.status]||["p-mute",r.status];
  const ocupado=r.status==="transcrevendo"||r.status==="gerando_ata";
  const temTx=!!(r.transcricao&&r.transcricao.trim()),temAta=!!(r.ata&&r.ata.trim());
  openSheet(`<header><div style="min-width:0"><div class="eyebrow">${esc(fmtDia(r.data,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}${r.participantes?" · "+esc(r.participantes):""}</div><h2>${esc(r.titulo)} <span class="pill ${cls}">${lbl}</span></h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  ${r.erro?`<div class="banner">${esc(r.erro)}</div>`:""}
  <div class="toolbar"><button type="button" class="btn" data-act="editReu" data-id="${r.id}">Título, data e participantes</button><button type="button" class="btn danger" data-act="delReu" data-id="${r.id}">Excluir reunião</button></div>
  ${temAta?`<div><div class="toolbar" style="justify-content:space-between;margin-bottom:6px"><div class="eyebrow">Ata</div><div class="toolbar"><button type="button" class="btn" data-act="copyAta" data-id="${r.id}">Copiar</button><button type="button" class="btn" data-act="baixarAta" data-id="${r.id}">Baixar (.md)</button><button type="button" class="btn" data-act="editAta" data-id="${r.id}">Editar</button><button type="button" class="btn" data-act="gerarAta" data-id="${r.id}" ${ocupado?"disabled":""}>Gerar de novo</button></div></div>
    <div class="prev" id="ataView" style="padding:14px 16px">${md(r.ata)}</div>
    <form id="fAta" hidden><div class="f"><textarea id="ataTxt" name="ata" style="min-height:320px;font-family:ui-monospace,Menlo,monospace;font-size:13px">${esc(r.ata)}</textarea></div><div class="foot"><div class="r"><button type="button" class="btn" data-act="abrirReu" data-id="${r.id}">Cancelar</button><button class="btn primary" type="submit">Salvar ata</button></div></div></form></div>`:""}
  <div><div class="toolbar" style="justify-content:space-between;margin-bottom:6px"><div class="eyebrow">Transcrição</div>${temTx?`<div class="toolbar"><button type="button" class="btn ${temAta?"":"primary"}" data-act="gerarAta" data-id="${r.id}" ${ocupado?"disabled":""}>${temAta?"Gerar ata de novo":"Gerar ata"}</button></div>`:""}</div>
    ${temTx?`<form id="fTx"><div class="f"><textarea id="txTxt" name="transcricao" style="min-height:160px;font-size:14px">${esc(r.transcricao)}</textarea></div><div class="toolbar"><button class="btn" type="submit">Salvar correções</button><span class="note">Corrija nomes e termos antes de gerar a ata.</span></div></form>`
    :`<div class="empty" style="padding:18px"><strong>Ainda sem transcrição</strong><span>Escolha como registrar a reunião.</span></div>`}
  </div>
  ${ocupado?'<p class="note">Isso leva de alguns segundos a dois minutos. Pode fechar e voltar depois.</p><div class="toolbar"><button type="button" class="btn" data-act="abrirReu" data-id="'+r.id+'">Atualizar</button></div>':`
  <div class="fields">
    <div class="f"><div class="eyebrow" style="margin-bottom:6px">Gravar agora</div>
      ${SR?`<div id="recBox"><button type="button" class="btn primary big" data-act="gravar" data-id="${r.id}" style="width:100%">${temTx?"Gravar mais um trecho":"Começar a gravar"}</button><p class="note" style="margin-top:6px">Usa o microfone deste aparelho e transcreve na hora. Deixe a tela aberta. Funciona melhor em sala silenciosa.</p></div>`
      :`<p class="note">Este navegador não transcreve ao vivo. No celular, use o Chrome ou o Safari; ou envie uma gravação.</p>`}
    </div>
    <div class="f"><div class="eyebrow" style="margin-bottom:6px">Enviar gravação</div>
      <input type="file" id="r_file" accept="audio/*,.m4a,.mp3,.mp4,.wav,.ogg,.webm" style="font-size:13px">
      <button type="button" class="btn big" data-act="enviarAudio" data-id="${r.id}" style="width:100%;margin-top:6px">${temTx?"Transcrever outra gravação":"Enviar e transcrever"}</button>
      <p class="note" style="margin-top:6px">Até 25 MB (cerca de 50 minutos no gravador do celular). O áudio é apagado depois da transcrição.</p>
    </div>
  </div>`}`);
  const fa=$("fAta");if(fa)fa.onsubmit=async e=>{e.preventDefault();try{await run(sb.from("reunioes").update({ata:$("ataTxt").value}).eq("id",r.id));toast("Ata salva");sheetReuDetalhe(r.id)}catch(err){fail(err)}};
  const ft=$("fTx");if(ft)ft.onsubmit=async e=>{e.preventDefault();try{await run(sb.from("reunioes").update({transcricao:$("txTxt").value}).eq("id",r.id));toast("Transcrição salva")}catch(err){fail(err)}};
}
function gravarAoVivo(id){
  if(!SR)return toast("Este navegador não transcreve ao vivo.");
  const box=$("recBox");if(!box)return;
  let texto="",parcial="",ativo=true,rec;
  const r=S.reunioes.find(x=>x.id===id)||{};
  box.innerHTML=`<div class="phase warn"><span>● Gravando… fale normalmente.</span><button type="button" class="btn primary" id="recStop">Parar e salvar</button></div><div class="msgbox" id="recTxt" style="margin-top:8px;min-height:60px"></div>`;
  const start=()=>{rec=new SR();rec.lang="pt-BR";rec.continuous=true;rec.interimResults=true;
    rec.onresult=ev=>{parcial="";for(let i=ev.resultIndex;i<ev.results.length;i++){const t=ev.results[i][0].transcript;if(ev.results[i].isFinal)texto+=(texto&&!/\s$/.test(texto)?" ":"")+t.trim();else parcial+=t}const el=$("recTxt");if(el){el.textContent=texto+(parcial?" "+parcial:"");el.scrollTop=el.scrollHeight}};
    rec.onerror=ev=>{if(ev.error==="not-allowed"){ativo=false;toast("Permita o uso do microfone para gravar.");box.innerHTML='<p class="err">Microfone não autorizado. Libere nas configurações do navegador e tente de novo.</p>'}};
    rec.onend=()=>{if(ativo)try{rec.start()}catch{}};
    try{rec.start()}catch(e){fail(e)}};
  start();
  S.rec={stop:()=>{ativo=false;try{rec.stop()}catch{}}};
  $("recStop").onclick=async()=>{ativo=false;try{rec.stop()}catch{}S.rec=null;
    const novo=(texto+(parcial?" "+parcial:"")).trim();
    if(!novo)return toast("Nada foi reconhecido. Tente de novo mais perto do microfone.");
    try{const antes=(await run(sb.from("reunioes").select("transcricao").eq("id",id).single())).transcricao||"";
      await run(sb.from("reunioes").update({transcricao:(antes?antes+"\n\n":"")+novo,origem:"ao_vivo",status:"transcrita",erro:null}).eq("id",id));await reload(["reunioes"]);toast("Transcrição salva");sheetReuDetalhe(id)}catch(err){fail(err)}};
}
async function enviarAudio(id,btn){
  const inp=$("r_file");const f=inp&&inp.files[0];
  if(!f)return toast("Escolha o arquivo da gravação primeiro.");
  if(f.size>25*1024*1024)return toast("Arquivo maior que 25 MB. Grave em qualidade menor ou divida em duas partes.");
  btn.disabled=true;btn.textContent="Enviando…";
  const ext=(f.name.split(".").pop()||"m4a").toLowerCase().replace(/[^a-z0-9]/g,"")||"m4a";
  const path=`${S.me.clinica_id}/${id}-${Date.now()}.${ext}`;
  try{
    const{error}=await sb.storage.from("reunioes").upload(path,f,{upsert:true,contentType:f.type||"audio/mp4"});if(error)throw error;
    await run(sb.from("reunioes").update({arquivo:path,origem:"arquivo",status:"transcrevendo",erro:null}).eq("id",id));
    await reload(["reunioes"]);sheetReuDetalhe(id);toast("Transcrevendo… isso pode levar até dois minutos");
    const antes=(await run(sb.from("reunioes").select("transcricao").eq("id",id).single())).transcricao||"";
    const r=await reuCall({acao:"transcrever",reuniao_id:id});
    if(antes&&r.transcricao)await run(sb.from("reunioes").update({transcricao:antes+"\n\n"+r.transcricao}).eq("id",id));
    await reload(["reunioes"]);toast("Transcrição pronta");sheetReuDetalhe(id);
  }catch(err){fail(err);await reload(["reunioes"]);sheetReuDetalhe(id)}
}

/* ================= logo e importação (dona) ================= */
async function trocarLogo(file){
  if(!file)return;
  if(!/^image\//.test(file.type))return toast("Escolha um arquivo de imagem (PNG ou JPG).");
  try{
    const img=await new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=err;i.src=URL.createObjectURL(file)});
    const max=320,k=Math.min(1,max/Math.max(img.width,img.height));
    const cv=document.createElement("canvas");cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    let data=cv.toDataURL("image/png");
    if(data.length>180000)data=cv.toDataURL("image/jpeg",0.85);
    if(data.length>250000)return toast("Imagem muito detalhada. Use uma versão menor do logo.");
    await run(sb.from("clinicas").update({logo:data}).eq("id",S.clinica.id));
    await reload(["clinica"]);toast("Logo atualizado");sheetClinica("mensagens");
  }catch(e){fail(e)}
}
const IMP_COLS={nome:["nome","paciente","nome do paciente","criança","crianca"],responsavel:["responsavel","responsável","mae","mãe","pai","tutor","tutora","responsável financeiro"],telefone:["telefone","whatsapp","celular","fone","contato"],nascimento:["nascimento","data de nascimento","dn","nasc"],convenio:["convenio","convênio","plano","plano de saude","plano de saúde"],terapia:["terapia","especialidade","area","área","servico","serviço"],profissional:["profissional","terapeuta","atendente"],situacao:["situacao","situação","status"],valor_sessao:["valor_sessao","valor","valor da sessao","valor da sessão","preco","preço"],cpf_pagador:["cpf_pagador","cpf","cpf do pagador","cpf responsavel","cpf do responsável"],observacoes:["observacoes","observações","obs","notas"]};
function parseCsv(txt){
  txt=txt.replace(/^\ufeff/,"");
  const sep=(txt.split("\n")[0].match(/;/g)||[]).length>=(txt.split("\n")[0].match(/,/g)||[]).length?";":",";
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"')q=true;
    else if(c===sep){row.push(cell);cell=""}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&txt[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell=""}
    else cell+=c}
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows;
}
function normStr(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function mapaColunas(headers){const m={};headers.forEach((h,i)=>{const n=normStr(h);for(const k in IMP_COLS)if(IMP_COLS[k].some(x=>normStr(x)===n)&&m[k]==null)m[k]=i});return m}
function dataBr(v){
  if(v==null||v==="")return null;
  if(v instanceof Date&&!isNaN(v))return iso(v);
  const s=String(v).trim();let m;
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return `${m[1]}-${m[2]}-${m[3]}`;
  if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/))){let y=m[3].length===2?"20"+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}
  if(/^\d+(\.\d+)?$/.test(s)){const d=new Date(Date.UTC(1899,11,30)+Number(s)*864e5);return iso(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()))}
  return null;
}
function profPorNome(n){const q=normStr(n);if(!q)return null;const l=atendentes();return l.find(m=>normStr(m.nome)===q)||l.find(m=>normStr(chamar(m.nome))===normStr(chamar(n)))||l.find(m=>normStr(m.nome).includes(q)||q.includes(normStr(chamar(m.nome))))||null}
async function lerPlanilha(file){
  const box=$("impBox");if(!file||!box)return;
  box.innerHTML='<p class="note">Lendo a planilha…</p>';
  try{
    let rows;
    if(/\.csv$/i.test(file.name)||/csv|text\/plain/.test(file.type)){rows=parseCsv(await file.text())}
    else{
      if(!window.XLSX)throw new Error("O leitor de Excel ainda não carregou. Tente de novo em instantes, ou salve a planilha como CSV.");
      const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:"",raw:true});
    }
    const hi=rows.findIndex(r=>r.some(c=>String(c).trim()));if(hi<0)throw new Error("Planilha vazia.");
    const headers=rows[hi].map(String),map=mapaColunas(headers);
    if(map.nome==null)throw new Error("Não achei a coluna \"nome\". Use o modelo ou renomeie o cabeçalho.");
    const get=(r,k)=>map[k]==null?"":String(r[map[k]]??"").trim();
    const itens=[];const avisos=[];
    for(const r of rows.slice(hi+1)){
      const nome=get(r,"nome");if(!nome)continue;
      const profNome=get(r,"profissional"),prof=profNome?profPorNome(profNome):null;
      const sitRaw=normStr(get(r,"situacao")),sit=/fila|espera/.test(sitRaw)?"fila":/paus/.test(sitRaw)?"pausado":/alta|encerr/.test(sitRaw)?"alta":"ativo";
      const convRaw=get(r,"convenio"),conv=/unimed/i.test(convRaw)?"Unimed":!convRaw||/partic|^-?$|nao|não|nenhum/i.test(convRaw)?"Particular":"Outro";
      const valor=get(r,"valor_sessao").replace(/[R$\s.]/g,"").replace(",",".");
      const cpf=get(r,"cpf_pagador").replace(/\D/g,"");
      if(profNome&&!prof)avisos.push(`${nome}: profissional "${profNome}" não encontrada na equipe; ficará sem profissional.`);
      if(cpf&&!cpfValido(cpf))avisos.push(`${nome}: CPF do pagador inválido; ficará em branco.`);
      itens.push({nome,responsavel:get(r,"responsavel")||null,telefone:get(r,"telefone")||null,nascimento:dataBr(r[map.nascimento]),convenio:conv,observacoes:get(r,"observacoes")||null,cpf_pagador:cpf&&cpfValido(cpf)?cpf:null,
        terapia:get(r,"terapia")||(prof&&prof.especialidade)||"Terapia",profissional_id:prof?prof.user_id:null,profNome:prof?prof.nome:profNome,situacao:sit,valor_sessao:valor&&!isNaN(Number(valor))?Number(valor):null});
    }
    if(!itens.length)throw new Error("Nenhuma linha com nome preenchido.");
    // agrupa por paciente (nome + responsável), detecta já existentes
    const grupos={};for(const it of itens){const k=normStr(it.nome)+"|"+normStr(it.responsavel);(grupos[k]=grupos[k]||{pac:it,vins:[]}).vins.push(it)}
    const lista=Object.values(grupos);
    const existe=g=>S.pac.find(p=>normStr(p.nome)===normStr(g.pac.nome)&&(!g.pac.responsavel||!p.responsavel||normStr(p.responsavel)===normStr(g.pac.responsavel)));
    lista.forEach(g=>g.ex=existe(g));
    const novos=lista.filter(g=>!g.ex),dup=lista.filter(g=>g.ex);
    S.imp={lista,novos};
    box.innerHTML=`<div class="stats three"><div class="stat"><b>${novos.length}</b><span>pacientes novos</span></div><div class="stat"><b>${itens.length}</b><span>terapias (linhas)</span></div><div class="stat ${dup.length?"hl":""}"><b>${dup.length}</b><span>já cadastrados (vão ganhar só a terapia)</span></div></div>
      ${avisos.length?`<div class="banner">${avisos.slice(0,6).map(esc).join("<br>")}${avisos.length>6?`<br>… e mais ${avisos.length-6}`:""}</div>`:""}
      <div class="tablewrap impPrev"><table><thead><tr><th>Paciente</th><th>Responsável</th><th>WhatsApp</th><th>Convênio</th><th>Terapia</th><th>Profissional</th><th>Situação</th></tr></thead><tbody>${itens.slice(0,200).map(it=>`<tr><td>${esc(it.nome)}</td><td>${esc(it.responsavel||"")}</td><td>${esc(it.telefone||"")}</td><td>${it.convenio}</td><td>${esc(it.terapia)}</td><td>${esc(it.profNome||"—")}</td><td>${SITUACAO[it.situacao]}</td></tr>`).join("")}</tbody></table></div>
      <div class="foot"><div class="r"><button type="button" class="btn primary" data-act="importar">Importar ${itens.length} ${itens.length===1?"linha":"linhas"}</button></div></div>`;
  }catch(e){box.innerHTML=`<p class="err">${esc(errMsg(e))}</p>`}
}
async function importar(btn){
  const I=S.imp;if(!I)return;btn.disabled=true;btn.textContent="Importando…";
  let nPac=0,nVin=0;
  try{
    for(const g of I.lista){
      let pid=g.ex?g.ex.id:null;
      if(!pid){pid=uuid();const p=g.pac;await run(sb.from("pacientes").insert({id:pid,nome:p.nome,responsavel:p.responsavel,telefone:p.telefone,nascimento:p.nascimento,convenio:p.convenio,observacoes:p.observacoes,cpf_pagador:p.cpf_pagador}));nPac++}
      const vinsEx=S.vin.filter(v=>v.paciente_id===pid);
      const rows=g.vins.filter(v=>!vinsEx.some(x=>normStr(x.terapia)===normStr(v.terapia)&&(x.profissional_id||null)===(v.profissional_id||null)))
        .map(v=>({paciente_id:pid,profissional_id:v.profissional_id,terapia:v.terapia,situacao:v.situacao,valor_sessao:v.valor_sessao,entrada_fila:v.situacao==="fila"?hoje():null}));
      if(rows.length){await run(sb.from("vinculos").insert(rows));nVin+=rows.length}
    }
    S.imp=null;closeSheet();toast(`${nPac} ${nPac===1?"paciente":"pacientes"} e ${nVin} ${nVin===1?"terapia":"terapias"} importados`);
    await reload(["pac","vin"]);
  }catch(e){fail(e);btn.disabled=false;btn.textContent="Tentar de novo";await reload(["pac","vin"])}
}
function modeloCsv(){
  const linhas=[["nome","responsavel","telefone","nascimento","convenio","terapia","profissional","situacao","valor_sessao","cpf_pagador","observacoes"],
    ["Theo Albuquerque","Camila Albuquerque","82999990000","12/03/2019","Unimed","Fonoaudiologia","Dra. Lívia","ativo","","",""],
    ["Theo Albuquerque","Camila Albuquerque","82999990000","12/03/2019","Unimed","Terapia ocupacional","Rafael","ativo","","",""],
    ["Alice Menezes","Patrícia Menezes","82988880000","05/07/2020","Particular","Fonoaudiologia","Dra. Lívia","ativo","180","000.000.001-91",""],
    ["Davi Lins","Renata Lins","82977770000","","Particular","Psicologia","","fila","","","Encaminhado pela escola"]];
  const csv="\ufeff"+linhas.map(r=>r.map(v=>/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="modelo-pacientes.csv";document.body.appendChild(a);a.click();a.remove();
}

/* ================= folhas (formulários) ================= */
function openSheet(html){$("scrim").hidden=false;$("sheet").innerHTML=html;$("sheet").scrollTop=0;const f=$("sheet").querySelector("input:not([type=hidden]),select,textarea");if(f&&matchMedia("(min-width:640px)").matches)f.focus()}
function closeSheet(){if(S.rec){S.rec.stop();S.rec=null}$("scrim").hidden=true;$("sheet").innerHTML=""}
let pendingBtn=null;
function confirmInline(btn,label,fn){
  if(pendingBtn===btn){pendingBtn=null;fn();return}
  if(!btn.dataset.orig)btn.dataset.orig=btn.textContent;
  pendingBtn=btn;btn.textContent=label;setTimeout(()=>{if(pendingBtn===btn){pendingBtn=null;btn.textContent=btn.dataset.orig}},4000);
}
function datalists(){return`<datalist id="dlTer">${[...new Set(TERAPIAS.concat(S.vin.map(v=>v.terapia)))].map(t=>`<option value="${esc(t)}">`).join("")}</datalist>`}
function profSelect(id,name,sel,obrig){
  if(!isEquipe())return`<input type="hidden" name="${name}" value="${meuId()}"><input id="${id}" value="${esc(S.me.nome)}" disabled>`;
  return`<select id="${id}" name="${name}" ${obrig?"required":""}><option value="">${obrig?"Escolha…":"Sem profissional definida"}</option>${atendentes().map(m=>`<option value="${m.user_id}" ${sel===m.user_id?"selected":""}>${esc(m.nome)}</option>`).join("")}</select>`;
}

/* --- paciente --- */
async function sheetPaciente(p,opt){
  opt=opt||{};const novo=!p;p=p||{convenio:"Particular"};
  const vs=novo?[]:S.vin.filter(v=>v.paciente_id===p.id);
  const hist=novo?[]:S.ses.filter(s=>s.paciente_id===p.id&&s.data<=addDays(hoje(),60)).sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora)).slice(0,30);
  const f=novo?null:freqOf(p.id);
  const podeEditar=novo||isEquipe()||vs.some(v=>v.profissional_id===meuId());
  openSheet(`<form id="fPac"><header><h2>${novo?(opt.fila?"Adicionar à fila":"Novo paciente"):esc(p.nome)}</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  ${f&&f.pct!=null?`<div class="toolbar">${freqPill(f)}<span class="note">${f.pres} presenças · ${f.falt} faltas (90 dias)</span></div>`:""}
  <div class="fields">
    <div class="f full"><label for="p_nome">Nome do paciente</label><input id="p_nome" name="nome" required value="${esc(p.nome)}"></div>
    <div class="f"><label for="p_resp">Responsável</label><input id="p_resp" name="responsavel" value="${esc(p.responsavel)}"></div>
    <div class="f"><label for="p_tel">WhatsApp do responsável</label><input id="p_tel" name="telefone" inputmode="tel" placeholder="(82) 99999-0000" value="${esc(p.telefone)}"></div>
    <div class="f"><label for="p_nasc">Nascimento</label><input id="p_nasc" name="nascimento" type="date" value="${esc(p.nascimento||"")}"></div>
    <div class="f"><label for="p_conv">Convênio</label><select id="p_conv" name="convenio">${["Particular","Unimed","Outro"].map(o=>`<option ${p.convenio===o?"selected":""}>${o}</option>`).join("")}</select></div>
    <div class="f full"><div class="eyebrow">Quem paga (vai no recibo e na nota fiscal)</div></div>
    <div class="f"><label for="p_pag">Nome do pagador</label><input id="p_pag" name="nome_pagador" placeholder="Se for diferente do responsável" value="${esc(p.nome_pagador||"")}"></div>
    <div class="f"><label for="p_cpf">CPF do pagador</label><input id="p_cpf" name="cpf_pagador" inputmode="numeric" placeholder="000.000.000-00" value="${esc(cpfFmt(p.cpf_pagador))}"></div>
    <div class="f full"><label for="p_email">E-mail do pagador (recebe a nota)</label><input id="p_email" name="email_pagador" type="email" value="${esc(p.email_pagador||"")}"></div>
    <div class="f full"><label for="p_obs">Observações</label><textarea id="p_obs" name="observacoes">${esc(p.observacoes)}</textarea></div>
    ${novo?`<div class="f full"><div class="eyebrow">Primeira terapia</div></div>
    <div class="f"><label for="v_ter">Terapia</label><input id="v_ter" name="v_terapia" list="dlTer" required value="${esc(isProf()?(membro(meuId())||{}).especialidade||"":"")}"></div>
    <div class="f"><label for="v_prof">Profissional</label>${profSelect("v_prof","v_prof","",false)}</div>
    <div class="f"><label for="v_sit">Situação</label><select id="v_sit" name="v_situacao"><option value="ativo" ${opt.fila?"":"selected"}>Em atendimento</option><option value="fila" ${opt.fila?"selected":""}>Fila de espera</option></select></div>
    <div class="f"><label for="v_valor">Valor da sessão (R$)</label><input id="v_valor" name="v_valor" type="number" min="0" step="0.01" inputmode="decimal"></div>
    <div class="f"><label for="v_ini">Atendimento inicial pelo convênio</label><input id="v_ini" name="v_inicio" type="date"></div>
    <div class="f"><label for="v_pri">Prioridade na fila</label><select id="v_pri" name="v_prioridade"><option value="normal">Normal</option><option value="alta">Alta</option></select></div>`:""}
  </div>
  ${!novo?`<div><div class="toolbar" style="justify-content:space-between;margin-bottom:6px"><div class="eyebrow">Terapias</div><button type="button" class="btn" data-act="novoVin" data-id="${p.id}">+ Adicionar terapia</button></div>
    <div class="hist">${vs.map(v=>`<div data-act="editVin" data-id="${v.id}" role="button" tabindex="0"><span><b>${esc(v.terapia)}</b> · ${esc(v.profissional_id?nomeProf(v.profissional_id):"sem profissional")}${v.valor_sessao?" · "+money(v.valor_sessao):""}</span><span class="pill ${v.situacao==="ativo"?"p-ok":v.situacao==="fila"?"p-warn":"p-mute"}">${SITUACAO[v.situacao]}</span></div>`).join("")||'<div><span class="note">Nenhuma terapia cadastrada</span></div>'}</div></div>`:""}
  ${hist.length?`<div><div class="eyebrow" style="margin-bottom:6px">Sessões</div><div class="hist">${hist.map(s=>`<div ${S.evo[s.id]&&(podeEvolucao(s)||isProf())?`data-act="evo" data-id="${s.id}" role="button" tabindex="0"`:""}><span>${esc(fmtDia(s.data))} · ${hhmm(s.hora)} · ${esc(s.terapia||"")}${isEquipe()?" · "+esc(chamar(nomeProf(s.profissional_id))):""}</span><span style="display:flex;gap:6px">${S.evo[s.id]?'<span class="pill p-confirmada">evolução</span>':""}<span class="pill p-${s.status}">${STATUS[s.status]}</span></span></div>`).join("")}</div></div>`:""}
  ${!novo?'<div id="evoLista"></div>':""}
  <div class="foot">${!novo&&isDona()?`<button type="button" class="btn danger" data-act="delPac" data-id="${p.id}">Excluir paciente</button>`:""}<div class="r">${!novo&&vs.some(v=>v.situacao==="ativo"&&(isEquipe()||v.profissional_id===meuId()))?`<button type="button" class="btn" data-act="novaSesPac" data-id="${p.id}">Agendar sessão</button>`:""}${podeEditar?'<button class="btn primary" type="submit">Salvar</button>':""}</div></div>
  ${datalists()}</form>`);
  $("fPac").onsubmit=async e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));for(const k in d)d[k]=String(d[k]).trim();
    const cpfD=d.cpf_pagador.replace(/\D/g,"");
    if(cpfD&&!cpfValido(cpfD))return toast("CPF do pagador inválido");
    const dados={nome:d.nome,responsavel:d.responsavel||null,telefone:d.telefone||null,nascimento:d.nascimento||null,convenio:d.convenio,observacoes:d.observacoes||null,nome_pagador:d.nome_pagador||null,cpf_pagador:cpfD||null,email_pagador:d.email_pagador||null};
    const btn=e.target.querySelector("[type=submit]");btn.disabled=true;
    try{
      if(novo){
        const id=uuid();
        await run(sb.from("pacientes").insert({id,...dados}));
        const prof=d.v_prof||null;
        await run(sb.from("vinculos").insert({paciente_id:id,profissional_id:prof,terapia:d.v_terapia,situacao:d.v_situacao,prioridade:d.v_prioridade||"normal",valor_sessao:d.v_valor?Number(d.v_valor):null,inicio_convenio:d.v_inicio||null}));
        toast(d.v_situacao==="fila"?"Adicionado à fila":"Paciente cadastrado");
      }else{await run(sb.from("pacientes").update(dados).eq("id",p.id));toast("Alterações salvas")}
      closeSheet();reload(["pac","vin"]);
    }catch(err){btn.disabled=false;fail(err)}
  };
  if(!novo){
    try{
      const ev=await run(sb.from("evolucoes").select("*").eq("paciente_id",p.id).order("data",{ascending:false}).limit(20));
      const box=$("evoLista");
      if(box&&ev.length)box.innerHTML=`<div class="eyebrow" style="margin-bottom:6px">Evoluções recentes</div><div style="display:flex;flex-direction:column;gap:8px">${ev.map(e=>`<details class="prev"><summary>${esc(fmtDia(e.data))} · ${esc(nomeProf(e.profissional_id))}</summary><div class="evotxt">${evoHtml(e)}</div></details>`).join("")}</div>`;
    }catch(e){console.error(e)}
  }
}

/* --- terapia (vínculo) --- */
function sheetVinculo(v,pid,opt){
  opt=opt||{};const novo=!v;
  v=v||{paciente_id:pid,situacao:"ativo",prioridade:"normal",profissional_id:isProf()?meuId():""};
  const p=pacById(v.paciente_id)||{};
  const sit=opt.iniciar?"ativo":v.situacao;
  const podeApagar=!novo&&(isEquipe()||v.profissional_id===meuId());
  openSheet(`<form id="fVin"><header><div style="min-width:0"><div class="eyebrow">${esc(p.nome||"")}</div><h2>${opt.iniciar?"Iniciar atendimento":novo?"Nova terapia":esc(v.terapia)}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <div class="fields">
    <div class="f"><label for="t_ter">Terapia</label><input id="t_ter" name="terapia" list="dlTer" required value="${esc(v.terapia||"")}"></div>
    <div class="f"><label for="t_prof">Profissional</label>${profSelect("t_prof","profissional_id",v.profissional_id||"",!!opt.iniciar)}</div>
    <div class="f"><label for="t_sit">Situação</label><select id="t_sit" name="situacao">${Object.keys(SITUACAO).map(k=>`<option value="${k}" ${sit===k?"selected":""}>${SITUACAO[k]}</option>`).join("")}</select></div>
    <div class="f"><label for="t_valor">Valor da sessão (R$)</label><input id="t_valor" name="valor_sessao" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(v.valor_sessao??"")}"></div>
    <div class="f"><label for="t_ini">Atendimento inicial pelo convênio</label><input id="t_ini" name="inicio_convenio" type="date" value="${esc(v.inicio_convenio||(opt.iniciar&&p.convenio==="Unimed"?hoje():""))}"></div>
    <div class="f"><label for="t_pri">Prioridade na fila</label><select id="t_pri" name="prioridade"><option value="normal">Normal</option><option value="alta" ${v.prioridade==="alta"?"selected":""}>Alta</option></select></div>
    <div class="f"><label for="t_ent">Entrou na fila em</label><input id="t_ent" name="entrada_fila" type="date" value="${esc(v.entrada_fila||"")}"></div>
  </div>
  ${p.convenio==="Unimed"?'<p class="note">Paciente da Unimed: a data do atendimento inicial define a partir de quando o painel da Unimed cobra pedido e guia desta terapia.</p>':""}
  <div class="foot">${podeApagar?`<button type="button" class="btn danger" data-act="delVin" data-id="${v.id}">Remover terapia</button>`:""}<div class="r"><button class="btn primary" type="submit">${opt.iniciar?"Salvar e agendar":"Salvar"}</button></div></div>${datalists()}</form>`);
  $("fVin").onsubmit=async e=>{
    e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    const dados={terapia:String(d.terapia).trim(),profissional_id:d.profissional_id||null,situacao:d.situacao,prioridade:d.prioridade,valor_sessao:d.valor_sessao?Number(d.valor_sessao):null,inicio_convenio:d.inicio_convenio||null,entrada_fila:d.entrada_fila||null};
    try{
      let id=v.id;
      if(novo){id=uuid();await run(sb.from("vinculos").insert({id,paciente_id:v.paciente_id,...dados}))}
      else await run(sb.from("vinculos").update(dados).eq("id",v.id));
      await reload(["vin","pac"]);
      if(opt.iniciar&&dados.situacao==="ativo"){toast("Atendimento iniciado");sheetSessao(null,id)}
      else{closeSheet();toast("Terapia salva")}
    }catch(err){fail(err)}
  };
}

/* --- sessão --- */
function sheetSessao(s,presetVin){
  const novo=!s;
  const f=profFiltro();
  const vins=S.vin.filter(v=>v.situacao==="ativo"&&(isEquipe()?(!f||v.profissional_id===f):v.profissional_id===meuId())&&v.profissional_id);
  if(novo&&!vins.length&&!presetVin){openSheet(`<header><h2>Nova sessão</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header><div class="empty"><strong>Nenhum atendimento ativo</strong><span>Cadastre um paciente com terapia e profissional antes de agendar.</span><button class="btn primary" data-act="novoPac">Cadastrar paciente</button></div>`);return}
  const lbl=v=>{const p=pacById(v.paciente_id)||{};return`${p.nome||"Paciente"} — ${v.terapia}${isEquipe()?" ("+chamar(nomeProf(v.profissional_id))+")":""}`};
  const opts=[...vins];if(presetVin&&!opts.some(v=>v.id===presetVin)){const pv=vinById(presetVin);if(pv)opts.push(pv)}
  opts.sort((a,b)=>lbl(a).localeCompare(lbl(b),"pt-BR"));
  if(novo){
    openSheet(`<form id="fSes"><header><h2>Nova sessão</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
    <div class="fields">
      <div class="f full"><label for="s_vin">Paciente e terapia</label><select id="s_vin" name="vinculo_id" required><option value="">Escolha…</option>${opts.map(v=>`<option value="${v.id}" ${v.id===presetVin?"selected":""}>${esc(lbl(v))}</option>`).join("")}</select></div>
      <div class="f"><label for="s_data">Data</label><input id="s_data" name="data" type="date" required value="${S.dia<hoje()?hoje():S.dia}"></div>
      <div class="f"><label for="s_hora">Horário</label><input id="s_hora" name="hora" type="time" required></div>
      <div class="f full"><label for="s_rep">Repetir toda semana</label><select id="s_rep" name="repetir">${[1,2,4,8,12,16,24].map(n=>`<option value="${n}">${n===1?"Não repetir":"Por "+n+" semanas"}</option>`).join("")}</select></div>
    </div><div class="foot"><div class="r"><button class="btn primary" type="submit">Agendar</button></div></div></form>`);
    $("fSes").onsubmit=async e=>{
      e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const n=Number(d.repetir||1);
      const rows=Array.from({length:n},(_,i)=>({vinculo_id:d.vinculo_id,data:addDays(d.data,7*i),hora:d.hora,status:"agendada"}));
      try{await run(sb.from("sessoes").insert(rows));S.dia=d.data;closeSheet();toast(n>1?`${n} sessões agendadas`:"Sessão agendada");S.tab="agenda";lsSet("rythmos.tab","agenda");reload(["ses"])}catch(err){fail(err)}
    };
    return;
  }
  const p=pacById(s.paciente_id)||{},pode=podeEditarSessao(s),msg=msgConfirmacao(s),link=waLink(p.telefone,msg);
  openSheet(`<form id="fSes"><header><div style="min-width:0"><div class="eyebrow">${esc(s.terapia||"")} · ${esc(nomeProf(s.profissional_id))}</div><h2>${esc(p.nome||"Sessão")}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <div class="fields">
    <div class="f"><label for="s_data">Data</label><input id="s_data" name="data" type="date" required value="${esc(s.data)}" ${pode?"":"disabled"}></div>
    <div class="f"><label for="s_hora">Horário</label><input id="s_hora" name="hora" type="time" required value="${hhmm(s.hora)}" ${pode?"":"disabled"}></div>
  </div>
  <div><div class="eyebrow" style="margin-bottom:6px">Situação</div><div class="statusgrid" role="group">${Object.keys(STATUS).map(k=>`<button type="button" data-act="pickSt" data-v="${k}" aria-pressed="${s.status===k}" ${pode?"":"disabled"}>${STATUS[k]}</button>`).join("")}</div><input type="hidden" name="status" id="s_st" value="${s.status}"></div>
  <div><div class="eyebrow" style="margin-bottom:6px">Mensagem de confirmação</div><div class="msgbox" id="msgtxt">${esc(msg)}</div>
    <div class="toolbar" style="margin-top:8px"><button type="button" class="btn" data-act="copy">Copiar mensagem</button>${link?`<a class="btn wa" href="${link}" target="_blank" rel="noopener">Abrir no WhatsApp</a>`:'<span class="note">Cadastre o WhatsApp do responsável para enviar direto.</span>'}</div></div>
  <div class="foot">${pode?`<button type="button" class="btn danger" data-act="delSes" data-id="${s.id}">Excluir</button>`:""}<div class="r">${podeEvolucao(s)&&s.data<=hoje()?`<button type="button" class="btn" data-act="evo" data-id="${s.id}">${S.evo[s.id]?"Ver evolução":"Escrever evolução"}</button>`:""}${pode?'<button class="btn primary" type="submit">Salvar</button>':""}</div></div></form>`);
  $("fSes").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    try{await run(sb.from("sessoes").update({data:d.data,hora:d.hora,status:d.status}).eq("id",s.id));closeSheet();toast("Sessão atualizada");reload(["ses"])}catch(err){fail(err)}};
}

/* --- evolução --- */
function evoHtml(e){return[["O que foi trabalhado",e.atividades],["Resposta do paciente",e.resposta],["Orientações e próximos passos",e.proximos]].filter(x=>x[1]).map(([k,v])=>`<p><b>${k}:</b> ${esc(v)}</p>`).join("")}
async function sheetEvo(sid){
  const s=S.ses.find(x=>x.id===sid);if(!s)return;
  const p=pacById(s.paciente_id)||{};
  openSheet(`<header><h2>${esc(p.nome||"")}</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header><div class="empty"><span>Carregando…</span></div>`);
  let e={},ant=null;
  try{
    e=(await run(sb.from("evolucoes").select("*").eq("sessao_id",sid).maybeSingle()))||{};
    const r=await run(sb.from("evolucoes").select("*").eq("paciente_id",s.paciente_id).lt("data",s.data).order("data",{ascending:false}).limit(1));
    ant=r[0]||null;
  }catch(err){fail(err)}
  const ro=!podeEvolucao(s);
  openSheet(`<form id="fEvo"><header><div style="min-width:0"><div class="eyebrow">Evolução · ${esc(fmtDia(s.data))} · ${hhmm(s.hora)} · ${esc(s.terapia||"")}</div><h2>${esc(p.nome||"")}</h2></div><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  ${ant?`<details class="prev"><summary>Sessão anterior · ${esc(fmtDia(ant.data))} · ${esc(nomeProf(ant.profissional_id))}</summary><div class="evotxt">${evoHtml(ant)}</div></details>`:""}
  <div class="fields">
    <div class="f full"><label for="e_atv">O que foi trabalhado</label><textarea id="e_atv" name="atividades" ${ro?"readonly":""} placeholder="Objetivos e atividades da sessão">${esc(e.atividades)}</textarea></div>
    <div class="f full"><label for="e_resp">Resposta do paciente</label><textarea id="e_resp" name="resposta" ${ro?"readonly":""} placeholder="Engajamento, avanços, dificuldades, comportamento">${esc(e.resposta)}</textarea></div>
    <div class="f full"><label for="e_prox">Orientações à família e próximos passos</label><textarea id="e_prox" name="proximos" ${ro?"readonly":""}>${esc(e.proximos)}</textarea></div>
  </div>
  ${e.atualizado_em?`<p class="note">Registrado por ${esc(nomeProf(e.profissional_id))} em ${esc(new Date(e.atualizado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}))}</p>`:""}
  <div class="foot">${e.sessao_id&&!ro?`<button type="button" class="btn danger" data-act="delEvo" data-id="${sid}">Excluir</button>`:""}<div class="r">${ro?"":'<button class="btn primary" type="submit">Salvar evolução</button>'}</div></div></form>`);
  $("fEvo").onsubmit=async ev=>{
    ev.preventDefault();const d=Object.fromEntries(new FormData(ev.target));for(const k in d)d[k]=String(d[k]).trim();
    if(!d.atividades&&!d.resposta&&!d.proximos)return toast("Escreva pelo menos um dos campos");
    try{
      await run(sb.from("evolucoes").upsert({sessao_id:sid,atividades:d.atividades||null,resposta:d.resposta||null,proximos:d.proximos||null},{onConflict:"sessao_id"}));
      if(s.status!=="presente")await run(sb.from("sessoes").update({status:"presente"}).eq("id",sid));
      closeSheet();toast("Evolução salva");reload(["evo","ses"]);
    }catch(err){fail(err)}
  };
}

/* --- clínica (dona): equipe, mensagens, exemplos --- */
let clinicaSub="equipe";
function sheetClinica(sub){
  clinicaSub=sub||clinicaSub;
  const st=k=>`aria-pressed="${clinicaSub===k}"`;
  let body="";
  if(clinicaSub==="equipe"){
    const pend=S.membros.filter(m=>!m.ativo),ativos=S.membros.filter(m=>m.ativo).sort(byNome);
    body=`<div class="list"><div class="urow"><div><div class="eyebrow">Código para entrar na clínica</div><div class="code">${esc(S.clinica.codigo_convite||"")}</div><p class="note">Quem vai usar o Rythmos cria a conta, escolhe "Entrar na clínica" e digita este código. Depois você aprova aqui.</p></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button type="button" class="btn" data-act="copyCode">Copiar</button><button type="button" class="btn" data-act="novoCodigo">Trocar código</button></div></div></div>
    ${pend.length?`<div><div class="eyebrow" style="margin-bottom:6px">Pedidos de acesso</div><div class="list">${pend.map(m=>`<div class="urow"><div><div class="name">${esc(m.nome)}</div><div class="sub">Pediu acesso em ${esc(new Date(m.criado_em).toLocaleDateString("pt-BR"))}</div></div><span></span>
      <div class="acts"><button type="button" class="btn primary" data-act="aprovar" data-id="${m.user_id}">Aprovar</button><button type="button" class="btn danger" data-act="recusar" data-id="${m.user_id}">Recusar</button></div></div>`).join("")}</div></div>`:""}
    <div><div class="eyebrow" style="margin-bottom:6px">Equipe (${ativos.length})</div><div class="list">${ativos.map(m=>`<div class="urow" data-act="editMembro" data-id="${m.user_id}" style="cursor:pointer"><div><div class="name">${esc(m.nome)}${m.user_id===meuId()?'<span class="pill p-mute">você</span>':""}</div><div class="sub">${PAPEL[m.papel]}${m.especialidade?" · "+esc(m.especialidade):""}${" · repasse "+Number(m.repasse_pct)+"%"}${m.recebe==="pf"?" · recebe como PF":""}</div></div><span class="note">Editar</span></div>`).join("")}</div></div>`;
  }else if(clinicaSub==="mensagens"){
    const mo=S.clinica.modelos||{};
    body=`<div class="logoPrev">${S.clinica.logo?`<img src="${esc(S.clinica.logo)}" alt="Logo da clínica">`:'<span class="note">Sem logo</span>'}<div style="flex:1;min-width:0"><div class="eyebrow">Logo da clínica</div><p class="note">Aparece no topo do app ao lado do nome. PNG ou JPG; fundo transparente fica melhor.</p></div>
      <div style="display:flex;flex-direction:column;gap:6px"><label class="btn" for="logoFile" style="cursor:pointer">Enviar logo</label><input type="file" id="logoFile" accept="image/*" hidden>${S.clinica.logo?'<button type="button" class="btn danger" data-act="removerLogo">Remover</button>':""}</div></div>
    <form id="fMsg"><div class="fields">
      <div class="f full"><label for="c_nome">Nome da clínica</label><input id="c_nome" name="nome" required value="${esc(S.clinica.nome)}"></div>
      <div class="f full"><label for="c_conf">Confirmação de sessão</label><textarea id="c_conf" name="confirmacao" style="min-height:100px">${esc(mo.confirmacao||DEF.confirmacao)}</textarea></div>
      <div class="f full"><label for="c_fila">Vaga para a fila de espera</label><textarea id="c_fila" name="fila">${esc(mo.fila||DEF.fila)}</textarea></div>
      <div class="f full"><label for="c_uni">Unimed: lembrete da guia nova (perto do dia 1º)</label><textarea id="c_uni" name="unimed" style="min-height:120px">${esc(mo.unimed||DEF.unimed)}</textarea></div>
      <div class="f full"><label for="c_guia">Unimed: cobrança da guia (depois do dia 1º)</label><textarea id="c_guia" name="guia">${esc(mo.guia||DEF.guia)}</textarea></div></div>
      <p class="note">Campos: {responsavel}, {paciente}, {data}, {hora}, {terapeuta}, {terapia}, {clinica}. Na Unimed também {prazo}, {dia1} e {mes}.</p>
      <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar</button></div></div></form>`;
  }else if(clinicaSub==="importar"){
    body=`<p class="note">Traga os pacientes que a clínica já tem. Baixe o modelo, preencha no Excel ou no Google Planilhas (uma linha por paciente e terapia) e envie aqui. Antes de gravar, você confere o que vai entrar.</p>
      <div class="toolbar"><button type="button" class="btn" data-act="modeloCsv">Baixar modelo (.csv)</button><span class="note">Colunas: nome, responsavel, telefone, nascimento, convenio, terapia, profissional, situacao, valor_sessao, cpf_pagador, observacoes</span></div>
      <div class="f"><label for="impFile">Planilha preenchida (.xlsx, .xls ou .csv)</label><input type="file" id="impFile" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="font-size:13px"></div>
      <div id="impBox"></div>`;
  }else if(clinicaSub==="fiscal"){
    const fx=S.clinica.fiscal||{};
    const sel=(n,opts,v)=>`<select id="x_${n}" name="${n}">${opts.map(([k,l])=>`<option value="${k}" ${String(v??"")===k?"selected":""}>${l}</option>`).join("")}</select>`;
    body=`<form id="fFiscal"><p class="note">Dados do prestador que vão na NFS-e. Peça ao contador se tiver dúvida. O certificado digital A1 e o token do emissor ficam fora do app (veja o README).</p>
      <div class="fields">
        <div class="f"><label for="x_cnpj">CNPJ da clínica</label><input id="x_cnpj" name="cnpj" inputmode="numeric" required value="${esc(cnpjFmt(fx.cnpj))}"></div>
        <div class="f"><label for="x_im">Inscrição municipal</label><input id="x_im" name="inscricao_municipal" required value="${esc(fx.inscricao_municipal||"")}"></div>
        <div class="f"><label for="x_mun">Código IBGE do município</label><input id="x_mun" name="codigo_municipio" inputmode="numeric" required value="${esc(fx.codigo_municipio||"2704302")}"><span class="note">Maceió: 2704302</span></div>
        <div class="f"><label for="x_simples">Simples Nacional</label>${sel("optante_simples_nacional",[["true","Sim, optante"],["false","Não"]],fx.optante_simples_nacional===false?"false":"true")}</div>
        <div class="f"><label for="x_item">Item da lista de serviços (LC 116)</label><input id="x_item" name="item_lista_servico" placeholder="Em branco: 04.08 terapias, 04.16 psicologia" value="${esc(fx.item_lista_servico||"")}"></div>
        <div class="f"><label for="x_ctm">Código de tributação do município</label><input id="x_ctm" name="codigo_tributario_municipio" value="${esc(fx.codigo_tributario_municipio||"")}"></div>
        <div class="f"><label for="x_aliq">Alíquota de ISS (%)</label><input id="x_aliq" name="aliquota" type="number" step="0.01" min="0" max="5" value="${esc(fx.aliquota??"")}"></div>
        <div class="f"><label for="x_cnae">CNAE (opcional)</label><input id="x_cnae" name="codigo_cnae" value="${esc(fx.codigo_cnae||"")}"></div>
        <div class="f"><label for="x_reg">Regime especial de tributação</label>${sel("regime_especial_tributacao",[["","Nenhum"],["1","Microempresa municipal"],["2","Estimativa"],["3","Sociedade de profissionais"],["4","Cooperativa"],["5","MEI"],["6","ME/EPP do Simples"]],fx.regime_especial_tributacao)}</div>
        <div class="f"><label for="x_amb">Ambiente</label>${sel("ambiente",[["homologacao","Testes (homologação)"],["producao","Produção (notas valem)"]],fx.ambiente||"homologacao")}</div>
        <div class="f full"><label for="x_disc">Descrição do serviço na nota</label><textarea id="x_disc" name="discriminacao">${esc(fx.discriminacao||"Sessões de {terapia} realizadas em {datas}.")}</textarea><span class="note">Campos: {terapia}, {datas}, {clinica}</span></div>
      </div>
      <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar</button></div></div></form>`;
  }else{
    const temEx=S.pac.some(p=>p.exemplo);
    body=`<div class="empty"><strong>Dados de exemplo</strong><span>Cria 5 pacientes fictícios atendidos por você, com sessões, um pagamento e o ciclo da Unimed, para mostrar o Rythmos funcionando. Eles aparecem marcados como exemplo.</span>
      <div class="toolbar" style="justify-content:center"><button type="button" class="btn primary" data-act="carregarEx">Carregar exemplos</button>${temEx?'<button type="button" class="btn danger" data-act="apagarEx">Apagar exemplos</button>':""}</div></div>`;
  }
  openSheet(`<header><h2>${esc(S.clinica.nome||"Clínica")}</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <div class="subtabs"><button type="button" data-act="clinSub" data-v="equipe" ${st("equipe")}>Equipe</button><button type="button" data-act="clinSub" data-v="mensagens" ${st("mensagens")}>Mensagens</button><button type="button" data-act="clinSub" data-v="fiscal" ${st("fiscal")}>Fiscal</button><button type="button" data-act="clinSub" data-v="importar" ${st("importar")}>Importar</button><button type="button" data-act="clinSub" data-v="exemplos" ${st("exemplos")}>Exemplos</button></div>${body}`);
  const fl=$("logoFile");if(fl)fl.onchange=()=>trocarLogo(fl.files[0]);
  const fi=$("impFile");if(fi)fi.onchange=()=>lerPlanilha(fi.files[0]);
  const ff=$("fFiscal");
  if(ff)ff.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    const fx={cnpj:String(d.cnpj).replace(/\D/g,""),inscricao_municipal:d.inscricao_municipal.trim(),codigo_municipio:d.codigo_municipio.trim(),optante_simples_nacional:d.optante_simples_nacional==="true",item_lista_servico:d.item_lista_servico.trim()||null,codigo_tributario_municipio:d.codigo_tributario_municipio.trim()||null,aliquota:d.aliquota?Number(d.aliquota):null,codigo_cnae:d.codigo_cnae.trim()||null,regime_especial_tributacao:d.regime_especial_tributacao||null,ambiente:d.ambiente,discriminacao:d.discriminacao.trim()||null};
    if(fx.cnpj.length!==14)return toast("CNPJ precisa ter 14 dígitos");
    try{await run(sb.from("clinicas").update({fiscal:fx}).eq("id",S.clinica.id));await reload(["clinica"]);toast("Dados fiscais salvos")}catch(err){fail(err)}};
  const fm=$("fMsg");
  if(fm)fm.onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    try{await run(sb.from("clinicas").update({nome:d.nome,modelos:{confirmacao:d.confirmacao,fila:d.fila,unimed:d.unimed,guia:d.guia}}).eq("id",S.clinica.id));await reload(["clinica"]);toast("Salvo")}catch(err){fail(err)}};
}
function sheetMembro(uid){
  const m=membro(uid);if(!m)return;const eu=uid===meuId();
  openSheet(`<form id="fMem"><header><h2>${esc(m.nome)}</h2><button type="button" class="iconbtn" data-act="clinSub" data-v="equipe">Voltar</button></header>
  <div class="fields">
    <div class="f full"><label for="m_nome">Nome</label><input id="m_nome" name="nome" required value="${esc(m.nome)}"></div>
    <div class="f"><label for="m_papel">Papel</label><select id="m_papel" name="papel" ${eu?"disabled":""}>${Object.keys(PAPEL).map(k=>`<option value="${k}" ${m.papel===k?"selected":""}>${PAPEL[k]}</option>`).join("")}</select></div>
    <div class="f"><label for="m_esp">Especialidade</label><input id="m_esp" name="especialidade" list="dlTer" value="${esc(m.especialidade||"")}"></div>
    <div class="f"><label for="m_rep">Repasse à clínica (%)</label><input id="m_rep" name="repasse_pct" type="number" min="0" max="100" step="0.5" value="${esc(m.repasse_pct)}"></div>
    <div class="f full"><div class="eyebrow">Fiscal</div></div>
    <div class="f"><label for="m_rec">Quem recebe as sessões particulares</label><select id="m_rec" name="recebe"><option value="clinica" ${m.recebe!=="pf"?"selected":""}>A clínica (emite NFS-e)</option><option value="pf" ${m.recebe==="pf"?"selected":""}>A própria profissional (Receita Saúde)</option></select></div>
    <div class="f"><label for="m_cpf">CPF</label><input id="m_cpf" name="cpf" inputmode="numeric" value="${esc(cpfFmt(m.cpf))}"></div>
    <div class="f"><label for="m_reg">Registro no conselho</label><input id="m_reg" name="registro" placeholder="CRFa 4-12345" value="${esc(m.registro||"")}"></div>
  </div>
  <p class="note">A dona vê tudo, inclusive o caixa e as evoluções de todas. Cada profissional vê só os próprios pacientes: as terapias, a agenda, as evoluções, a fila, a Unimed e o caixa dela.</p>
  <div class="foot">${eu?"":`<button type="button" class="btn danger" data-act="remover" data-id="${uid}">Remover da clínica</button>`}<div class="r"><button class="btn primary" type="submit">Salvar</button></div></div>${datalists()}</form>`);
  $("fMem").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
    const cpfD=String(d.cpf||"").replace(/\D/g,"");if(cpfD&&!cpfValido(cpfD))return toast("CPF inválido");
    const up={nome:d.nome,especialidade:d.especialidade||null,repasse_pct:Number(d.repasse_pct||0),recebe:d.recebe,cpf:cpfD||null,registro:d.registro||null};if(!eu)up.papel=d.papel;
    try{await run(sb.from("membros").update(up).eq("user_id",uid));await reload(["membros"]);toast("Equipe atualizada");sheetClinica("equipe")}catch(err){fail(err)}};
}
function sheetConta(){
  openSheet(`<header><h2>Sua conta</h2><button type="button" class="iconbtn" data-act="close">Fechar</button></header>
  <div class="list"><div class="urow"><div><div class="name">${esc(S.me.nome)}</div><div class="sub">${esc(S.user.email)} · ${PAPEL[papel()]} · ${esc(S.clinica.nome||S.me.clinica)}</div></div></div></div>
  <form id="fConta"><div class="fields">
    <div class="f full"><label for="k_nome">Nome</label><input id="k_nome" name="nome" required value="${esc(S.me.nome)}"></div>
    <div class="f"><label for="k_cpf">CPF</label><input id="k_cpf" name="cpf" inputmode="numeric" value="${esc(cpfFmt((membro(meuId())||{}).cpf))}"></div>
    <div class="f"><label for="k_reg">Registro no conselho</label><input id="k_reg" name="registro" placeholder="CRFa 4-12345" value="${esc((membro(meuId())||{}).registro||"")}"></div></div>
  <p class="note">${(membro(meuId())||{}).recebe==="pf"?"Você recebe as sessões particulares como pessoa física: o recibo sai pelo Receita Saúde, em seu nome.":"As sessões particulares são faturadas pela clínica."}</p>
  <div class="foot"><button type="button" class="btn danger" data-act="sair">Sair</button><div class="r"><button type="button" class="btn" data-act="atualizar">Atualizar dados</button><button class="btn primary" type="submit">Salvar</button></div></div></form>`);
  $("fConta").onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const cpfD=String(d.cpf||"").replace(/\D/g,"");if(cpfD&&!cpfValido(cpfD))return toast("CPF inválido");
    try{await run(sb.from("membros").update({nome:d.nome,cpf:cpfD||null,registro:d.registro||null}).eq("user_id",meuId()));S.me.nome=d.nome;await reload(["membros"]);closeSheet();toast("Conta atualizada")}catch(err){fail(err)}};
}

/* ================= ações ================= */
async function acao(a,t){
  const id=t.dataset.id;
  switch(a){
    case"close":return closeSheet();
    case"dia":S.dia=addDays(S.dia,Number(t.dataset.n));return render();
    case"hoje":S.dia=hoje();return render();
    case"mes":S.uniMes=addMonths(S.uniMes,Number(t.dataset.n));return render();
    case"mesAtual":S.uniMes=ymOf(hoje());return render();
    case"cx":S.cxMes=addMonths(S.cxMes,Number(t.dataset.n));return render();
    case"cxAtual":S.cxMes=ymOf(hoje());return render();
    case"fx":S.fxMes=addMonths(S.fxMes,Number(t.dataset.n));return render();
    case"fxAtual":S.fxMes=ymOf(hoje());return render();
    case"fxSub":S.fxSub=t.dataset.v;return render();
    case"exportCsv":return exportCsv(t.dataset.m);
    case"copyRS":{const{L}=dadosRS(t.dataset.k);const p=L[0]&&L[0].p||{},m=L[0]&&L[0].m||{};const txt=[`Pagador: ${p.nome_pagador||p.responsavel||""} · CPF ${cpfFmt(p.cpf_pagador)||"(faltando)"}`,`Paciente: ${p.nome}`,`Profissional: ${m.nome||""} · CPF ${cpfFmt(m.cpf)||"(faltando)"} · ${m.registro||"(registro faltando)"}`,...L.filter(x=>!x.pg.receita_saude_em).map(x=>`${curto(x.s.data)}/${x.s.data.slice(0,4)} · ${x.s.terapia||""} · ${money(x.valor)}${x.pg.forma?" · "+x.pg.forma:""}`)].join("\n");try{await navigator.clipboard.writeText(txt);toast("Dados copiados para lançar no Receita Saúde")}catch{toast("Não foi possível copiar")}return}
    case"rsOk":{const{L}=dadosRS(t.dataset.k);t.disabled=true;try{for(const x of L.filter(x=>!x.pg.receita_saude_em))await run(sb.from("pagamentos").update({receita_saude_em:hoje()}).eq("sessao_id",x.s.id));toast("Marcado como emitido");reload(["pag"])}catch(e){t.disabled=false;fail(e)}return}
    case"rsUndo":{const{L}=dadosRS(t.dataset.k);try{for(const x of L)await run(sb.from("pagamentos").update({receita_saude_em:null}).eq("sessao_id",x.s.id));reload(["pag"])}catch(e){fail(e)}return}
    case"emitirNota":t.disabled=true;try{await emitirNota(t.dataset.k)}catch(e){fail(e);reload(["notas","pag"])}return;
    case"reenviarNota":t.disabled=true;try{const r=await nfseCall({acao:"emitir",nota_id:id});toast(r.status==="autorizada"?"Nota autorizada":r.status==="erro"?"A prefeitura recusou de novo. Veja o motivo.":"Nota em processamento")}catch(e){fail(e)}return reload(["notas","pag"]);
    case"consultarNota":t.disabled=true;try{const r=await nfseCall({acao:"consultar",nota_id:id});toast(NOTA_ST[r.status]?NOTA_ST[r.status][1]:"Atualizado")}catch(e){fail(e)}return reload(["notas","pag"]);
    case"descartarNota":return confirmInline(t,"Descartar esta nota?",async()=>{try{await run(sb.from("notas_fiscais").delete().eq("id",id));toast("Nota descartada; as sessões voltam para a lista");reload(["notas","pag"])}catch(e){fail(e)}});
    case"cancelarNota":return confirmInline(t,"Cancelar na prefeitura?",async()=>{t.disabled=true;try{const r=await nfseCall({acao:"cancelar",nota_id:id,justificativa:"Cancelamento solicitado pela clínica"});toast(r.status==="cancelada"?"Nota cancelada":"Não foi possível cancelar: "+(r.erro||""))}catch(e){fail(e)}reload(["notas","pag"])});
    case"sit":S.filtroSit=t.dataset.v;S.busca="";return render();
    case"editSes":return sheetSessao(S.ses.find(s=>s.id===id));
    case"editPac":return sheetPaciente(pacById(id));
    case"novoPac":return sheetPaciente(null);
    case"novaSesPac":{const v=S.vin.find(x=>x.paciente_id===id&&x.situacao==="ativo"&&(isEquipe()||x.profissional_id===meuId()));return sheetSessao(null,v&&v.id)}
    case"novoVin":return sheetVinculo(null,id);
    case"editVin":return sheetVinculo(vinById(id));
    case"iniciarVin":return sheetVinculo(vinById(id),null,{iniciar:true});
    case"evo":return sheetEvo(id);
    case"pagar":return sheetPagamento(id);
    case"pickSt":document.querySelectorAll("[data-act=pickSt]").forEach(b=>b.setAttribute("aria-pressed",b===t));$("s_st").value=t.dataset.v;return;
    case"st":t.disabled=true;try{await run(sb.from("sessoes").update({status:t.dataset.v}).eq("id",id));const s=S.ses.find(x=>x.id===id);if(s)s.status=t.dataset.v;render();reload(["ses"])}catch(e){t.disabled=false;fail(e)}return;
    case"copy":{const el=$("msgtxt");try{await navigator.clipboard.writeText(el.textContent);toast("Mensagem copiada")}catch{const r=document.createRange();r.selectNodeContents(el);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);toast("Texto selecionado: copie pelo menu")}return}
    case"copyCode":try{await navigator.clipboard.writeText(S.clinica.codigo_convite);toast("Código copiado")}catch{toast("Código: "+S.clinica.codigo_convite)}return;
    case"novoCodigo":return confirmInline(t,"Toque de novo para trocar",async()=>{try{await run(sb.rpc("novo_codigo"));await reload(["clinica"]);sheetClinica("equipe");toast("Código trocado. O antigo não funciona mais.")}catch(e){fail(e)}});
    case"delSes":return confirmInline(t,"Toque de novo para excluir",async()=>{try{await run(sb.from("sessoes").delete().eq("id",id));closeSheet();toast("Sessão excluída");reload(["ses","evo","pag"])}catch(e){fail(e)}});
    case"delPac":return confirmInline(t,"Excluir paciente e todo o histórico?",async()=>{try{await run(sb.from("pacientes").delete().eq("id",id));closeSheet();toast("Paciente excluído");reload(["pac","vin","ses","evo","pag","cic"])}catch(e){fail(e)}});
    case"delVin":return confirmInline(t,"Remove sessões dessa terapia. Confirmar?",async()=>{try{await run(sb.from("vinculos").delete().eq("id",id));closeSheet();toast("Terapia removida");reload(["vin","ses","evo","pag","cic","pac"])}catch(e){fail(e)}});
    case"delEvo":return confirmInline(t,"Toque de novo para excluir",async()=>{try{await run(sb.from("evolucoes").delete().eq("sessao_id",id));closeSheet();toast("Evolução excluída");reload(["evo"])}catch(e){fail(e)}});
    case"disparo":{const M=S.uniMes;return sheetDisparo(cicloDe(M).filter(v=>!(cyc(v.id,M)||{}).msg_em).sort((x,y)=>(!!(cyc(y.id,M)||{}).pedido_em-!!(cyc(x.id,M)||{}).pedido_em)).map(v=>v.id))}
    case"disparoUm":return sheetDisparo([id]);
    case"irUnimed":S.tab="unimed";lsSet("rythmos.tab","unimed");S.uniMes=ymOf(hoje());render();window.scrollTo(0,0);return;
    case"envPular":S.envio.i++;return stepDisparo();
    case"envFeito":{const q=S.envio,vid=q.ids[q.i];q.feitos++;writeCyc(vid,S.uniMes,{msg_em:new Date().toISOString()}).catch(fail);setTimeout(()=>{q.i++;stepDisparo()},350);return}
    case"pedidoOk":try{await writeCyc(id,t.dataset.m,{pedido_em:hoje()});toast("Pedido de prorrogação registrado")}catch(e){fail(e)}return reload(["cic"]);
    case"guiaOk":try{const m=t.dataset.m,v=vinById(id),c=cyc(id,m)||{};await writeCyc(id,m,{guia_em:hoje()});if(v&&v.situacao==="pausado"&&c.pausado_em){await run(sb.from("vinculos").update({situacao:"ativo"}).eq("id",id));toast("Guia registrada e atendimento retomado")}else toast("Guia registrada")}catch(e){fail(e)}return reload(["cic","vin"]);
    case"pausarUni":return confirmInline(t,"Toque de novo para pausar",async()=>{try{await run(sb.from("vinculos").update({situacao:"pausado"}).eq("id",id));await writeCyc(id,t.dataset.m,{pausado_em:hoje()});toast("Atendimento pausado até a guia chegar")}catch(e){fail(e)}reload(["cic","vin"])});
    case"undoUni":return confirmInline(t,"Desfazer?",async()=>{try{await writeCyc(id,t.dataset.m,{[t.dataset.f]:null});toast("Desfeito")}catch(e){fail(e)}reload(["cic"])});
    case"abrirClinica":return sheetClinica(t.dataset.sub);
    case"removerLogo":try{await run(sb.from("clinicas").update({logo:null}).eq("id",S.clinica.id));await reload(["clinica"]);sheetClinica("mensagens");toast("Logo removido")}catch(e){fail(e)}return;
    case"modeloCsv":return modeloCsv();
    case"importar":return importar(t);
    case"abrirReu":return sheetReuDetalhe(id);
    case"editReu":return sheetReuniao(S.reunioes.find(x=>x.id===id));
    case"gravar":return gravarAoVivo(id);
    case"enviarAudio":return enviarAudio(id,t);
    case"gerarAta":t.disabled=true;t.textContent="Gerando…";try{await run(sb.from("reunioes").update({status:"gerando_ata",erro:null}).eq("id",id));await reload(["reunioes"]);const r=await reuCall({acao:"gerar_ata",reuniao_id:id});toast(r.status==="concluida"?"Ata pronta. Revise antes de compartilhar.":"Processando")}catch(e){fail(e)}await reload(["reunioes"]);return sheetReuDetalhe(id);
    case"editAta":$("ataView").hidden=true;$("fAta").hidden=false;$("ataTxt").focus();return;
    case"copyAta":{try{const r=await run(sb.from("reunioes").select("ata").eq("id",id).single());await navigator.clipboard.writeText(r.ata||"");toast("Ata copiada")}catch(e){fail(e)}return}
    case"baixarAta":{try{const r=await run(sb.from("reunioes").select("ata,titulo,data").eq("id",id).single());const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([r.ata||""],{type:"text/markdown;charset=utf-8"}));a.download=`ata-${r.data}-${String(r.titulo).replace(/\W+/g,"-").toLowerCase()}.md`;document.body.appendChild(a);a.click();a.remove()}catch(e){fail(e)}return}
    case"delReu":return confirmInline(t,"Excluir reunião, transcrição e ata?",async()=>{try{await run(sb.from("reunioes").delete().eq("id",id));closeSheet();toast("Reunião excluída");reload(["reunioes"])}catch(e){fail(e)}});
    case"clinSub":return sheetClinica(t.dataset.v);
    case"editMembro":return sheetMembro(id);
    case"aprovar":{try{await run(sb.from("membros").update({ativo:true,papel:"profissional"}).eq("user_id",id));await reload(["membros"]);sheetClinica("equipe");toast("Acesso aprovado")}catch(e){fail(e)}return}
    case"recusar":return confirmInline(t,"Confirmar recusa",async()=>{try{await run(sb.from("membros").delete().eq("user_id",id));await reload(["membros"]);sheetClinica("equipe");toast("Pedido recusado")}catch(e){fail(e)}});
    case"remover":return confirmInline(t,"Remover acesso desta pessoa?",async()=>{try{await run(sb.from("membros").delete().eq("user_id",id));await reload(["membros","vin"]);sheetClinica("equipe");toast("Removida da clínica")}catch(e){fail(e)}});
    case"carregarEx":t.disabled=true;try{await run(sb.rpc("carregar_exemplos"));closeSheet();toast("Exemplos carregados");await loadAll()}catch(e){t.disabled=false;fail(e)}return;
    case"apagarEx":return confirmInline(t,"Apagar todos os exemplos?",async()=>{try{await run(sb.rpc("apagar_exemplos"));closeSheet();toast("Exemplos apagados");loadAll()}catch(e){fail(e)}});
    case"atualizar":closeSheet();return loadAll();
    case"sair":closeSheet();return sair();
  }
}

document.addEventListener("click",e=>{
  const tab=e.target.closest(".tab");
  if(tab){S.tab=tab.dataset.tab;lsSet("rythmos.tab",S.tab);render();window.scrollTo(0,0);return}
  const t=e.target.closest("[data-act]");if(!t)return;
  acao(t.dataset.act,t);
});
document.addEventListener("change",e=>{
  if(e.target.dataset.change==="prof"){S.prof=e.target.value;lsSet("rythmos.prof",S.prof);render()}
});
document.addEventListener("input",e=>{
  if(e.target.id==="busca"){S.busca=e.target.value;const pos=e.target.selectionStart;render();const b=$("busca");if(b){b.focus();b.setSelectionRange(pos,pos)}}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("scrim").hidden)closeSheet();
  if(e.key==="Enter"&&e.target.matches&&e.target.matches(".prow,[role=button]"))e.target.click();
});
$("scrim").addEventListener("click",e=>{if(e.target.id==="scrim")closeSheet()});
$("fab").onclick=()=>{if(S.tab==="agenda")sheetSessao(null);else if(S.tab==="reunioes")sheetReuniao(null);else sheetPaciente(null,{fila:S.tab==="fila"})};
$("btnClinica").onclick=()=>sheetClinica();
$("btnConta").onclick=sheetConta;
window.addEventListener("focus",()=>{if(S.loaded&&Date.now()-S.lastLoad>60000&&$("scrim").hidden)loadAll()});

if(sb){
  sb.auth.onAuthStateChange((ev)=>{
    if(ev==="PASSWORD_RECOVERY")telaNovaSenha();
    else if(ev==="SIGNED_IN"&&!S.me)iniciar();
    else if(ev==="SIGNED_OUT"){S.me=null;telaLogin("entrar")}
  });
}
iniciar();
