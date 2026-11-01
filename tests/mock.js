(function(){
const ROLE=window.__ROLE||"dona";
const H=new Date();const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const add=(n)=>{const d=new Date(H);d.setDate(d.getDate()+n);return iso(d)};
const today=iso(H),ym=today.slice(0,7);
const prevYm=(()=>{const d=new Date(H.getFullYear(),H.getMonth()-1,1);return iso(d).slice(0,7)})();
const C="c1",DONA="u-dona",LIV="u-livia",RAF="u-rafael";
const ME={dona:DONA,profissional:LIV,recepcao:"u-bia"}[ROLE];
let n=0;const id=()=>"id"+(++n)+Math.random().toString(16).slice(2,8);
const db={
 clinicas:[{id:C,nome:"Clínica Desenvolver",codigo_convite:"A7K2Q9",modelos:{},fiscal:{cnpj:"12345678000190",inscricao_municipal:"123456",codigo_municipio:"2704302",optante_simples_nacional:true,aliquota:2,ambiente:"homologacao"}}],
 membros:[{user_id:DONA,clinica_id:C,nome:"Mariana Lopes",papel:"dona",especialidade:"Fonoaudiologia",repasse_pct:0,ativo:true,criado_em:today},
  {user_id:LIV,clinica_id:C,nome:"Dra. Lívia Santos",papel:"profissional",especialidade:"Fonoaudiologia",repasse_pct:30,ativo:true,criado_em:today,recebe:"pf",cpf:"52998224725",registro:"CRFa 4-12345"},
  {user_id:RAF,clinica_id:C,nome:"Rafael Gomes",papel:"profissional",especialidade:"Terapia ocupacional",repasse_pct:35,ativo:true,criado_em:today},
  {user_id:"u-bia",clinica_id:C,nome:"Bia Recepção",papel:"recepcao",repasse_pct:0,ativo:true,criado_em:today},
  {user_id:"u-nova",clinica_id:C,nome:"Carla Psicóloga",papel:"profissional",repasse_pct:0,ativo:false,criado_em:today}],
 pacientes:[],vinculos:[],sessoes:[],evolucoes:[],pagamentos:[],unimed_ciclos:[],notas_fiscais:[],prontuarios:[],documentos:[],metas:[],metas_notas:[],auditoria:[],assinaturas:[{clinica_id:"c1",plano:"teste",status:window.__ASSIN||"teste",teste_ate:add(12),pago_ate:null,valor:null}],reunioes:[{id:"reu1",clinica_id:C,titulo:"Reunião de equipe de outubro",data:add(-3),participantes:"Mariana, Lívia, Rafael",origem:"arquivo",status:"concluida",transcricao:"Então, gente, a fila de fono está com cinco famílias esperando. A Lívia falou que consegue abrir dois horários na terça de manhã. O Rafael lembrou que a família do T.A. pediu para trocar a TO para a tarde. Ficou combinado que a Mariana responde até dia quinze. Sobre a Unimed, os pedidos de prorrogação saem dia dezoito, sem exceção.",ata:"# Ata de reunião\n**Data:** "+add(-3).split("-").reverse().join("/")+"\n**Participantes:** Mariana, Lívia, Rafael\n\n## Pauta\n- Fila de espera de fonoaudiologia\n- Pedido de troca de horário (TO)\n- Prazo dos pedidos da Unimed\n\n## Resumo\nA fila de fono tem cinco famílias. Lívia abre dois horários na terça pela manhã. A família de T.A. pediu TO à tarde; Mariana responde. Os pedidos de prorrogação da Unimed saem no dia 18.\n\n## Decisões\n- Abrir dois horários de fono na terça de manhã.\n- Pedidos de prorrogação da Unimed entregues até o dia 18.\n\n## Encaminhamentos\n| O quê | Quem | Prazo |\n|---|---|---|\n| Abrir horários de terça | Lívia | próxima semana |\n| Responder família de T.A. | Mariana | dia 15 |\n\n## Pendências e próximos passos\n- Confirmar com a recepção a chamada das famílias da fila.",erro:null,arquivo:null,criado_em:today,atualizado_em:today}]
};
const P=(nome,resp,conv,ex)=>{const r={id:id(),clinica_id:C,nome,responsavel:resp,telefone:"82999990000",convenio:conv,exemplo:!!ex,cpf_pagador:conv==="Particular"?"52998224725":null,nome_pagador:null};db.pacientes.push(r);return r.id};
const V=(pid,prof,ter,o)=>{const r=Object.assign({id:id(),clinica_id:C,paciente_id:pid,profissional_id:prof,terapia:ter,situacao:"ativo",prioridade:"normal",criado_em:today},o||{});db.vinculos.push(r);return r};
const Ss=(v,d,h,st)=>{const r={id:id(),clinica_id:C,vinculo_id:v.id,paciente_id:v.paciente_id,profissional_id:v.profissional_id,terapia:v.terapia,data:d,hora:h+":00",status:st};db.sessoes.push(r);return r};
const p1=P("Theo Albuquerque","Camila Albuquerque","Unimed",1),p2=P("Helena Rocha","Bruno Rocha","Unimed",1),p3=P("Alice Menezes","Patrícia Menezes","Particular",1),p4=P("Davi Lins","Renata Lins","Particular",1);
const v1=V(p1,LIV,"Fonoaudiologia",{valor_sessao:60,inicio_convenio:add(-70)}),v1b=V(p1,RAF,"Terapia ocupacional",{valor_sessao:70,inicio_convenio:add(-40)});
const v2=V(p2,LIV,"Fonoaudiologia",{valor_sessao:60,inicio_convenio:add(-100)}),v3=V(p3,DONA,"Fonoaudiologia",{valor_sessao:180});
V(p4,RAF,"Terapia ocupacional",{situacao:"fila",prioridade:"alta",entrada_fila:add(-40)});V(p3,null,"Psicologia",{situacao:"fila",entrada_fila:add(-75)});
const p5=P("Bento Araújo","Lúcia Araújo","Particular",1);const v5=V(p5,LIV,"Fonoaudiologia",{valor_sessao:150});const s5=Ss(v5,add(-3),"11:00","presente");const s5b=Ss(v5,add(-10),"11:00","presente");
const s1=Ss(v1,add(-7),"08:00","presente");Ss(v2,add(-7),"09:00","falta");const s3=Ss(v3,add(-7),"10:00","presente");Ss(v1b,add(-6),"14:00","presente");
Ss(v1,today,"08:00","confirmada");Ss(v2,today,"09:00","agendada");Ss(v3,today,"10:00","agendada");Ss(v1b,today,"14:00","agendada");Ss(v1,add(7),"08:00","agendada");Ss(v1,add(1),"08:00","agendada");Ss(v3,add(2),"10:00","agendada");Ss(v2,add(3),"09:00","confirmada");Ss(v1b,add(3),"14:00","agendada");
db.pagamentos.push({sessao_id:s5.id,clinica_id:C,profissional_id:LIV,data:s5.data,valor:150,status:"pago",forma:"Pix",pago_em:s5.data});db.pagamentos.push({sessao_id:s5b.id,clinica_id:C,profissional_id:LIV,data:s5b.data,valor:150,status:"pago",forma:"Dinheiro",pago_em:s5b.data,receita_saude_em:s5b.data});
db.pagamentos.push({sessao_id:s3.id,clinica_id:C,profissional_id:DONA,data:s3.data,valor:180,status:"pago",forma:"Pix",pago_em:s3.data});
db.evolucoes.push({sessao_id:s1.id,clinica_id:C,paciente_id:p1,profissional_id:LIV,data:s1.data,atividades:"Pedidos com duas palavras",resposta:"Bom engajamento",proximos:"Rotina do banho",atualizado_em:new Date().toISOString()});
db.unimed_ciclos.push({vinculo_id:v1.id,mes:prevYm,clinica_id:C,profissional_id:LIV,pedido_em:prevYm+"-19",msg_em:prevYm+"-19T12:00:00Z",guia_em:ym+"-01"});
db.unimed_ciclos.push({vinculo_id:v2.id,mes:prevYm,clinica_id:C,profissional_id:LIV,pedido_em:prevYm+"-20"});
db.unimed_ciclos.push({vinculo_id:v1.id,mes:ym,clinica_id:C,profissional_id:LIV,pedido_em:ym+"-20"});
// metas de exemplo (nota 1 a 5) para o gráfico e o painel
const M=(v,area,desc,notas,o)=>{const m=Object.assign({id:id(),clinica_id:C,vinculo_id:v.id,paciente_id:v.paciente_id,profissional_id:v.profissional_id,area,descricao:desc,ativa:true,ordem:db.metas.length,criado_em:today},o||{});db.metas.push(m);notas.forEach(([d,n])=>db.metas_notas.push({id:id(),clinica_id:C,meta_id:m.id,vinculo_id:v.id,paciente_id:v.paciente_id,profissional_id:v.profissional_id,data:add(d),nota:n}));return m};
M(v1,"comunicacao","Aumento de vocabulário expressivo",[[-240,2],[-120,3],[-20,4]]);M(v1,"comunicacao","Funções comunicativas (pedir, comentar)",[[-240,1],[-120,2],[-20,3]]);M(v1,"social","Engajamento em atividade conjunta",[[-240,2],[-120,3],[-20,3]]);
M(v1b,"sensorial","Registro no sistema tátil",[[-200,2],[-80,3],[-15,4]]);M(v1b,"sensorial","Registro proprioceptivo",[[-200,2],[-80,2],[-15,2]]);M(v1b,"autonomia","Vestir-se com pouca ajuda",[[-200,1],[-80,2],[-15,3]]);
M(v2,"comunicacao","Nomeação de objetos",[[-300,1],[-150,2]]);M(v2,"emocional","Tolerar frustração na troca de atividade",[[-300,2],[-150,2]]);
M(v3,"comunicacao","Inteligibilidade de fala",[[-100,3],[-10,4]]);M(v5,"comunicacao","Vocabulário receptivo",[[-30,2]]);
window.__db=db;
function vis(t,r){ // RLS simplificado
  if(ROLE==="dona")return true;
  if(ROLE==="recepcao")return !["pagamentos","evolucoes","notas_fiscais","reunioes","prontuarios","documentos","metas","metas_notas"].includes(t);
  if(ROLE==="recepcao")return !["pagamentos","evolucoes"].includes(t);
  if(t==="pacientes")return db.vinculos.some(v=>v.paciente_id===r.id&&v.profissional_id===ME);
  if(t==="vinculos")return r.profissional_id===ME||db.vinculos.some(v=>v.paciente_id===r.paciente_id&&v.profissional_id===ME);
  if(t==="reunioes"||t==="auditoria")return false;
  if(t==="prontuarios"){const v=db.vinculos.find(x=>x.id===r.vinculo_id);return !!v&&v.profissional_id===ME}
  if(t==="metas"||t==="metas_notas")return r.profissional_id===ME;
  if(t==="documentos")return db.vinculos.some(v=>v.paciente_id===r.paciente_id&&v.profissional_id===ME);
  if(["sessoes","pagamentos","unimed_ciclos","notas_fiscais"].includes(t))return r.profissional_id===ME;
  if(t==="evolucoes")return r.profissional_id===ME||db.vinculos.some(v=>v.paciente_id===r.paciente_id&&v.profissional_id===ME);
  return true;
}
function trig(t,r){
  r.clinica_id=C;
  if(["pacientes","prontuarios","metas","metas_notas","evolucoes","sessoes"].includes(t))db.auditoria.unshift({id:id(),clinica_id:C,user_id:ME,acao:r.id&&db[t].includes(r)?"alterar":"criar",tabela:t,registro_id:r.id||null,paciente_id:t==="pacientes"?r.id:r.paciente_id||null,detalhes:null,criado_em:new Date().toISOString()});
  if(t==="sessoes"){const v=db.vinculos.find(x=>x.id===r.vinculo_id);r.paciente_id=v.paciente_id;r.profissional_id=v.profissional_id;r.terapia=r.terapia||v.terapia;if(r.hora&&r.hora.length===5)r.hora+=":00"}
  if(t==="evolucoes"||t==="pagamentos"){const s=db.sessoes.find(x=>x.id===r.sessao_id);r.profissional_id=s.profissional_id;r.data=s.data;if(t==="evolucoes"){r.paciente_id=s.paciente_id;r.atualizado_em=new Date().toISOString()}}
  if(t==="prontuarios"){const v=db.vinculos.find(x=>x.id===r.vinculo_id);if(!v||(ROLE!=="dona"&&v.profissional_id!==ME))throw new Error("new row violates row-level security policy");r.paciente_id=v.paciente_id;r.profissional_id=v.profissional_id;r.atualizado_em=new Date().toISOString()}
  if(t==="metas"){const v=db.vinculos.find(x=>x.id===r.vinculo_id);if(!v||(ROLE!=="dona"&&v.profissional_id!==ME))throw new Error("new row violates row-level security policy");r.paciente_id=v.paciente_id;r.profissional_id=v.profissional_id;if(r.ativa===undefined)r.ativa=true}
  if(t==="metas_notas"){const m=db.metas.find(x=>x.id===r.meta_id);if(!m||(ROLE!=="dona"&&m.profissional_id!==ME))throw new Error("new row violates row-level security policy");r.vinculo_id=m.vinculo_id;r.paciente_id=m.paciente_id;r.profissional_id=m.profissional_id}
  if(t==="documentos"){r.profissional_id=ME;r.criado_em=r.criado_em||new Date().toISOString()}
  if(t==="unimed_ciclos"){const v=db.vinculos.find(x=>x.id===r.vinculo_id);r.profissional_id=v.profissional_id}
  if(t==="vinculos"&&r.situacao==="fila"&&!r.entrada_fila)r.entrada_fila=today;
  if(t==="notas_fiscais"&&!r.status){const s=db.sessoes.find(x=>x.id===r.sessao_ids[0]);r.status="pendente";r.profissional_id=s.profissional_id;r.paciente_id=s.paciente_id;r.ref="orb-"+r.id;r.ambiente="homologacao";r.sessao_ids.forEach(sid=>{const pg=db.pagamentos.find(p=>p.sessao_id===sid);if(pg)pg.nota_id=r.id;else db.pagamentos.push({sessao_id:sid,clinica_id:C,profissional_id:s.profissional_id,data:s.data,valor:0,status:"pago",nota_id:r.id})})}
  return r;
}
const pk={membros:["user_id"],prontuarios:["vinculo_id"],metas_notas:["meta_id","data"],evolucoes:["sessao_id"],pagamentos:["sessao_id"],unimed_ciclos:["vinculo_id","mes"]};
class Q{constructor(t){this.t=t;this.f=[];this.op="select";this.ord=[];}
 select(){return this} eq(c,v){this.f.push(r=>r[c]===v);return this} in(c,arr){this.f.push(r=>arr.includes(r[c]));return this} lt(c,v){this.f.push(r=>r[c]<v);return this}
 gte(c,v){this.f.push(r=>r[c]>=v);return this} lte(c,v){this.f.push(r=>r[c]<=v);return this}
 order(c,o){this.ord.push([c,o&&o.ascending===false]);return this} limit(n){this.lim=n;return this} range(a,b){this.rng=[a,b];return this}
 maybeSingle(){this.one=true;return this} single(){this.one=true;return this}
 insert(x){this.op="insert";this.p=[].concat(x);return this} update(x){this.op="update";this.p=x;return this}
 upsert(x,o){this.op="upsert";this.p=x;this.on=(o&&o.onConflict||"id").split(",");return this} delete(){this.op="delete";return this}
 then(res){setTimeout(()=>{try{res({data:this.exec(),error:null})}catch(e){res({data:null,error:{message:String(e.message||e)}})}},5)}
 exec(){const T=db[this.t];const m=r=>vis(this.t,r)&&this.f.every(f=>f(r));
  if(this.op==="insert"){for(const r of this.p){T.push(trig(this.t,Object.assign({id:id(),criado_em:new Date().toISOString()},r)))}return null}
  if(this.op==="update"){T.filter(m).forEach(r=>{Object.assign(r,this.p);trig(this.t,r)});return null}
  if(this.one&&this.op==="select"&&this.t==="reunioes"&&false){}
  if(this.op==="upsert"){const k=this.on;for(const p of [].concat(this.p)){const ex=T.find(r=>k.every(c=>r[c]===p[c]));if(ex){Object.assign(ex,p);trig(this.t,ex)}else T.push(trig(this.t,Object.assign({id:id(),criado_em:new Date().toISOString()},p)))}return null}
  if(this.op==="delete"){const del=T.filter(m);db[this.t]=T.filter(r=>!del.includes(r));
    if(this.t==="notas_fiscais")db.pagamentos.forEach(p=>{if(del.some(n=>n.id===p.nota_id))p.nota_id=null});
    if(this.t==="pacientes"){const ids=del.map(r=>r.id);db.vinculos=db.vinculos.filter(v=>!ids.includes(v.paciente_id));db.sessoes=db.sessoes.filter(s=>!ids.includes(s.paciente_id))}return null}
  let out=T.filter(m).map(r=>Object.assign({},r));
  for(const [c,d] of this.ord.slice().reverse())out.sort((a,b)=>(String(a[c]??"")<String(b[c]??"")?-1:String(a[c]??"")>String(b[c]??"")?1:0)*(d?-1:1));
  if(this.rng)out=out.slice(this.rng[0],this.rng[1]+1);if(this.lim)out=out.slice(0,this.lim);
  if(this.one)return out[0]||null;return out}
}
const me=db.membros.find(m=>m.user_id===ME);
const client={from:t=>new Q(t),
 storage:{_files:{},from:(b)=>({upload:async(p,f)=>{client.storage._files[b+"/"+p]=f;return{error:null}},createSignedUrl:async(p)=>client.storage._files[b+"/"+p]?{data:{signedUrl:"https://example.com/signed/"+encodeURIComponent(p)},error:null}:{data:null,error:{message:"Object not found"}},remove:async(ps)=>{ps.forEach(p=>delete client.storage._files[b+"/"+p]);return{error:null}}})},
 functions:{invoke:async(name,{body})=>{if(name==="reunioes"){const r=db.reunioes.find(x=>x.id===body.reuniao_id);await new Promise(z=>setTimeout(z,400));if(body.acao==="transcrever"){r.transcricao=(r.transcricao?r.transcricao+"\n\n":"")+"(Transcrição simulada) Discutimos a escala de novembro e o recesso de fim de ano.";r.status="transcrita";r.arquivo=null;return{data:{status:"transcrita",transcricao:r.transcricao},error:null}}r.ata="# Ata de reunião\n**Data:** "+r.data+"\n\n## Pauta\n- Escala de novembro\n\n## Decisões\n- Recesso de 23/12 a 2/1.\n\n## Encaminhamentos\n| O quê | Quem | Prazo |\n|---|---|---|\n| Avisar famílias | Mariana | 30/11 |";r.status="concluida";return{data:{status:"concluida",ata:r.ata},error:null}}const n=db.notas_fiscais.find(x=>x.id===body.nota_id);if(!n)return{data:null,error:{message:'Nota não encontrada'}};await new Promise(r=>setTimeout(r,300));if(body.acao==='emitir'){const ok=(db.clinicas[0].fiscal||{}).ambiente!=='erro';Object.assign(n,ok?{status:'autorizada',numero:String(1000+db.notas_fiscais.indexOf(n)),url_pdf:'https://example.com/nota.pdf',emitida_em:new Date().toISOString(),erro:null}:{status:'erro',erro:'L99: Regime Especial de Tributação ausente/inválido'});return{data:{status:n.status},error:null}}if(body.acao==='cancelar'){n.status='cancelada';db.pagamentos.forEach(p=>{if(p.nota_id===n.id)p.nota_id=null});return{data:{status:'cancelada'},error:null}}return{data:{status:n.status},error:null}}},
 rpc:async(nm,args)=>{if(nm==="meu_status")return{data:{user_id:ME,nome:me.nome,papel:me.papel,ativo:true,clinica_id:C,clinica:"Clínica Desenvolver",assinatura:db.assinaturas[0],admin:ROLE==="dona"&&!!window.__ADMIN},error:null};
  if(nm==="registrar_acesso"){db.auditoria.unshift({id:id(),clinica_id:C,user_id:ME,acao:args.p_acao,tabela:args.p_tabela,registro_id:args.p_registro,paciente_id:args.p_paciente,detalhes:args.p_detalhes,criado_em:new Date().toISOString()});return{data:null,error:null}}
  if(nm==="sou_admin")return{data:!!window.__ADMIN,error:null};
  if(nm==="admin_clinicas")return{data:[{id:C,nome:"Clínica Desenvolver",criado_em:new Date().toISOString(),membros:4,pacientes:db.pacientes.length,sessoes_30d:db.sessoes.length,ultimo_acesso:new Date().toISOString(),gestora:"Mariana Lopes",assinatura:db.assinaturas[0]},{id:"c2",nome:"Clínica Exemplo 2",criado_em:new Date().toISOString(),membros:2,pacientes:9,sessoes_30d:30,ultimo_acesso:null,gestora:"Ana",assinatura:{plano:"clinica",status:"ativa",valor:349,pago_ate:add(20)}}],error:null};
  if(nm==="admin_assinatura"){Object.assign(db.assinaturas[0],{plano:args.p_plano,status:args.p_status,teste_ate:args.p_teste_ate,pago_ate:args.p_pago_ate,valor:args.p_valor,obs:args.p_obs});return{data:null,error:null}}
  return{data:null,error:null}},
 auth:{mfa:{listFactors:async()=>({data:{totp:window.__MFA?[{id:"f1",status:"verified"}]:[]},error:null}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:window.__MFA&&!window.__MFA_OK?"aal1":"aal2",nextLevel:window.__MFA?"aal2":"aal1"},error:null}),enroll:async()=>({data:{id:"f1",totp:{qr_code:"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><rect width='10' height='10'/></svg>",secret:"ABCDEF123456"}},error:null}),challenge:async()=>({data:{id:"ch1"},error:null}),verify:async({code})=>{if(code==="123456"){window.__MFA=true;window.__MFA_OK=true;return{data:{},error:null}}return{data:null,error:{message:"Código inválido"}}},unenroll:async()=>{window.__MFA=false;return{data:{},error:null}}},getSession:async()=>({data:{session:{user:{id:ME,email:"teste@clinica.com"}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})}};
window.supabase={createClient:()=>client};
})();
