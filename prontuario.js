/* Rythmos — Prontuário do paciente: anamnese, avaliação, habilidades, objetivos,
   documentos anexados e relatório em Word. Só dona e a profissional da terapia. */
"use strict";

const PR = { pid:null, vid:null, dados:{}, docs:[], metas:[], notas:[], geral:false, libOk:false };
const AREAS = {comunicacao:"Comunicação e linguagem",cognicao:"Cognição e aprendizagem",social:"Socialização e engajamento",emocional:"Emocional e autorregulação",sensorial:"Integração sensorial",motora:"Motora",autonomia:"Autonomia (AVDs)",outra:"Outra"};
const NOTAS = {1:"não apresenta",2:"emergente",3:"com ajuda",4:"com pouca ajuda",5:"consolidada"};
const PR_CORES = ["#1F7A62","#2F6DB5","#C2410C","#7C3AED","#BE185D","#0E7490","#A16207","#475569"];

function prVinculosVisiveis(pid){
  return S.vin.filter(v=>v.paciente_id===pid&&(isDona()||v.profissional_id===meuId()));
}
function podeProntuario(pid){ return (isDona()||isProf())&&prVinculosVisiveis(pid).length>0; }

async function sheetProntuario(pid, vid){
  const p=pacById(pid); if(!p) return;
  const vins=prVinculosVisiveis(pid); if(!vins.length) return toast("Você não atende esse paciente.");
  PR.pid=pid; PR.vid=vid||(vins.find(v=>v.id===PR.vid)?PR.vid:vins[0].id);
  openSheet(`<header><h2>Prontuário · ${esc(p.nome)}</h2><button type="button" class="iconbtn" data-act="editPac" data-id="${pid}">Ficha</button></header><div class="empty"><span>Carregando…</span></div>`);
  try{
    const [pr,docs,metas,notas]=await Promise.all([
      run(sb.from("prontuarios").select("*").in("vinculo_id",vins.map(v=>v.id))),
      run(sb.from("documentos").select("*").eq("paciente_id",pid).order("criado_em",{ascending:false})),
      run(sb.from("metas").select("*").eq("paciente_id",pid).order("ordem").order("criado_em")),
      run(sb.from("metas_notas").select("*").eq("paciente_id",pid).order("data")),
    ]);
    PR.dados=Object.fromEntries(pr.map(x=>[x.vinculo_id,x])); PR.docs=docs; PR.metas=metas; PR.notas=notas;
  }catch(e){ fail(e); return; }
  renderProntuario();
}
function renderProntuario(){
  const p=pacById(PR.pid), vins=prVinculosVisiveis(PR.pid), v=vins.find(x=>x.id===PR.vid)||vins[0], d=PR.dados[v.id]||{};
  const ev=S.ses.filter(s=>s.vinculo_id===v.id&&S.evo[s.id]).length;
  const F=(id,name,label,dica,val)=>`<div class="f full"><label for="${id}">${label}</label><textarea id="${id}" name="${name}" placeholder="${esc(dica)}" style="min-height:110px">${esc(val||"")}</textarea></div>`;
  openSheet(`<form id="fPront"><header><div style="min-width:0"><div class="eyebrow">Prontuário</div><h2>${esc(p.nome)}</h2></div><button type="button" class="iconbtn" data-act="editPac" data-id="${p.id}">Ficha</button></header>
  ${vins.length>1?`<div class="filtro"><label for="pr_vin">Terapia</label><select id="pr_vin" data-change="prVin">${vins.map(x=>`<option value="${x.id}" ${x.id===v.id?"selected":""}>${esc(x.terapia)} · ${esc(x.profissional_id?chamar(nomeProf(x.profissional_id)):"sem profissional")}</option>`).join("")}</select></div>`:`<p class="note">${esc(v.terapia)} · ${esc(nomeProf(v.profissional_id))}</p>`}
  <div class="fields">
    ${F("pr_ana","anamnese","Anamnese","Queixa principal, história do desenvolvimento, saúde, família, escola, o que já foi feito.",d.anamnese)}
    ${F("pr_ava","avaliacao","Avaliação","Instrumentos e protocolos aplicados (nome, data, resultado), observação clínica, hipótese.",d.avaliacao)}
    ${F("pr_hab","habilidades","Habilidades","O que a criança já faz, o que está emergindo, o que ainda não faz.",d.habilidades)}
    ${F("pr_obj","objetivos","Objetivos terapêuticos","Metas do período, com prazo quando houver.",d.objetivos)}
  </div>
  ${d.atualizado_em?`<p class="note">Atualizado em ${esc(new Date(d.atualizado_em).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}))} · ${ev} ${ev===1?"evolução registrada":"evoluções registradas"} nesta terapia</p>`:""}
  <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar prontuário</button></div></div>
  ${prSecaoMetas(v,vins)}
  <div style="border-top:1px solid var(--line);padding-top:14px"><div class="toolbar" style="justify-content:space-between"><div class="eyebrow">Documentos</div><div class="toolbar"><button type="button" class="btn primary" data-act="prRelatorio">Gerar relatório (Word)</button><label class="btn" for="prFile" style="cursor:pointer">Anexar arquivo</label><input type="file" id="prFile" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.txt"></div></div>
    ${PR.docs.length?`<div class="hist" style="margin-top:8px;max-height:none">${PR.docs.map(x=>`<div><span style="min-width:0;overflow:hidden;text-overflow:ellipsis"><b>${esc(x.nome)}</b><br><span class="note">${esc(curto(x.criado_em.slice(0,10)))}/${x.criado_em.slice(0,4)} · ${esc(chamar(nomeProf(x.profissional_id)))}${x.tamanho?" · "+Math.round(x.tamanho/1024)+" KB":""}</span></span><span style="display:flex;gap:6px;flex:none"><button type="button" class="btn" data-act="prBaixar" data-id="${x.id}">Abrir</button>${isDona()||x.profissional_id===meuId()?`<button type="button" class="btn danger" data-act="prApagar" data-id="${x.id}">Apagar</button>`:""}</span></div>`).join("")}</div>`:'<p class="note" style="margin-top:8px">Nenhum documento ainda. Relatórios gerados e laudos anexados ficam aqui.</p>'}
  </div></form>`);
  $("fPront").onsubmit=async e=>{
    e.preventDefault(); const f=Object.fromEntries(new FormData(e.target)); const vid=v.id;
    const body={vinculo_id:vid,anamnese:f.anamnese.trim()||null,avaliacao:f.avaliacao.trim()||null,habilidades:f.habilidades.trim()||null,objetivos:f.objetivos.trim()||null};
    try{ await run(sb.from("prontuarios").upsert(body,{onConflict:"vinculo_id"})); toast("Prontuário salvo"); sheetProntuario(PR.pid,vid); }catch(err){ fail(err); }
  };
  const fi=$("prFile"); if(fi) fi.onchange=()=>prAnexar(fi.files[0]);
}
document.addEventListener("change",e=>{ if(e.target.dataset.change==="prVin"){ PR.vid=e.target.value; renderProntuario(); } });

async function prAnexar(file, nomeForcado){
  if(!file) return;
  if(file.size>25*1024*1024) return toast("Arquivo maior que 25 MB.");
  const nome=nomeForcado||file.name;
  const ext=(nome.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
  const path=`${S.me.clinica_id}/${PR.pid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  try{
    const {error}=await sb.storage.from("documentos").upload(path,file,{contentType:file.type||"application/octet-stream"}); if(error) throw error;
    await run(sb.from("documentos").insert({paciente_id:PR.pid,nome,tipo:file.type||ext,tamanho:file.size,caminho:path}));
    toast("Documento guardado no prontuário"); sheetProntuario(PR.pid,PR.vid);
  }catch(e){ fail(e); }
}
async function prBaixar(id){
  const d=PR.docs.find(x=>x.id===id); if(!d) return;
  try{ const {data,error}=await sb.storage.from("documentos").createSignedUrl(d.caminho,300); if(error) throw error; window.open(data.signedUrl,"_blank","noopener"); }catch(e){ fail(e); }
}
async function prApagar(id){
  const d=PR.docs.find(x=>x.id===id); if(!d) return;
  try{ await sb.storage.from("documentos").remove([d.caminho]); await run(sb.from("documentos").delete().eq("id",id)); toast("Documento apagado"); sheetProntuario(PR.pid,PR.vid); }catch(e){ fail(e); }
}

/* ---------- metas e habilidades (nota 1 a 5) ---------- */
function prNotasDe(mid){ return PR.notas.filter(n=>n.meta_id===mid).sort((a,b)=>a.data.localeCompare(b.data)); }
function prMesAno(d){ return d.slice(5,7)+"/"+d.slice(2,4); }
function prSecaoMetas(v,vins){
  const minhas=PR.metas.filter(m=>m.vinculo_id===v.id), ativas=minhas.filter(m=>m.ativa);
  const geralOk=vins.length>1;
  let h=`<div style="border-top:1px solid var(--line);padding-top:14px"><div class="toolbar" style="justify-content:space-between"><div><div class="eyebrow">Metas e habilidades</div><span class="note">Nota de 1 a 5 a cada avaliação · 1 não apresenta · 2 emergente · 3 com ajuda · 4 com pouca ajuda · 5 consolidada</span></div><div class="toolbar"><button type="button" class="btn" data-act="prNovaMeta">+ Meta</button>${ativas.length?'<button type="button" class="btn primary" data-act="prAvaliar">Avaliar agora</button>':""}</div></div>`;
  if(geralOk) h+=`<div class="toolbar" style="margin-top:8px"><button type="button" class="btn ${PR.geral?"":"primary"}" data-act="prVerTerapia">Esta terapia</button><button type="button" class="btn ${PR.geral?"primary":""}" data-act="prVerGeral">Visão geral da criança</button></div>`;
  if(PR.geral&&geralOk) return h+prGeral(vins)+"</div>";
  if(!minhas.length) return h+'<p class="note" style="margin-top:8px">Nenhuma meta ainda. Cadastre as habilidades que esta terapia trabalha (ex.: "aumento de vocabulário", "registro no sistema tátil") e avalie de 1 a 5 a cada período.</p></div>';
  h+=prGrafico(ativas);
  h+=`<div class="hist" style="margin-top:8px;max-height:none">${minhas.map((m,i)=>{const ns=prNotasDe(m.id);const seq=ns.map(n=>n.nota).join(" → ");const ult=ns[ns.length-1];
    return `<div data-act="prEditMeta" data-id="${m.id}" role="button" tabindex="0"><span style="min-width:0"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${m.ativa?PR_CORES[ativas.indexOf(m)%PR_CORES.length]:"#cbd5e1"};margin-right:6px"></span><b>${esc(m.descricao)}</b>${m.ativa?"":' <span class="pill p-mute">encerrada</span>'}<br><span class="note">${esc(AREAS[m.area]||m.area)}${ns.length?" · "+seq+" · última "+prMesAno(ult.data):" · sem avaliação"}</span></span>${ult?`<span class="pill ${ult.nota>=4?"p-ok":ult.nota>=3?"p-confirmada":"p-warn"}" style="flex:none;white-space:nowrap">${ult.nota} · ${NOTAS[ult.nota]}</span>`:""}</div>`}).join("")}</div></div>`;
  return h;
}
function prGrafico(metas){
  const datas=[...new Set(PR.notas.filter(n=>metas.some(m=>m.id===n.meta_id)).map(n=>n.data))].sort();
  if(datas.length<1) return "";
  const W=Math.min(640,Math.max(320,((document.getElementById("sheet")||{}).clientWidth||680)-40)),H=Math.round(W*0.4),L=28,R=12,T=14,B=34,x=i=>datas.length===1?W/2:L+(W-L-R)*i/(datas.length-1),y=n=>T+(H-T-B)*(5-n)/4;
  let g=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin-top:10px;background:var(--surface);border:1px solid var(--line);border-radius:12px" role="img" aria-label="Evolução das metas">`;
  for(let n=1;n<=5;n++) g+=`<line x1="${L}" x2="${W-R}" y1="${y(n)}" y2="${y(n)}" stroke="var(--line)" stroke-dasharray="${n===1?"":"3 4"}"/><text x="${L-6}" y="${y(n)+4}" font-size="13" text-anchor="end" fill="var(--ink)" opacity=".7">${n}</text>`;
  datas.forEach((d,i)=>{ if(datas.length<=8||i%Math.ceil(datas.length/8)===0||i===datas.length-1) g+=`<text x="${x(i)}" y="${H-B+16}" font-size="13" text-anchor="middle" fill="var(--ink)" opacity=".7">${prMesAno(d)}</text>`; });
  metas.forEach((m,k)=>{ const c=PR_CORES[k%PR_CORES.length]; const pts=prNotasDe(m.id).map(n=>[x(datas.indexOf(n.data)),y(n.nota)]); if(!pts.length) return;
    if(pts.length>1) g+=`<polyline points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach(p=>g+=`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${c}"/>`); });
  // legenda
  let lx=L,ly=H-8; metas.forEach((m,k)=>{ const t=m.descricao.length>22?m.descricao.slice(0,21)+"…":m.descricao; const w=t.length*7.2+18; if(lx+w>W-R){return} g+=`<rect x="${lx}" y="${ly-9}" width="9" height="9" rx="2" fill="${PR_CORES[k%PR_CORES.length]}"/><text x="${lx+13}" y="${ly}" font-size="13" fill="var(--ink)">${esc(t)}</text>`; lx+=w; });
  return g+"</svg>";
}
function prGeral(vins){
  // por área: média da primeira e da última nota de cada meta ativa, em todas as terapias visíveis
  const por={}; for(const m of PR.metas.filter(m=>m.ativa&&vins.some(v=>v.id===m.vinculo_id))){ const ns=prNotasDe(m.id); if(!ns.length) continue; (por[m.area]=por[m.area]||{ini:[],fim:[],n:0,ter:new Set()}); por[m.area].ini.push(ns[0].nota); por[m.area].fim.push(ns[ns.length-1].nota); por[m.area].n++; const v=vins.find(x=>x.id===m.vinculo_id); por[m.area].ter.add(v?v.terapia:""); }
  const areas=Object.keys(por); if(!areas.length) return '<p class="note" style="margin-top:8px">Ainda não há metas avaliadas nas terapias desta criança.</p>';
  const med=a=>a.reduce((s,x)=>s+x,0)/a.length;
  let h='<div class="hist" style="margin-top:10px;max-height:none">';
  for(const a of areas){ const i=med(por[a].ini), f=med(por[a].fim), d=f-i;
    h+=`<div style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(AREAS[a]||a)}</b><span class="pill ${d>0?"p-ok":d<0?"p-warn":"p-mute"}">${d>0?"+":""}${d.toFixed(1)}</span></div><div class="note">${por[a].n} ${por[a].n===1?"meta":"metas"} · ${esc([...por[a].ter].join(", "))}</div>
      <div style="display:grid;grid-template-columns:70px 1fr 30px;gap:6px;align-items:center;margin-top:6px;font-size:12px"><span>primeira</span><div style="height:8px;background:var(--line);border-radius:4px"><div style="height:8px;width:${(i-1)/4*100}%;background:#94a3b8;border-radius:4px"></div></div><b>${i.toFixed(1)}</b><span>última</span><div style="height:8px;background:var(--line);border-radius:4px"><div style="height:8px;width:${(f-1)/4*100}%;background:#1F7A62;border-radius:4px"></div></div><b>${f.toFixed(1)}</b></div></div>`; }
  return h+"</div>";
}
function sheetMeta(id){
  const m=PR.metas.find(x=>x.id===id)||{area:"comunicacao",descricao:"",ativa:true,vinculo_id:PR.vid};
  const p=pacById(PR.pid), ns=id?prNotasDe(id):[];
  openSheet(`<form id="fMeta"><header><div style="min-width:0"><div class="eyebrow">${id?"Meta":"Nova meta"}</div><h2>${esc(p.nome)}</h2></div><button type="button" class="iconbtn" data-act="prVoltar">Voltar</button></header>
  <div class="fields">
    <div class="f full"><label for="m_desc">Habilidade / meta</label><input id="m_desc" name="descricao" required placeholder="Ex.: Aumento de vocabulário expressivo" value="${esc(m.descricao)}"></div>
    <div class="f full"><label for="m_area">Área (comum a todas as especialidades)</label><select id="m_area" name="area">${Object.entries(AREAS).map(([k,v])=>`<option value="${k}" ${m.area===k?"selected":""}>${v}</option>`).join("")}</select></div>
    ${id?`<div class="f full"><label for="m_ativa">Situação</label><select id="m_ativa" name="ativa"><option value="1" ${m.ativa?"selected":""}>Em trabalho</option><option value="0" ${m.ativa?"":"selected"}>Encerrada (sai do gráfico)</option></select></div>`:""}
  </div>
  ${ns.length?`<div class="eyebrow" style="margin:8px 0 6px">Avaliações</div><div class="hist">${ns.map(n=>`<div><span>${esc(curto(n.data))}/${n.data.slice(0,4)}${n.obs?' · <span class="note">'+esc(n.obs)+'</span>':""}</span><span style="display:flex;gap:6px;align-items:center"><span class="pill ${n.nota>=4?"p-ok":n.nota>=3?"p-confirmada":"p-warn"}">${n.nota} · ${NOTAS[n.nota]}</span><button type="button" class="btn danger" data-act="prDelNota" data-id="${n.id}">×</button></span></div>`).join("")}</div>`:""}
  <div class="foot">${id?`<button type="button" class="btn danger" data-act="prDelMeta" data-id="${id}">Excluir meta</button>`:""}<div class="r"><button class="btn primary" type="submit">Salvar</button></div></div></form>`);
  $("fMeta").onsubmit=async e=>{ e.preventDefault(); const f=Object.fromEntries(new FormData(e.target));
    const body={descricao:f.descricao.trim(),area:f.area}; if(id) body.ativa=f.ativa==="1";
    try{ if(id) await run(sb.from("metas").update(body).eq("id",id)); else await run(sb.from("metas").insert(Object.assign({vinculo_id:PR.vid,ordem:PR.metas.filter(x=>x.vinculo_id===PR.vid).length},body))); toast("Meta salva"); sheetProntuario(PR.pid,PR.vid); }catch(err){ fail(err); } };
}
function sheetAvaliar(){
  const p=pacById(PR.pid), metas=PR.metas.filter(m=>m.vinculo_id===PR.vid&&m.ativa);
  openSheet(`<form id="fAval"><header><div style="min-width:0"><div class="eyebrow">Avaliação das metas</div><h2>${esc(p.nome)}</h2></div><button type="button" class="iconbtn" data-act="prVoltar">Voltar</button></header>
  <div class="fields"><div class="f"><label for="a_data">Data da avaliação</label><input id="a_data" name="data" type="date" required value="${hoje()}"></div></div>
  <p class="note">1 não apresenta · 2 emergente · 3 faz com ajuda · 4 faz com pouca ajuda · 5 consolidada / independente</p>
  <div class="hist" style="max-height:none">${metas.map(m=>{const ult=prNotasDe(m.id).slice(-1)[0];return `<div style="display:block"><b>${esc(m.descricao)}</b> <span class="note">· ${esc(AREAS[m.area]||m.area)}${ult?" · última "+ult.nota+" em "+prMesAno(ult.data):""}</span><div class="jgPads" style="margin-top:6px;display:flex;gap:6px">${[1,2,3,4,5].map(n=>`<label class="btn" style="flex:1;text-align:center;cursor:pointer;padding:8px 0"><input type="radio" name="n_${m.id}" value="${n}" ${ult&&ult.nota===n?"checked":""} style="margin:0 4px 0 0">${n}</label>`).join("")}</div></div>`}).join("")}</div>
  <div class="fields" style="margin-top:8px"><div class="f full"><label for="a_obs">Observação (opcional, vale para todas)</label><input id="a_obs" name="obs" placeholder="Ex.: avaliação semestral"></div></div>
  <div class="foot"><div class="r"><button class="btn primary" type="submit">Salvar avaliação</button></div></div></form>`);
  $("fAval").onsubmit=async e=>{ e.preventDefault(); const f=Object.fromEntries(new FormData(e.target));
    const rows=metas.filter(m=>f["n_"+m.id]).map(m=>({meta_id:m.id,data:f.data,nota:Number(f["n_"+m.id]),obs:f.obs.trim()||null}));
    if(!rows.length) return toast("Dê nota a pelo menos uma meta.");
    try{ await run(sb.from("metas_notas").upsert(rows,{onConflict:"meta_id,data"})); toast(`${rows.length} ${rows.length===1?"nota salva":"notas salvas"}`); sheetProntuario(PR.pid,PR.vid); }catch(err){ fail(err); } };
}

/* ---------- relatório em Word ---------- */
function prCarregarLib(){
  if(window.docx){ PR.libOk=true; return Promise.resolve(); }
  return new Promise((ok,err)=>{ const s=document.createElement("script"); s.src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js"; s.onload=()=>{PR.libOk=true;ok()}; s.onerror=()=>err(new Error("Não foi possível carregar o gerador de Word. Confira a internet e tente de novo.")); document.head.appendChild(s); });
}
function sheetRelatorio(){
  const p=pacById(PR.pid), vins=prVinculosVisiveis(PR.pid), v=vins.find(x=>x.id===PR.vid)||vins[0];
  const ini=addMonths(ymOf(hoje()),-2)+"-01";
  openSheet(`<form id="fRel"><header><div style="min-width:0"><div class="eyebrow">Relatório · ${esc(v.terapia)}</div><h2>${esc(p.nome)}</h2></div><button type="button" class="iconbtn" data-act="prVoltar">Voltar</button></header>
  <div class="fields">
    <div class="f"><label for="r_ini">De</label><input id="r_ini" name="ini" type="date" required value="${ini}"></div>
    <div class="f"><label for="r_fim">Até</label><input id="r_fim" name="fim" type="date" required value="${hoje()}"></div>
    <div class="f full"><label for="r_tipo">Tipo</label><select id="r_tipo" name="tipo"><option value="evolucao">Relatório de evolução terapêutica</option><option value="avaliacao">Relatório de avaliação</option><option value="escola">Relatório para a escola</option><option value="convenio">Relatório para o convênio</option></select></div>
    <div class="f full"><label for="r_dest">Destinatário (opcional)</label><input id="r_dest" name="dest" placeholder="Ex.: Escola Municipal X · Coordenação pedagógica"></div>
    <div class="f full"><label for="r_obs">Parecer e encaminhamentos (texto final)</label><textarea id="r_obs" name="obs" style="min-height:100px" placeholder="Síntese do período, o que recomenda, próximos passos."></textarea></div>
  </div>
  <div class="toolbar"><label class="btn" style="cursor:pointer"><input type="checkbox" name="inc_ana" checked style="margin-right:6px">Anamnese e avaliação</label><label class="btn" style="cursor:pointer"><input type="checkbox" name="inc_evo" checked style="margin-right:6px">Evoluções do período</label><label class="btn" style="cursor:pointer"><input type="checkbox" name="inc_metas" checked style="margin-right:6px">Metas e notas</label><label class="btn" style="cursor:pointer"><input type="checkbox" name="inc_freq" checked style="margin-right:6px">Frequência</label><label class="btn" style="cursor:pointer"><input type="checkbox" name="guardar" checked style="margin-right:6px">Guardar no prontuário</label></div>
  <p class="note">O Word abre o arquivo para você revisar e assinar. Pacientes aparecem pelo nome completo porque o relatório é entregue à família ou a quem ela autorizar.</p>
  <div class="foot"><div class="r"><button class="btn primary" type="submit">Gerar .docx</button></div></div></form>`);
  $("fRel").onsubmit=async e=>{ e.preventDefault(); const btn=e.target.querySelector("[type=submit]"); btn.disabled=true; btn.textContent="Gerando…";
    try{ await prCarregarLib(); await prGerarDocx(Object.fromEntries(new FormData(e.target)), v); }catch(err){ fail(err); btn.disabled=false; btn.textContent="Gerar .docx"; } };
}
async function prGerarDocx(f, v){
  const p=pacById(PR.pid), d=PR.dados[v.id]||{}, m=membro(v.profissional_id)||{}, clin=S.clinica||{};
  const ini=f.ini, fim=f.fim;
  const ses=S.ses.filter(s=>s.vinculo_id===v.id&&s.data>=ini&&s.data<=fim&&s.status!=="desmarcada").sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
  let evos=[];
  if(f.inc_evo){ try{ evos=await run(sb.from("evolucoes").select("*").eq("paciente_id",p.id).eq("profissional_id",v.profissional_id).gte("data",ini).lte("data",fim).order("data")); }catch(e){ fail(e); } }
  const pres=ses.filter(s=>s.status==="presente").length, falt=ses.filter(s=>s.status==="falta").length;
  const idade=p.nascimento?(()=>{const n=parse(p.nascimento),h=parse(hoje());let a=h.getFullYear()-n.getFullYear();const mm=h.getMonth()-n.getMonth();if(mm<0||(mm===0&&h.getDate()<n.getDate()))a--;return a+" anos"})():null;
  const titulos={evolucao:"Relatório de evolução terapêutica",avaliacao:"Relatório de avaliação",escola:"Relatório para a escola",convenio:"Relatório para o convênio"};
  const D=window.docx;
  const P=(t,o)=>new D.Paragraph(Object.assign({children:[new D.TextRun({text:t,font:"Arial",size:22})],spacing:{after:120}},o||{}));
  const H=(t)=>new D.Paragraph({children:[new D.TextRun({text:t,bold:true,font:"Arial",size:26,color:"12233D"})],spacing:{before:240,after:120}});
  const multi=(t)=>String(t||"").split(/\n+/).filter(Boolean).map(l=>P(l));
  const kids=[];
  // cabeçalho
  let logo=null;
  if(clin.logo&&/^data:image\/(png|jpeg);base64,/.test(clin.logo)){ try{ const bin=atob(clin.logo.split(",")[1]); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i); logo=new D.ImageRun({type:clin.logo.startsWith("data:image/png")?"png":"jpg",data:arr,transformation:{width:120,height:60}}); }catch{} }
  kids.push(new D.Paragraph({children:logo?[logo]:[new D.TextRun({text:clin.nome||"",bold:true,font:"Arial",size:28})],alignment:D.AlignmentType.CENTER}));
  if(logo) kids.push(new D.Paragraph({children:[new D.TextRun({text:clin.nome||"",bold:true,font:"Arial",size:24})],alignment:D.AlignmentType.CENTER}));
  kids.push(new D.Paragraph({children:[new D.TextRun({text:titulos[f.tipo]||titulos.evolucao,bold:true,font:"Arial",size:32,color:"12233D"})],alignment:D.AlignmentType.CENTER,spacing:{before:240,after:240}}));
  if(f.dest) kids.push(P("Para: "+f.dest));
  kids.push(H("Identificação"));
  kids.push(P("Paciente: "+p.nome+(idade?" · "+idade:"")+(p.nascimento?" · nascimento "+curto(p.nascimento)+"/"+p.nascimento.slice(0,4):"")));
  if(p.responsavel) kids.push(P("Responsável: "+p.responsavel));
  kids.push(P("Terapia: "+v.terapia+(v.inicio_convenio?" · início "+curto(v.inicio_convenio)+"/"+v.inicio_convenio.slice(0,4):"")));
  kids.push(P("Profissional: "+(m.nome||"")+(m.registro?" · "+m.registro:"")));
  kids.push(P("Período: "+curto(ini)+"/"+ini.slice(0,4)+" a "+curto(fim)+"/"+fim.slice(0,4)));
  if(f.inc_ana){
    if(d.anamnese){ kids.push(H("Anamnese")); kids.push(...multi(d.anamnese)); }
    if(d.avaliacao){ kids.push(H("Avaliação")); kids.push(...multi(d.avaliacao)); }
  }
  if(d.habilidades){ kids.push(H("Habilidades")); kids.push(...multi(d.habilidades)); }
  if(d.objetivos){ kids.push(H("Objetivos terapêuticos")); kids.push(...multi(d.objetivos)); }
  if(f.inc_metas){ const metas=PR.metas.filter(m=>m.vinculo_id===v.id&&prNotasDe(m.id).length);
    if(metas.length){ kids.push(H("Metas e habilidades (nota de 1 a 5)")); kids.push(P("1 não apresenta · 2 emergente · 3 com ajuda · 4 com pouca ajuda · 5 consolidada"));
      const cel=(t,b,w)=>new D.TableCell({width:{size:w,type:D.WidthType.PERCENTAGE},children:[new D.Paragraph({children:[new D.TextRun({text:t,bold:!!b,font:"Arial",size:20})]})]});
      const rows=[new D.TableRow({tableHeader:true,children:[cel("Meta",1,46),cel("Área",1,24),cel("Primeira",1,15),cel("Última",1,15)]})];
      for(const m of metas){ const ns=prNotasDe(m.id), a=ns[0], z=ns[ns.length-1]; rows.push(new D.TableRow({children:[cel(m.descricao+(m.ativa?"":" (encerrada)"),0,46),cel(AREAS[m.area]||m.area,0,24),cel(a.nota+" · "+prMesAno(a.data),0,15),cel(z.nota+" · "+prMesAno(z.data),0,15)]})); }
      kids.push(new D.Table({width:{size:100,type:D.WidthType.PERCENTAGE},rows})); } }
  if(f.inc_freq){ kids.push(H("Frequência no período")); kids.push(P(`${ses.length} ${ses.length===1?"sessão agendada":"sessões agendadas"} · ${pres} ${pres===1?"presença":"presenças"} · ${falt} ${falt===1?"falta":"faltas"}${pres+falt?" · "+Math.round(pres*100/(pres+falt))+"% de presença":""}`)); }
  if(f.inc_evo){ kids.push(H("Evolução das sessões"));
    if(!evos.length) kids.push(P("Nenhuma evolução registrada no período."));
    for(const e of evos){ kids.push(new D.Paragraph({children:[new D.TextRun({text:curto(e.data)+"/"+e.data.slice(0,4),bold:true,font:"Arial",size:22})],spacing:{before:160,after:60}}));
      if(e.atividades) kids.push(P("Trabalhado: "+e.atividades)); if(e.resposta) kids.push(P("Resposta: "+e.resposta)); if(e.proximos) kids.push(P("Orientações: "+e.proximos)); } }
  if(f.obs){ kids.push(H("Parecer e encaminhamentos")); kids.push(...multi(f.obs)); }
  kids.push(new D.Paragraph({children:[new D.TextRun({text:(clin.nome?clin.nome+", ":"")+fmtDia(hoje(),{day:"numeric",month:"long",year:"numeric"}),font:"Arial",size:22})],spacing:{before:480}}));
  kids.push(new D.Paragraph({children:[new D.TextRun({text:"_______________________________________",font:"Arial",size:22})],spacing:{before:480}}));
  kids.push(P((m.nome||"")+(m.registro?" · "+m.registro:"")));
  kids.push(new D.Paragraph({children:[new D.TextRun({text:"Documento gerado pelo Rythmos. Confidencial: contém dados de saúde.",font:"Arial",size:16,color:"475569"})],spacing:{before:480}}));
  const doc=new D.Document({sections:[{properties:{page:{margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:kids}]});
  const blob=await D.Packer.toBlob(doc);
  const nome=`${(titulos[f.tipo]||"Relatorio").split(" ")[0]}-${p.nome.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\W+/g,"-").replace(/^-|-$/g,"")}-${fim}.docx`;
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=nome; document.body.appendChild(a); a.click(); a.remove();
  toast("Relatório gerado");
  if(f.guardar){ await prAnexar(new File([blob],nome,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),nome); }
  else sheetProntuario(PR.pid,PR.vid);
}

/* ---------- ações ---------- */
function prAcao(a,t){
  const id=t.dataset.id;
  if(a==="abrirPront"){ sheetProntuario(id); return true; }
  if(a==="prVoltar"){ sheetProntuario(PR.pid,PR.vid); return true; }
  if(a==="prRelatorio"){ sheetRelatorio(); return true; }
  if(a==="prBaixar"){ prBaixar(id); return true; }
  if(a==="prNovaMeta"){ sheetMeta(null); return true; }
  if(a==="prEditMeta"){ sheetMeta(id); return true; }
  if(a==="prAvaliar"){ sheetAvaliar(); return true; }
  if(a==="prVerGeral"){ PR.geral=true; renderProntuario(); return true; }
  if(a==="prVerTerapia"){ PR.geral=false; renderProntuario(); return true; }
  if(a==="prDelMeta"){ confirmInline(t,"Excluir a meta e todas as notas dela?",async()=>{ try{ await run(sb.from("metas").delete().eq("id",id)); toast("Meta excluída"); sheetProntuario(PR.pid,PR.vid); }catch(e){ fail(e); } }); return true; }
  if(a==="prDelNota"){ confirmInline(t,"Apagar esta nota?",async()=>{ try{ await run(sb.from("metas_notas").delete().eq("id",id)); const mid=(PR.notas.find(n=>n.id===id)||{}).meta_id; await sheetProntuario(PR.pid,PR.vid); if(mid) sheetMeta(mid); }catch(e){ fail(e); } }); return true; }
  if(a==="prApagar"){ confirmInline(t,"Apagar este documento?",()=>prApagar(id)); return true; }
  return false;
}
