/* Rythmos — Agenda inteligente: dia, semana e mês, cores por especialidade,
   números operacionais do período e ocupação por profissional. */
"use strict";

const AG = { vista:(()=>{try{return localStorage.getItem("rythmos.agVista")||"dia"}catch(e){return "dia"}})() };
const TERAPIA_CORES = [
  [/fono/i,"#1F7A62"],[/ocupacional|\bTO\b/i,"#C2410C"],[/psicolog/i,"#7C3AED"],[/psicopedag/i,"#2F6DB5"],
  [/musico/i,"#BE185D"],[/fisio/i,"#0E7490"],[/nutri/i,"#A16207"],[/aba/i,"#4D7C0F"]
];
const AG_FALLBACK=["#475569","#6B7280","#0F766E","#9333EA","#B45309"];
function corTerapia(t){
  t=String(t||"");
  for(const [re,c] of TERAPIA_CORES) if(re.test(t)) return c;
  let h=0; for(const ch of t) h=(h*31+ch.charCodeAt(0))>>>0; return AG_FALLBACK[h%AG_FALLBACK.length];
}
function agLegenda(ss){
  const ts=[...new Set(ss.map(s=>s.terapia).filter(Boolean))].sort();
  if(ts.length<2) return "";
  return `<div class="agLeg">${ts.map(t=>`<span><i style="background:${corTerapia(t)}"></i>${esc(t)}</span>`).join("")}</div>`;
}
function agSubtabs(){
  return `<div class="subtabs" style="max-width:360px">${[["dia","Dia"],["semana","Semana"],["mes","Mês"]].map(([k,l])=>`<button type="button" data-act="agVista" data-v="${k}" aria-pressed="${AG.vista===k}">${l}</button>`).join("")}</div>`;
}
function agStats(ss,extra){
  const vivas=ss.filter(s=>s.status!=="desmarcada"), n=k=>vivas.filter(s=>s.status===k).length;
  const passadas=vivas.filter(s=>s.data<hoje()||(s.data===hoje()&&s.status!=="agendada"&&s.status!=="confirmada"));
  const pres=n("presente"), falt=n("falta"), fechadas=pres+falt, pct=fechadas?Math.round(pres*100/fechadas):null;
  return `<div class="stats"><div class="stat"><b>${vivas.length}</b><span>sessões</span></div>
    <div class="stat ${n("agendada")?"hl":""}"><b>${n("agendada")}</b><span>a confirmar</span></div>
    <div class="stat"><b>${pct!=null?pct+"%":"—"}</b><span>presença${fechadas?" ("+pres+" de "+fechadas+")":""}</span></div>
    <div class="stat ${falt?"hl":""}"><b>${falt}</b><span>faltas</span></div></div>${extra||""}`;
}
function agPorProfissional(ss){
  if(!isEquipe()||S.prof) return "";
  const por={}; for(const s of ss){ if(s.status==="desmarcada") continue; const k=s.profissional_id||"-"; (por[k]=por[k]||{n:0,pres:0,falt:0,conf:0,ter:{}}); por[k].n++; if(s.status==="presente")por[k].pres++; if(s.status==="falta")por[k].falt++; if(s.status==="agendada")por[k].conf++; por[k].ter[s.terapia||""]=(por[k].ter[s.terapia||""]||0)+1; }
  const ks=Object.keys(por).sort((a,b)=>por[b].n-por[a].n); if(!ks.length) return "";
  const max=Math.max(...ks.map(k=>por[k].n));
  return `<div class="eyebrow" style="margin:14px 0 6px">Por profissional</div><div class="hist" style="max-height:none">${ks.map(k=>{const x=por[k];const tt=Object.entries(x.ter).sort((a,b)=>b[1]-a[1]);
    return `<div style="display:block" data-act="agProf" data-id="${k==="-"?"":k}" role="button" tabindex="0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(k==="-"?"Sem profissional":nomeProf(k))}</b><span class="note">${x.n} ${x.n===1?"sessão":"sessões"}${x.falt?" · "+x.falt+" "+(x.falt===1?"falta":"faltas"):""}${x.conf?" · "+x.conf+" a confirmar":""}</span></div>
    <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--line);margin-top:6px;width:${Math.round(x.n/max*100)}%">${tt.map(([t,n])=>`<div style="width:${n/x.n*100}%;background:${corTerapia(t)}" title="${esc(t)} ${n}"></div>`).join("")}</div></div>`}).join("")}</div>`;
}

/* ---------- semana ---------- */
function vAgendaSemana(){
  const ini=segunda(S.dia), dias=[...Array(7)].map((_,i)=>addDays(ini,i)), fim=dias[6];
  const ss=sesVisiveis().filter(s=>s.data>=ini&&s.data<=fim);
  const estaSemana=segunda(hoje())===ini;
  let h=filtroProf()+agSubtabs()+daynav(estaSemana?"Esta semana":"Semana","agSem",`${curto(ini)} a ${curto(fim)}`,estaSemana,"agSemHoje");
  h+=agStats(ss)+agLegenda(ss);
  const mostrarProf=isEquipe()&&!S.prof;
  h+=`<div class="agSem">`;
  for(const d of dias){
    const ds=ss.filter(s=>s.data===d).sort((a,b)=>String(a.hora).localeCompare(String(b.hora)));
    const eHoje=d===hoje();
    h+=`<div class="agCol ${eHoje?"hoje":""}"><button type="button" class="agColHead" data-act="agDia" data-d="${d}"><span>${fmtDia(d,{weekday:"short"})}</span><b>${parse(d).getDate()}</b>${ds.length?`<em>${ds.filter(s=>s.status!=="desmarcada").length}</em>`:""}</button>`;
    if(!ds.length) h+=`<div class="agVazio">—</div>`;
    for(const s of ds){ const p=pacById(s.paciente_id)||{nome:"Paciente"};
      h+=`<button type="button" class="agSes st-${s.status}" style="--c:${corTerapia(s.terapia)}" data-act="editSes" data-id="${s.id}" title="${esc(p.nome)} · ${esc(s.terapia||"")}"><span class="t">${hhmm(s.hora)}</span><span class="n">${esc(first(p.nome))} ${esc((p.nome||"").split(" ").slice(1,2).join(""))}</span>${mostrarProf?`<span class="p">${esc(chamar(nomeProf(s.profissional_id)))}</span>`:""}</button>`; }
    h+=`</div>`;
  }
  h+=`</div>`+agPorProfissional(ss);
  return h;
}

/* ---------- mês ---------- */
function vAgendaMes(){
  const ym=ymOf(S.dia), ini=ym+"-01", prox=addMonths(ym,1)+"-01", fim=addDays(prox,-1);
  const ss=sesVisiveis().filter(s=>s.data>=ini&&s.data<=fim);
  const esteMes=ym===ymOf(hoje());
  const nomeMes=parse(ini).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  let h=filtroProf()+agSubtabs()+daynav(esteMes?"Este mês":"Mês","agMes",nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1),esteMes,"agMesHoje");
  // por especialidade
  const porT={}; for(const s of ss){ if(s.status==="desmarcada") continue; porT[s.terapia||"Sem terapia"]=(porT[s.terapia||"Sem terapia"]||0)+1; }
  const tt=Object.entries(porT).sort((a,b)=>b[1]-a[1]), tot=tt.reduce((a,[,n])=>a+n,0);
  const espec=tt.length?`<div class="agEsp"><div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--line)">${tt.map(([t,n])=>`<div style="width:${n/tot*100}%;background:${corTerapia(t)}" title="${esc(t)} ${n}"></div>`).join("")}</div><div class="agLeg">${tt.map(([t,n])=>`<span><i style="background:${corTerapia(t)}"></i>${esc(t)} <b>${n}</b></span>`).join("")}</div></div>`:"";
  h+=agStats(ss,espec);
  // grade
  const primeiro=parse(ini), off=(primeiro.getDay()+6)%7, nd=parse(fim).getDate();
  h+=`<div class="agMes"><div class="agMesHead">${["seg","ter","qua","qui","sex","sáb","dom"].map(x=>`<span>${x}</span>`).join("")}</div><div class="agMesGrid">`;
  for(let i=0;i<off;i++) h+=`<div class="agMesDia vazio"></div>`;
  for(let d=1;d<=nd;d++){ const data=ym+"-"+String(d).padStart(2,"0"); const ds=ss.filter(s=>s.data===data&&s.status!=="desmarcada");
    const falt=ds.filter(s=>s.status==="falta").length, pend=ds.filter(s=>s.status==="agendada").length;
    const ts={}; ds.forEach(s=>ts[s.terapia||""]=(ts[s.terapia||""]||0)+1);
    h+=`<button type="button" class="agMesDia ${data===hoje()?"hoje":""} ${ds.length?"":"livre"}" data-act="agDia" data-d="${data}"><b>${d}</b>${ds.length?`<span class="q">${ds.length}</span><span class="dots">${Object.entries(ts).slice(0,5).map(([t,n])=>`<i style="background:${corTerapia(t)}" title="${esc(t)} ${n}"></i>`).join("")}</span>${falt?`<span class="f">${falt} ${falt===1?"falta":"faltas"}</span>`:pend&&data>=hoje()?`<span class="c">${pend} a confirmar</span>`:""}`:""}</button>`; }
  h+=`</div></div>`+agPorProfissional(ss);
  if(isEquipe()) h+=`<div class="toolbar" style="margin-top:12px"><button type="button" class="btn" data-act="agCsv" data-ini="${ini}" data-fim="${fim}">Exportar sessões do mês (CSV)</button><span class="note">Presença, faltas e confirmações por criança e profissional, para o Excel.</span></div>`;
  return h;
}
function agCsv(ini,fim){
  const esc2=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const cab=["Data","Hora","Paciente","Responsável","Terapia","Profissional","Convênio","Situação","Evolução registrada"];
  const rows=sesVisiveis().filter(s=>s.data>=ini&&s.data<=fim).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora)).map(s=>{const p=pacById(s.paciente_id)||{};return [curto(s.data)+"/"+s.data.slice(0,4),hhmm(s.hora),p.nome||"",p.responsavel||"",s.terapia||"",s.profissional_id?nomeProf(s.profissional_id):"",p.convenio||"",STATUS[s.status]||s.status,S.evo[s.id]?"sim":"não"]});
  const csv="\ufeff"+[cab,...rows].map(r=>r.map(esc2).join(";")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=`sessoes-${ini.slice(0,7)}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

function agAcao(a,t){
  if(a==="agCsv"){ agCsv(t.dataset.ini,t.dataset.fim); return true; }
  if(a==="agVista"){ AG.vista=t.dataset.v; try{localStorage.setItem("rythmos.agVista",AG.vista)}catch(e){} render(); return true; }
  if(a==="agSem"){ S.dia=addDays(S.dia,7*Number(t.dataset.n)); render(); return true; }
  if(a==="agSemHoje"||a==="agMesHoje"){ S.dia=hoje(); render(); return true; }
  if(a==="agMes"){ const ym=addMonths(ymOf(S.dia),Number(t.dataset.n)); S.dia=ym===ymOf(hoje())?hoje():ym+"-01"; render(); return true; }
  if(a==="agDia"){ S.dia=t.dataset.d; AG.vista="dia"; try{localStorage.setItem("rythmos.agVista","dia")}catch(e){} render(); window.scrollTo(0,0); return true; }
  if(a==="agProf"){ S.prof=t.dataset.id||""; lsSet("rythmos.prof",S.prof); render(); return true; }
  return false;
}
