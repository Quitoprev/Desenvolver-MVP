/* Rythmos — Painel da clínica (só a gestora): evolução das metas por área,
   metas estagnadas, crianças sem avaliação recente, visão por profissional. */
"use strict";

const PN = { metas:[], notas:[], carregado:false, carregando:false, meses:6 };

async function pnCarregar(){
  if(PN.carregando) return; PN.carregando=true;
  try{
    const [m,n]=await Promise.all([ run(sb.from("metas").select("*")), run(sb.from("metas_notas").select("id,meta_id,data,nota").order("data")) ]);
    PN.metas=m; PN.notas=n; PN.carregado=true;
  }catch(e){ fail(e); }
  PN.carregando=false; if(S.tab==="painel") render();
}
function pnNotasDe(mid){ return PN.notas.filter(n=>n.meta_id===mid); } // já vêm em ordem de data

/* Para cada meta ativa com nota: base = última nota antes do período (ou a primeira dentro dele),
   atual = última nota. Comparável quando há duas notas distintas no tempo e a atual cai no período. */
function pnAnalise(){
  const ini=addMonths(ymOf(hoje()),-PN.meses)+"-01", h=hoje();
  const corte90=addDays(h,-90);
  const linhas=[];
  for(const m of PN.metas){
    const ns=pnNotasDe(m.id); if(!ns.length) continue;
    const p=pacById(m.paciente_id), v=S.vin.find(x=>x.id===m.vinculo_id); if(!p||!v) continue;
    const atual=ns[ns.length-1];
    const antes=ns.filter(n=>n.data<ini); const base=antes.length?antes[antes.length-1]:ns.find(n=>n.data>=ini);
    const noPeriodo=atual.data>=ini;
    const comparavel=m.ativa&&noPeriodo&&base&&base.id!==atual.id;
    const estagnada=m.ativa&&ns.length>=2&&ns[ns.length-1].nota===ns[ns.length-2].nota&&atual.nota<5;
    const semRecente=m.ativa&&atual.data<corte90;
    linhas.push({m,p,v,ns,atual,base,noPeriodo,comparavel,delta:comparavel?atual.nota-base.nota:null,estagnada,semRecente,avalsPeriodo:ns.filter(n=>n.data>=ini).length});
  }
  return {ini,linhas};
}
function pnAreaResumo(linhas){
  const por={};
  for(const l of linhas.filter(l=>l.comparavel)){
    const a=l.m.area, k=l.p.id;
    (por[a]=por[a]||{criancas:{},metas:0,subiram:0,deltas:[]}).metas++;
    if(l.delta>0) por[a].subiram++;
    por[a].deltas.push(l.delta);
    (por[a].criancas[k]=por[a].criancas[k]||[]).push(l.delta);
  }
  return Object.entries(por).map(([a,x])=>{
    const cs=Object.values(x.criancas).map(ds=>ds.reduce((s,d)=>s+d,0)/ds.length);
    return {area:a,metas:x.metas,subiram:x.subiram,evoluiram:cs.filter(d=>d>0).length,estaveis:cs.filter(d=>d===0).length,regrediram:cs.filter(d=>d<0).length,n:cs.length,media:x.deltas.reduce((s,d)=>s+d,0)/x.deltas.length};
  }).sort((a,b)=>b.n-a.n);
}

function vPainel(){
  if(!isDona()) return '<div class="empty"><span>Só a gestora da clínica vê o painel.</span></div>';
  if(!PN.carregado){ pnCarregar(); return '<div class="empty"><span>Carregando…</span></div>'; }
  const {ini,linhas}=pnAnalise();
  const periodo=[[3,"3 meses"],[6,"6 meses"],[12,"12 meses"],[24,"2 anos"]];
  let h=`<div class="toolbar" style="justify-content:space-between"><div><div class="eyebrow">Painel da clínica</div><span class="note">Evolução das metas desde ${esc(curto(ini))}/${ini.slice(0,4)} · nota de 1 a 5</span></div><div class="toolbar"><div class="statusgrid" style="display:flex">${periodo.map(([n,l])=>`<button type="button" data-act="pnMeses" data-n="${n}" aria-pressed="${PN.meses===n}">${l}</button>`).join("")}</div><button type="button" class="btn" data-act="pnAtualizar">Atualizar</button><button type="button" class="btn" data-act="pnCsv">Exportar CSV</button></div></div>`;
  if(!PN.metas.length) return h+'<div class="empty" style="margin-top:14px"><span>Ainda não há metas cadastradas. Cada profissional cadastra as metas no Prontuário do paciente e dá nota de 1 a 5 a cada avaliação; o painel se monta sozinho a partir daí.</span></div>';
  const comp=linhas.filter(l=>l.comparavel);
  const criancasAval=new Set(linhas.filter(l=>l.avalsPeriodo).map(l=>l.p.id)).size;
  const avals=new Set(PN.notas.filter(n=>n.data>=ini).map(n=>n.meta_id+"|"+n.data)).size;
  const subiram=comp.filter(l=>l.delta>0).length, pct=comp.length?Math.round(subiram*100/comp.length):null;
  const estag=linhas.filter(l=>l.estagnada), semRec=linhas.filter(l=>l.semRecente);
  PN.evasao=0;
  h+=`<div class="stats" style="margin-top:12px"><div class="stat"><b>${criancasAval}</b><span>crianças avaliadas no período</span></div><div class="stat"><b>${avals}</b><span>avaliações feitas</span></div><div class="stat ${pct!=null&&pct>=50?"hl":""}"><b>${pct!=null?pct+"%":"—"}</b><span>metas que subiram${comp.length?" ("+subiram+" de "+comp.length+")":""}</span></div><div class="stat ${estag.length?"hl":""}"><b>${estag.length}</b><span>metas estagnadas</span></div></div>`;
  // por área
  const areas=pnAreaResumo(linhas);
  h+=`<div class="eyebrow" style="margin:18px 0 6px">Evolução por área</div>`;
  if(!areas.length) h+=`<p class="note">Ainda não há metas com duas avaliações no período. Com a segunda avaliação, aparece aqui quantas crianças evoluíram em cada área.</p>`;
  else h+=`<div class="hist" style="max-height:none">${areas.map(a=>{const tot=a.n||1;const seg=(n,c)=>n?`<div style="width:${n/tot*100}%;background:${c}" title="${n}"></div>`:"";
    return `<div style="display:block"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(AREAS[a.area]||a.area)}</b><span class="note">${a.n} ${a.n===1?"criança":"crianças"} · ${a.metas} ${a.metas===1?"meta":"metas"} · média ${a.media>0?"+":""}${a.media.toFixed(1)}</span></div>
    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--line);margin-top:6px">${seg(a.evoluiram,"#1F7A62")}${seg(a.estaveis,"#94a3b8")}${seg(a.regrediram,"#C2410C")}</div>
    <div class="note" style="margin-top:4px"><span style="color:#1F7A62">■</span> ${a.evoluiram} evoluíram · <span style="color:#94a3b8">■</span> ${a.estaveis} estáveis · <span style="color:#C2410C">■</span> ${a.regrediram} regrediram</div></div>`}).join("")}</div>`;
  // por profissional
  const prof={};
  for(const l of linhas){ const k=l.v.profissional_id||"-"; (prof[k]=prof[k]||{ativas:0,avals:0,comp:0,sub:0,criancas:new Set()}); if(l.m.ativa)prof[k].ativas++; prof[k].avals+=l.avalsPeriodo; if(l.comparavel){prof[k].comp++; if(l.delta>0)prof[k].sub++} if(l.avalsPeriodo)prof[k].criancas.add(l.p.id); }
  const profs=Object.entries(prof).sort((a,b)=>b[1].avals-a[1].avals);
  if(profs.length) h+=`<div class="eyebrow" style="margin:18px 0 6px">Por profissional</div><div class="hist" style="max-height:none">${profs.map(([k,x])=>`<div><span><b>${esc(k==="-"?"Sem profissional":nomeProf(k))}</b><br><span class="note">${x.ativas} metas ativas · ${x.criancas.size} ${x.criancas.size===1?"criança avaliada":"crianças avaliadas"} · ${x.avals} ${x.avals===1?"nota":"notas"} no período</span></span><span class="pill ${x.comp?(x.sub/x.comp>=0.5?"p-ok":"p-warn"):"p-mute"}">${x.comp?Math.round(x.sub*100/x.comp)+"% subiram":"sem comparação"}</span></div>`).join("")}</div>`;
  // risco de evasão (regras simples sobre a agenda dos últimos 90 dias)
  h+=pnEvasao();
  // estagnadas
  h+=`<div class="eyebrow" style="margin:18px 0 6px">Metas estagnadas <span class="note" style="font-weight:400">(mesma nota nas duas últimas avaliações, ainda não consolidada)</span></div>`;
  h+=estag.length?`<div class="hist" style="max-height:none">${estag.sort((a,b)=>a.atual.nota-b.atual.nota).map(l=>`<div data-act="pnAbrir" data-id="${l.p.id}" data-v="${l.v.id}" role="button" tabindex="0"><span><b>${esc(l.p.nome)}</b> · ${esc(l.m.descricao)}<br><span class="note">${esc(l.v.terapia)} · ${esc(chamar(nomeProf(l.v.profissional_id)))} · ${esc(AREAS[l.m.area]||l.m.area)} · notas ${l.ns.slice(-3).map(n=>n.nota).join(" → ")}</span></span><span class="pill p-warn">${l.atual.nota} desde ${prMesAno(l.ns[l.ns.length-2].data)}</span></div>`).join("")}</div>`:'<p class="note">Nenhuma. Toda meta com duas avaliações mudou de nota ou já está consolidada.</p>';
  // sem avaliação recente
  const semRecPorCrianca={}; for(const l of semRec){ const k=l.p.id+"|"+l.v.id; (semRecPorCrianca[k]=semRecPorCrianca[k]||{l,n:0}).n++; }
  const srl=Object.values(semRecPorCrianca).sort((a,b)=>a.l.atual.data.localeCompare(b.l.atual.data));
  h+=`<div class="eyebrow" style="margin:18px 0 6px">Sem avaliação há mais de 90 dias</div>`;
  h+=srl.length?`<div class="hist" style="max-height:none">${srl.map(({l,n})=>`<div data-act="pnAbrir" data-id="${l.p.id}" data-v="${l.v.id}" role="button" tabindex="0"><span><b>${esc(l.p.nome)}</b> · ${esc(l.v.terapia)}<br><span class="note">${esc(chamar(nomeProf(l.v.profissional_id)))} · ${n} ${n===1?"meta ativa":"metas ativas"}</span></span><span class="pill p-mute">última ${esc(curto(l.atual.data))}/${l.atual.data.slice(0,4)}</span></div>`).join("")}</div>`:'<p class="note">Todas as metas ativas foram avaliadas nos últimos 90 dias.</p>';
  return h;
}
function pnEvasao(){
  const h0=hoje(), d30=addDays(h0,-30), d90=addDays(h0,-90), f14=addDays(h0,14);
  const itens=[];
  for(const v of S.vin.filter(v=>v.situacao==="ativo")){
    const ses=S.ses.filter(s=>s.vinculo_id===v.id&&s.status!=="desmarcada");
    const fech=ses.filter(s=>s.data>=d90&&s.data<=h0&&(s.status==="presente"||s.status==="falta"));
    const falt30=ses.filter(s=>s.data>=d30&&s.data<=h0&&s.status==="falta").length;
    const pres=fech.filter(s=>s.status==="presente").length, pct=fech.length>=4?Math.round(pres*100/fech.length):null;
    const futuras=ses.filter(s=>s.data>h0&&s.data<=f14).length;
    const ultima=ses.filter(s=>s.data<=h0).map(s=>s.data).sort().pop();
    const seq=ses.filter(s=>s.data<=h0&&(s.status==="presente"||s.status==="falta")).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,2);
    const motivos=[];
    if(falt30>=2) motivos.push(falt30+" faltas em 30 dias");
    if(seq.length===2&&seq.every(s=>s.status==="falta")) motivos.push("duas últimas sessões faltou");
    if(pct!=null&&pct<60) motivos.push(pct+"% de presença em 90 dias");
    if(!futuras&&ultima) motivos.push("nada agendado nos próximos 14 dias");
    if(ultima&&ultima<d30&&!futuras) motivos.push("sem sessão desde "+curto(ultima));
    if(motivos.length){ const p=pacById(v.paciente_id); if(p) itens.push({p,v,motivos,grau:motivos.length>=2||(seq.length===2&&seq.every(s=>s.status==="falta"))?"alto":"medio"}); }
  }
  itens.sort((a,b)=>(a.grau==="alto"?0:1)-(b.grau==="alto"?0:1)||b.motivos.length-a.motivos.length);
  let h=`<div class="eyebrow" style="margin:18px 0 6px">Risco de evasão <span class="note" style="font-weight:400">(faltas, presença baixa ou agenda vazia)</span></div>`;
  if(!itens.length) return h+'<p class="note">Nenhuma criança em risco pelas regras atuais.</p>';
  return h+`<div class="hist" style="max-height:none">${itens.map(x=>{const p=x.p,link=p.telefone?waLink(p.telefone,`Olá, ${first(p.responsavel)||"tudo bem"}? Aqui é da ${S.clinica.nome||"clínica"}. Sentimos falta de ${first(p.nome)} nas sessões de ${x.v.terapia}. Podemos combinar os próximos horários?`):null;
    return `<div><span style="min-width:0"><b>${esc(p.nome)}</b> · ${esc(x.v.terapia)} · ${esc(chamar(nomeProf(x.v.profissional_id)))}<br><span class="note">${esc(x.motivos.join(" · "))}</span></span><span style="display:flex;gap:6px;align-items:center;flex:none"><span class="pill ${x.grau==="alto"?"p-bad":"p-warn"}">${x.grau==="alto"?"alto":"atenção"}</span>${link?`<a class="btn wa" href="${link}" target="_blank" rel="noopener">WhatsApp</a>`:""}<button type="button" class="btn" data-act="editPac" data-id="${p.id}">Ficha</button></span></div>`}).join("")}</div>`;
}
function pnCsv(){
  const esc2=v=>{v=String(v??"");return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const cab=["Paciente","Terapia","Profissional","Área","Meta","Situação","Data","Nota"];
  const rows=[];
  for(const m of PN.metas){ const p=pacById(m.paciente_id)||{}, v=S.vin.find(x=>x.id===m.vinculo_id)||{};
    const ns=pnNotasDe(m.id); if(!ns.length) rows.push([p.nome||"",v.terapia||"",v.profissional_id?nomeProf(v.profissional_id):"",AREAS[m.area]||m.area,m.descricao,m.ativa?"ativa":"encerrada","",""]);
    for(const n of ns) rows.push([p.nome||"",v.terapia||"",v.profissional_id?nomeProf(v.profissional_id):"",AREAS[m.area]||m.area,m.descricao,m.ativa?"ativa":"encerrada",n.data,n.nota]); }
  rows.sort((a,b)=>(a[0]+a[1]+a[4]+a[6]).localeCompare(b[0]+b[1]+b[4]+b[6]));
  for(const r of rows) if(r[6]) r[6]=curto(r[6])+"/"+r[6].slice(0,4);
  const csv="﻿"+[cab,...rows].map(r=>r.map(esc2).join(";")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=`metas-${hoje()}.csv`; document.body.appendChild(a); a.click(); a.remove();
}
function pnAcao(a,t){
  if(a==="pnMeses"){ PN.meses=Number(t.dataset.n); render(); return true; }
  if(a==="pnAtualizar"){ PN.carregado=false; render(); return true; }
  if(a==="pnCsv"){ pnCsv(); return true; }
  if(a==="pnAbrir"){ sheetProntuario(t.dataset.id,t.dataset.v); return true; }
  return false;
}
