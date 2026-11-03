/* Vincla — Jogos para usar na sessão (tablet com a criança).
   Regras de desenho: sem cronômetro, sem piscar, sem punição; toques grandes;
   som só se a terapeuta ligar; fim de rodada com registro opcional na evolução. */
"use strict";

const JG = {
  itens: [
    { id:"sol",     nome:"sol",     cat:"natureza",     svg:'<circle cx="50" cy="50" r="22" fill="#F5B83D"/><g stroke="#F5B83D" stroke-width="6" stroke-linecap="round"><line x1="50" y1="8" x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="92"/><line x1="8" y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="92" y2="50"/><line x1="20" y1="20" x2="28" y2="28"/><line x1="72" y1="72" x2="80" y2="80"/><line x1="80" y1="20" x2="72" y2="28"/><line x1="28" y1="72" x2="20" y2="80"/></g>' },
    { id:"casa",    nome:"casa",    cat:"objeto",   svg:'<path d="M15 52 L50 20 L85 52 Z" fill="#E07B5A"/><rect x="24" y="52" width="52" height="36" fill="#F2D6B3"/><rect x="43" y="64" width="14" height="24" fill="#8C5A3C"/>' },
    { id:"bola",    nome:"bola",    cat:"brinquedo",svg:'<circle cx="50" cy="50" r="34" fill="#3B6FD8"/><path d="M22 36 Q50 50 78 36" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M22 64 Q50 50 78 64" fill="none" stroke="#FFFFFF" stroke-width="6"/>' },
    { id:"carro",   nome:"carro",   cat:"brinquedo",svg:'<rect x="12" y="46" width="76" height="24" rx="8" fill="#D94A4A"/><path d="M26 46 L36 30 L64 30 L74 46 Z" fill="#F08A8A"/><circle cx="30" cy="72" r="9" fill="#12233D"/><circle cx="70" cy="72" r="9" fill="#12233D"/>' },
    { id:"maca",    nome:"maçã",    cat:"comida",   svg:'<circle cx="42" cy="56" r="24" fill="#D9413A"/><circle cx="58" cy="56" r="24" fill="#D9413A"/><rect x="48" y="24" width="5" height="16" fill="#6B4A2B"/><path d="M53 30 Q66 20 70 32 Q58 36 53 30Z" fill="#5CC8A8"/>' },
    { id:"estrela", nome:"estrela", cat:"natureza", svg:'<polygon points="50,12 61,38 89,40 67,58 74,86 50,71 26,86 33,58 11,40 39,38" fill="#F5B83D"/>' },
    { id:"peixe",   nome:"peixe",   cat:"animal",   svg:'<ellipse cx="46" cy="52" rx="30" ry="18" fill="#5CC8A8"/><polygon points="72,52 92,36 92,68" fill="#3FA98C"/><circle cx="34" cy="48" r="4" fill="#12233D"/>' },
    { id:"flor",    nome:"flor",    cat:"natureza", svg:'<g fill="#C97BD1"><circle cx="50" cy="26" r="12"/><circle cx="74" cy="44" r="12"/><circle cx="66" cy="72" r="12"/><circle cx="34" cy="72" r="12"/><circle cx="26" cy="44" r="12"/></g><circle cx="50" cy="52" r="12" fill="#F5B83D"/>' },
    { id:"arvore",  nome:"árvore",  cat:"natureza", svg:'<rect x="44" y="58" width="12" height="30" fill="#8C5A3C"/><circle cx="50" cy="44" r="26" fill="#3FA98C"/><circle cx="32" cy="54" r="16" fill="#5CC8A8"/><circle cx="68" cy="54" r="16" fill="#5CC8A8"/>' },
    { id:"lua",     nome:"lua",     cat:"natureza", svg:'<path d="M60 14 A36 36 0 1 0 60 86 A28 28 0 1 1 60 14Z" fill="#F5D77A"/>' },
    { id:"gato",    nome:"gato",    cat:"animal",   svg:'<circle cx="50" cy="56" r="28" fill="#A8A29E"/><polygon points="26,40 30,14 46,34" fill="#A8A29E"/><polygon points="74,40 70,14 54,34" fill="#A8A29E"/><circle cx="40" cy="54" r="4" fill="#12233D"/><circle cx="60" cy="54" r="4" fill="#12233D"/><path d="M44 66 Q50 72 56 66" fill="none" stroke="#12233D" stroke-width="3"/>' },
    { id:"copo",    nome:"copo",    cat:"objeto",   svg:'<path d="M30 20 L70 20 L64 84 L36 84 Z" fill="#CDE7F5"/><path d="M33 48 L67 48 L64 84 L36 84 Z" fill="#3B6FD8"/>' },
    { id:"banana",  nome:"banana",  cat:"comida",   svg:'<path d="M22 40 Q40 86 80 70 Q86 64 78 62 Q46 72 30 36 Z" fill="#F5D34A"/><path d="M22 40 L26 32 L32 36" fill="#8C5A3C"/>' },
    { id:"pao",     nome:"pão",     cat:"comida",   svg:'<ellipse cx="50" cy="56" rx="34" ry="22" fill="#E0A458"/><path d="M28 50 Q40 42 50 50 Q60 42 72 50" fill="none" stroke="#B5783A" stroke-width="4" stroke-linecap="round"/>' },
    { id:"cachorro",nome:"cachorro",cat:"animal",   svg:'<circle cx="50" cy="56" r="28" fill="#C58B5A"/><ellipse cx="24" cy="48" rx="10" ry="18" fill="#8C5A3C"/><ellipse cx="76" cy="48" rx="10" ry="18" fill="#8C5A3C"/><circle cx="40" cy="52" r="4" fill="#12233D"/><circle cx="60" cy="52" r="4" fill="#12233D"/><ellipse cx="50" cy="66" rx="7" ry="5" fill="#12233D"/>' },
    { id:"passaro", nome:"pássaro", cat:"animal",   svg:'<ellipse cx="48" cy="56" rx="26" ry="20" fill="#3B6FD8"/><circle cx="68" cy="42" r="12" fill="#3B6FD8"/><polygon points="78,42 92,46 78,50" fill="#F5B83D"/><circle cx="70" cy="40" r="3" fill="#12233D"/><path d="M30 50 Q44 36 56 50" fill="#5CC8A8"/>' },
    { id:"urso",    nome:"urso",    cat:"brinquedo",svg:'<circle cx="30" cy="30" r="12" fill="#8C5A3C"/><circle cx="70" cy="30" r="12" fill="#8C5A3C"/><circle cx="50" cy="54" r="32" fill="#A8704A"/><circle cx="40" cy="48" r="4" fill="#12233D"/><circle cx="60" cy="48" r="4" fill="#12233D"/><ellipse cx="50" cy="66" rx="12" ry="9" fill="#D9B38C"/><circle cx="50" cy="62" r="4" fill="#12233D"/>' },
    { id:"cubo",    nome:"cubo",    cat:"brinquedo",svg:'<rect x="24" y="30" width="44" height="44" fill="#D94A4A"/><polygon points="24,30 36,18 80,18 68,30" fill="#F08A8A"/><polygon points="68,30 80,18 80,62 68,74" fill="#A83232"/>' },
    { id:"cadeira", nome:"cadeira", cat:"objeto",   svg:'<rect x="30" y="18" width="10" height="60" fill="#8C5A3C"/><rect x="30" y="18" width="40" height="8" fill="#8C5A3C"/><rect x="26" y="52" width="48" height="10" fill="#A8704A"/><rect x="64" y="56" width="8" height="26" fill="#8C5A3C"/><rect x="28" y="56" width="8" height="26" fill="#8C5A3C"/>' },
    { id:"chave",   nome:"chave",   cat:"objeto",   svg:'<circle cx="34" cy="40" r="18" fill="none" stroke="#F5B83D" stroke-width="10"/><rect x="46" y="36" width="42" height="9" fill="#F5B83D"/><rect x="72" y="45" width="7" height="12" fill="#F5B83D"/><rect x="60" y="45" width="7" height="9" fill="#F5B83D"/>' },
  ],
  rotinas: [
    { nome:"De manhã", passos:[
      { id:"acordar", nome:"acordar", svg:'<rect x="14" y="48" width="72" height="26" rx="6" fill="#8C5A3C"/><rect x="20" y="40" width="60" height="16" rx="6" fill="#CDE7F5"/><circle cx="76" cy="26" r="10" fill="#F5B83D"/>' },
      { id:"dentes",  nome:"escovar os dentes", svg:'<rect x="20" y="40" width="56" height="14" rx="7" fill="#3B6FD8"/><rect x="60" y="30" width="22" height="24" rx="4" fill="#FFFFFF" stroke="#12233D" stroke-width="3"/><g stroke="#12233D" stroke-width="2"><line x1="66" y1="32" x2="66" y2="52"/><line x1="72" y1="32" x2="72" y2="52"/><line x1="78" y1="32" x2="78" y2="52"/></g>' },
      { id:"cafe",    nome:"tomar café", svg:'<circle cx="50" cy="60" r="28" fill="#FFFFFF" stroke="#D6E2E8" stroke-width="4"/><circle cx="50" cy="60" r="18" fill="#E0A458"/><circle cx="46" cy="56" r="6" fill="#D9413A"/>' },
      { id:"escola",  nome:"ir para a escola", svg:'<rect x="26" y="26" width="48" height="56" rx="10" fill="#3FA98C"/><rect x="36" y="46" width="28" height="22" rx="4" fill="#5CC8A8"/><path d="M38 26 Q50 10 62 26" fill="none" stroke="#12233D" stroke-width="6"/>' } ] },
    { nome:"À noite", passos:[
      { id:"banho",   nome:"tomar banho", svg:'<path d="M20 50 L80 50 L74 80 L26 80 Z" fill="#CDE7F5"/><rect x="22" y="44" width="56" height="8" rx="4" fill="#3B6FD8"/><circle cx="36" cy="30" r="5" fill="#3B6FD8"/><circle cx="50" cy="22" r="5" fill="#3B6FD8"/><circle cx="64" cy="30" r="5" fill="#3B6FD8"/>' },
      { id:"pijama",  nome:"vestir o pijama", svg:'<path d="M30 24 L44 18 L50 26 L56 18 L70 24 L78 40 L66 44 L66 82 L34 82 L34 44 L22 40 Z" fill="#C97BD1"/><circle cx="50" cy="48" r="4" fill="#FFFFFF"/><circle cx="50" cy="62" r="4" fill="#FFFFFF"/>' },
      { id:"dentes2", nome:"escovar os dentes", svg:'<rect x="20" y="40" width="56" height="14" rx="7" fill="#3B6FD8"/><rect x="60" y="30" width="22" height="24" rx="4" fill="#FFFFFF" stroke="#12233D" stroke-width="3"/><g stroke="#12233D" stroke-width="2"><line x1="66" y1="32" x2="66" y2="52"/><line x1="72" y1="32" x2="72" y2="52"/><line x1="78" y1="32" x2="78" y2="52"/></g>' },
      { id:"dormir",  nome:"dormir", svg:'<rect x="14" y="48" width="72" height="26" rx="6" fill="#8C5A3C"/><rect x="20" y="40" width="60" height="16" rx="6" fill="#CDE7F5"/><path d="M76 14 A12 12 0 1 0 76 38 A9 9 0 1 1 76 14Z" fill="#F5D77A"/>' } ] },
  ],
  pedidos: [
    { id:"agua",     nome:"água",     frase:"Eu quero água",      svg:'<path d="M30 20 L70 20 L64 84 L36 84 Z" fill="#CDE7F5"/><path d="M33 48 L67 48 L64 84 L36 84 Z" fill="#3B6FD8"/>' },
    { id:"comer",    nome:"comer",    frase:"Eu quero comer",     svg:'<circle cx="42" cy="56" r="24" fill="#D9413A"/><circle cx="58" cy="56" r="24" fill="#D9413A"/><rect x="48" y="24" width="5" height="16" fill="#6B4A2B"/>' },
    { id:"banheiro", nome:"banheiro", frase:"Eu quero ir ao banheiro", svg:'<rect x="34" y="20" width="32" height="30" rx="6" fill="#FFFFFF" stroke="#12233D" stroke-width="4"/><ellipse cx="50" cy="66" rx="26" ry="14" fill="#FFFFFF" stroke="#12233D" stroke-width="4"/><rect x="40" y="76" width="20" height="10" fill="#12233D"/>' },
    { id:"pausa",    nome:"pausa",    frase:"Eu preciso de uma pausa", svg:'<rect x="26" y="22" width="16" height="56" rx="5" fill="#12233D"/><rect x="58" y="22" width="16" height="56" rx="5" fill="#12233D"/>' },
    { id:"ajuda",    nome:"ajuda",    frase:"Eu preciso de ajuda",  svg:'<path d="M30 60 L30 36 Q30 28 38 28 L38 60 M44 56 L44 24 Q44 16 52 16 L52 56 M58 56 L58 26 Q58 18 66 18 L66 58 M72 60 L72 34 Q72 26 80 26 L80 64 Q80 88 56 88 L46 88 Q34 88 30 76 Z" fill="#F7D9B5" stroke="#C58B5A" stroke-width="3"/>' },
    { id:"brincar",  nome:"brincar",  frase:"Eu quero brincar",    svg:'<circle cx="50" cy="50" r="34" fill="#3B6FD8"/><path d="M22 36 Q50 50 78 36" fill="none" stroke="#FFFFFF" stroke-width="6"/><path d="M22 64 Q50 50 78 64" fill="none" stroke="#FFFFFF" stroke-width="6"/>' },
    { id:"mae",      nome:"mãe/pai",  frase:"Eu quero a mamãe ou o papai", svg:'<circle cx="34" cy="34" r="12" fill="#F7D9B5"/><path d="M14 86 Q14 50 34 50 Q54 50 54 86 Z" fill="#C97BD1"/><circle cx="70" cy="50" r="9" fill="#F7D9B5"/><path d="M56 86 Q56 62 70 62 Q84 62 84 86 Z" fill="#5CC8A8"/>' },
    { id:"abraco",   nome:"abraço",   frase:"Eu quero um abraço",  svg:'<path d="M50 84 L22 56 Q10 44 22 32 Q34 22 50 38 Q66 22 78 32 Q90 44 78 56 Z" fill="#E07B5A"/>' },
    { id:"sim",      nome:"sim",      frase:"Sim",                 svg:'<path d="M24 52 L42 70 L78 30" fill="none" stroke="#1F7A62" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id:"nao",      nome:"não",      frase:"Não",                 svg:'<path d="M28 28 L72 72 M72 28 L28 72" stroke="#B42318" stroke-width="12" stroke-linecap="round"/>' },
    { id:"acabou",   nome:"acabou",   frase:"Acabou, quero parar", svg:'<rect x="22" y="22" width="56" height="56" rx="10" fill="#12233D"/>' },
    { id:"dor",      nome:"dói",      frase:"Está doendo",         svg:'<circle cx="50" cy="52" r="34" fill="#F7D9B5"/><path d="M34 44 L46 50 M66 44 L54 50" stroke="#12233D" stroke-width="5" stroke-linecap="round"/><path d="M36 70 Q50 60 64 70" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/><polygon points="80,16 92,36 70,36" fill="#D9413A"/>' },
  ],
  formas: [["#3B6FD8","circulo"],["#D9413A","quadrado"],["#F5B83D","triangulo"],["#3FA98C","circulo"]],
  emocoes: [
    { id:"feliz",     nome:"feliz",     boca:'<path d="M34 60 Q50 76 66 60" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>', olhos:'<circle cx="38" cy="44" r="5" fill="#12233D"/><circle cx="62" cy="44" r="5" fill="#12233D"/>' },
    { id:"triste",    nome:"triste",    boca:'<path d="M34 70 Q50 56 66 70" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>', olhos:'<circle cx="38" cy="44" r="5" fill="#12233D"/><circle cx="62" cy="44" r="5" fill="#12233D"/><path d="M66 52 q4 8 0 12" stroke="#3B6FD8" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id:"bravo",     nome:"bravo",     boca:'<path d="M36 68 L64 68" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>', olhos:'<circle cx="38" cy="46" r="5" fill="#12233D"/><circle cx="62" cy="46" r="5" fill="#12233D"/><path d="M28 34 L44 40 M72 34 L56 40" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>' },
    { id:"surpreso",  nome:"surpreso",  boca:'<ellipse cx="50" cy="66" rx="8" ry="11" fill="#12233D"/>', olhos:'<circle cx="38" cy="44" r="7" fill="#12233D"/><circle cx="62" cy="44" r="7" fill="#12233D"/>' },
    { id:"calmo",     nome:"calmo",     boca:'<path d="M38 64 Q50 68 62 64" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>', olhos:'<path d="M30 44 Q38 38 46 44 M54 44 Q62 38 70 44" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>' },
    { id:"medo",      nome:"com medo",  boca:'<path d="M36 68 Q43 62 50 68 Q57 74 64 68" fill="none" stroke="#12233D" stroke-width="5" stroke-linecap="round"/>', olhos:'<circle cx="38" cy="44" r="7" fill="#12233D"/><circle cx="62" cy="44" r="7" fill="#12233D"/><circle cx="38" cy="44" r="3" fill="#fff"/><circle cx="62" cy="44" r="3" fill="#fff"/>' },
  ],
  cores: [["#3B6FD8","azul"],["#D9413A","vermelho"],["#F5B83D","amarelo"],["#3FA98C","verde"]],
  som: false, jogo: null, pid: null,
};

function jgSvg(item, size){ return `<svg viewBox="0 0 100 100" width="${size||120}" height="${size||120}" aria-hidden="true">${item.svg}</svg>`; }
function jgRosto(e, size){ return `<svg viewBox="0 0 100 100" width="${size||120}" height="${size||120}" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="#F7D9B5"/>${e.olhos}${e.boca}</svg>`; }
function jgEmbaralha(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function jgFalar(txt){ if(!JG.som||!("speechSynthesis" in window)) return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(txt); u.lang="pt-BR"; u.rate=0.9; speechSynthesis.speak(u);}catch{} }

/* ---------- aba ---------- */
function vJogos(){
  const hojeSes=S.ses.filter(s=>s.data===hoje()&&s.status!=="desmarcada"&&(isEquipe()||s.profissional_id===meuId()));
  const pacs=[...new Map(hojeSes.map(s=>[s.paciente_id,pacById(s.paciente_id)])).values()].filter(Boolean).sort(byNome);
  if(JG.jogo) return vJogoAtivo();
  return `<div><div class="eyebrow">Para usar na sessão, no tablet</div><h2>Jogos</h2></div>
  <p class="note">Sem cronômetro, sem pontuação negativa e sem efeitos que piscam. A criança toca; a terapeuta conduz. No fim de cada rodada dá para anotar o resultado direto na evolução de hoje.</p>
  <div class="toolbar">
    <div class="filtro"><label for="jgPac">Criança de hoje</label><select id="jgPac" data-change="jgPac"><option value="">Sem registrar</option>${pacs.map(p=>`<option value="${p.id}" ${JG.pid===p.id?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div>
    <label class="btn" style="cursor:pointer"><input type="checkbox" id="jgSom" ${JG.som?"checked":""} style="margin-right:6px">Falar as palavras</label>
  </div>
  <div class="grid3">
    <button class="jgCard" data-act="jgAbrir" data-v="pares"><div class="jgIco">${jgSvg(JG.itens[5],56)}${jgSvg(JG.itens[5],56)}</div><b>Pares</b><span>Memória e atenção. Vire duas cartas e ache a dupla.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="qual"><div class="jgIco">${jgSvg(JG.itens[2],56)}${jgSvg(JG.itens[4],56)}${jgSvg(JG.itens[0],56)}</div><b>Qual é?</b><span>Compreensão e vocabulário. Ouça a palavra e toque na figura certa.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="emocoes"><div class="jgIco">${jgRosto(JG.emocoes[0],56)}${jgRosto(JG.emocoes[1],56)}</div><b>Emoções</b><span>Reconhecer expressões. Toque no rosto que mostra a emoção.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="turnos"><div class="jgIco"><span class="jgPad" style="background:#3B6FD8"></span><span class="jgPad" style="background:#F5B83D"></span></div><b>Minha vez, sua vez</b><span>Troca de turnos e sequência. Repita a ordem das cores.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="rotina"><div class="jgIco">${jgSvg(JG.rotinas[0].passos[0],56)}<span class="note">→</span>${jgSvg(JG.rotinas[0].passos[1],56)}</div><b>Primeiro, depois</b><span>Rotina visual. Coloque os passos do dia na ordem.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="separar"><div class="jgIco">${jgSvg(JG.itens[4],56)}${jgSvg(JG.itens[10],56)}</div><b>Separar</b><span>Classificar. Leve cada figura para a cesta certa.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="ache"><div class="jgIco">${jgSvg(JG.itens[6],44)}${jgSvg(JG.itens[7],44)}${jgSvg(JG.itens[6],44)}</div><b>Ache!</b><span>Atenção visual. Encontre todas as figuras iguais no quadro.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="padrao"><div class="jgIco"><span class="jgPad" style="background:#3B6FD8"></span><span class="jgPad" style="background:#D9413A"></span><span class="jgPad" style="background:#3B6FD8"></span><span class="jgPad" style="background:var(--sunk)"></span></div><b>O que vem depois?</b><span>Padrões e lógica. Complete a sequência.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="quero"><div class="jgIco">${jgSvg(JG.pedidos[0],56)}${jgSvg(JG.pedidos[4],56)}</div><b>Eu quero</b><span>Comunicação. A criança toca no que precisa e o tablet fala por ela.</span></button>
    <button class="jgCard" data-act="jgAbrir" data-v="respirar"><div class="jgIco"><span class="jgPad" style="background:var(--glow);border-radius:50%;width:52px;height:52px"></span></div><b>Respirar</b><span>Autorregulação. Cinco respirações guiadas para acalmar.</span></button>
  </div>
  <p class="note">Dica: no tablet, toque em "Tela cheia" dentro do jogo para esconder o resto do app.</p>`;
}

function jgIniciar(tipo){
  const base={tipo,acertos:0,tentativas:0,rodada:0,ini:Date.now(),fim:false};
  if(tipo==="pares"){ const n=6; const its=jgEmbaralha(JG.itens).slice(0,n); const cartas=jgEmbaralha(its.concat(its).map((it,i)=>({k:i,it,aberta:false,feita:false}))); Object.assign(base,{cartas,aberta:null,trava:false,total:n}); }
  if(tipo==="qual"){ Object.assign(base,{total:8}); jgNovaQual(base); }
  if(tipo==="emocoes"){ Object.assign(base,{total:6}); jgNovaEmo(base); }
  if(tipo==="turnos"){ Object.assign(base,{total:5,seq:[],mostrando:false,entrada:[]}); jgNovoTurno(base); }
  if(tipo==="rotina"){ Object.assign(base,{total:JG.rotinas.length}); jgNovaRotina(base); }
  if(tipo==="separar"){ Object.assign(base,{total:3}); jgNovaSep(base); }
  if(tipo==="ache"){ Object.assign(base,{total:5}); jgNovoAche(base); }
  if(tipo==="padrao"){ Object.assign(base,{total:6}); jgNovoPadrao(base); }
  if(tipo==="quero"){ Object.assign(base,{total:1,usados:[],atual:null}); }
  if(tipo==="respirar"){ Object.assign(base,{total:5,fase:"pronto",ciclo:0}); }
  JG.jogo=base; render();
  if(tipo==="qual") setTimeout(()=>jgFalar(JG.jogo.alvo.nome),300);
  if(tipo==="emocoes") setTimeout(()=>jgFalar(JG.jogo.alvo.nome),300);
  if(tipo==="turnos") setTimeout(jgMostrarSeq,400);
}
function jgNovaQual(g){ const ops=jgEmbaralha(JG.itens).slice(0,3); g.opcoes=ops; g.alvo=ops[Math.floor(Math.random()*3)]; g.feedback=null; }
function jgNovaEmo(g){ const ops=jgEmbaralha(JG.emocoes).slice(0,3); g.opcoes=ops; g.alvo=ops[Math.floor(Math.random()*3)]; g.feedback=null; }
function jgNovoTurno(g){ g.seq.push(Math.floor(Math.random()*4)); g.entrada=[]; g.feedback=null; }
function jgNovaRotina(g){ const r=JG.rotinas[g.rodada%JG.rotinas.length]; g.rotina=r; g.ordem=r.passos; g.disp=jgEmbaralha(r.passos); g.pos=0; g.feedback=null; }
const JG_CATS={comida:"comida",animal:"animais",brinquedo:"brinquedos",objeto:"coisas da casa",natureza:"natureza"};
function jgNovaSep(g){ const cats=jgEmbaralha(Object.keys(JG_CATS)).slice(0,2); const its=jgEmbaralha(JG.itens.filter(i=>cats.includes(i.cat))); const pick=[];for(const c of cats){pick.push(...its.filter(i=>i.cat===c).slice(0,3))} g.cats=cats; g.restantes=jgEmbaralha(pick); g.sel=null; g.feitos=[]; g.feedback=null; }
function jgNovoAche(g){ const its=jgEmbaralha(JG.itens); const alvo=its[0]; const k=3; const grade=[]; for(let i=0;i<16;i++)grade.push(i<k?alvo:its[1+(i%6)]); g.alvo=alvo; g.k=k; g.grade=jgEmbaralha(grade); g.achados=[]; g.feedback=null; }
function jgNovoPadrao(g){ const [a,b,c]=jgEmbaralha([0,1,2,3]); const tipo=g.rodada<3?[a,b,a,b,a]:[a,b,c,a,b]; const resp=g.rodada<3?b:c; g.seq=tipo; g.resp=resp; g.opcoes=jgEmbaralha([...new Set([resp,a,c===resp?b:c])]).slice(0,3); if(!g.opcoes.includes(resp))g.opcoes[0]=resp; g.feedback=null; }
function jgForma(i,size){ const [cor,tipo]=JG.formas[i]; const s=size||60; const inner=tipo==="quadrado"?`<rect x="18" y="18" width="64" height="64" rx="10" fill="${cor}"/>`:tipo==="triangulo"?`<polygon points="50,14 88,84 12,84" fill="${cor}"/>`:`<circle cx="50" cy="50" r="34" fill="${cor}"/>`; return `<svg viewBox="0 0 100 100" width="${s}" height="${s}" aria-hidden="true">${inner}</svg>`; }
function jgMostrarSeq(){
  const g=JG.jogo; if(!g||g.tipo!=="turnos") return; g.mostrando=true; render();
  g.seq.forEach((c,i)=>{ setTimeout(()=>{ const el=document.querySelector(`[data-pad="${c}"]`); if(el){ el.classList.add("on"); setTimeout(()=>el.classList.remove("on"),500);} },600*i+200); });
  setTimeout(()=>{ g.mostrando=false; render(); },600*g.seq.length+500);
}

function vJogoAtivo(){
  const g=JG.jogo;
  const topo=`<div class="toolbar" style="justify-content:space-between"><button class="btn" data-act="jgSair">← Jogos</button><div class="toolbar"><span class="note">Rodada ${Math.min(g.rodada+1,g.total)} de ${g.total}</span><button class="btn" data-act="jgTela">Tela cheia</button></div></div>`;
  if(g.fim) return topo+vJogoFim(g);
  if(g.tipo==="pares"){
    return topo+`<h2 style="text-align:center">Ache os pares</h2><div class="jgGrid4">${g.cartas.map((c,i)=>`<button class="jgCarta ${c.aberta||c.feita?"aberta":""} ${c.feita?"feita":""}" data-act="jgCarta" data-i="${i}" ${c.feita?"disabled":""} aria-label="carta">${c.aberta||c.feita?jgSvg(c.it,88):'<span class="jgVerso"></span>'}</button>`).join("")}</div>`;
  }
  if(g.tipo==="qual"||g.tipo==="emocoes"){
    const emo=g.tipo==="emocoes";
    return topo+`<div style="text-align:center"><div class="eyebrow">${emo?"Quem está":"Toque"}</div><h2 style="font-size:40px">${esc(emo?g.alvo.nome:"no "+g.alvo.nome)}</h2><button class="btn" data-act="jgOuvir" style="margin-top:6px">Ouvir de novo</button></div>
    <div class="jgOpcoes">${g.opcoes.map(o=>`<button class="jgOpc ${g.feedback&&o.id===g.alvo.id?"certa":""} ${g.feedback==="erro"&&o.id===g.ultimo?"errada":""}" data-act="jgOpc" data-id="${o.id}" ${g.feedback?"disabled":""} aria-label="${esc(o.nome)}">${emo?jgRosto(o,150):jgSvg(o,150)}</button>`).join("")}</div>
    ${g.feedback==="acerto"?`<div class="jgMsg ok">Isso! ${esc(g.alvo.nome)}.</div>`:g.feedback==="erro"?`<div class="jgMsg">Vamos de novo: ${esc(emo?"quem está "+g.alvo.nome:"toque no "+g.alvo.nome)}.</div>`:""}`;
  }
  if(g.tipo==="turnos"){
    return topo+`<div style="text-align:center"><div class="eyebrow">${g.mostrando?"Minha vez":"Sua vez"}</div><h2 style="font-size:36px">${g.mostrando?"Olhe a ordem":"Repita a ordem"}</h2><p class="note">${g.seq.length} ${g.seq.length===1?"cor":"cores"}</p></div>
    <div class="jgPads">${JG.cores.map((c,i)=>`<button class="jgPadBig" data-act="jgPad" data-pad="${i}" style="background:${c[0]}" aria-label="${c[1]}" ${g.mostrando||g.feedback?"disabled":""}></button>`).join("")}</div>
    ${g.feedback==="acerto"?'<div class="jgMsg ok">Muito bem! Vamos de novo.</div>':g.feedback==="erro"?'<div class="jgMsg">Quase. Olhe de novo.</div>':""}`;
  }
  if(g.tipo==="rotina"){
    return topo+`<div style="text-align:center"><div class="eyebrow">${esc(g.rotina.nome)}</div><h2 style="font-size:32px">O que vem primeiro?</h2></div>
    <div class="jgTrilha">${g.ordem.map((p,i)=>`<div class="jgSlot ${i<g.pos?"cheio":""} ${i===g.pos?"vez":""}">${i<g.pos?jgSvg(p,80)+`<span>${esc(p.nome)}</span>`:`<span class="note">${i+1}º</span>`}</div>`).join("")}</div>
    <div class="jgOpcoes" style="grid-template-columns:repeat(4,1fr)">${g.disp.map(p=>{const feito=g.ordem.indexOf(p)<g.pos;return`<button class="jgOpc ${feito?"errada":""}" data-act="jgPasso" data-id="${p.id}" ${feito||g.feedback?"disabled":""} aria-label="${esc(p.nome)}">${jgSvg(p,110)}<span class="jgLeg">${esc(p.nome)}</span></button>`}).join("")}</div>
    ${g.feedback==="acerto"?'<div class="jgMsg ok">Isso! Agora, o que vem depois?</div>':g.feedback==="erro"?'<div class="jgMsg">Quase. Pense no que vem antes.</div>':g.feedback==="fim"?'<div class="jgMsg ok">Rotina completa!</div>':""}`;
  }
  if(g.tipo==="separar"){
    const sel=g.sel;
    return topo+`<div style="text-align:center"><div class="eyebrow">${sel?"Agora toque na cesta":"Toque numa figura"}</div><h2 style="font-size:32px">Onde fica?</h2></div>
    <div class="jgCestas">${g.cats.map(c=>`<button class="jgCesta ${g.feedback==="erro"&&c===g.ultimo?"errada":""}" data-act="jgCesta" data-c="${c}" ${!sel||g.feedback?"disabled":""}><b>${esc(JG_CATS[c])}</b><div class="jgIco">${g.feitos.filter(i=>i.cat===c).map(i=>jgSvg(i,40)).join("")}</div></button>`).join("")}</div>
    <div class="jgOpcoes" style="grid-template-columns:repeat(3,1fr)">${g.restantes.map(i=>`<button class="jgOpc ${sel&&sel.id===i.id?"certa":""}" data-act="jgSel" data-id="${i.id}" ${g.feedback?"disabled":""} aria-label="${esc(i.nome)}">${jgSvg(i,110)}</button>`).join("")}</div>
    ${g.feedback==="acerto"?'<div class="jgMsg ok">Isso!</div>':g.feedback==="erro"?`<div class="jgMsg">Hmm, ${esc(sel?sel.nome:"")} não é ${esc(JG_CATS[g.ultimo]||"")}. Tente outra cesta.</div>`:""}`;
  }
  if(g.tipo==="ache"){
    return topo+`<div style="text-align:center"><div class="eyebrow">Encontre</div><h2 style="font-size:32px;display:flex;align-items:center;justify-content:center;gap:10px">${jgSvg(g.alvo,48)} ${g.k} ${esc(g.alvo.nome)}${g.k>1?"s":""} <span class="note">(${g.achados.length} de ${g.k})</span></h2></div>
    <div class="jgGrid4" style="max-width:520px">${g.grade.map((it,i)=>`<button class="jgCarta aberta ${g.achados.includes(i)?"feita":""}" data-act="jgAche" data-i="${i}" ${g.achados.includes(i)||g.feedback==="fim"?"disabled":""} aria-label="${esc(it.nome)}">${jgSvg(it,70)}</button>`).join("")}</div>
    ${g.feedback==="fim"?'<div class="jgMsg ok">Achou todos!</div>':g.feedback==="erro"?`<div class="jgMsg">Esse é ${esc(g.ultimoNome||"")}. Procure ${esc(g.alvo.nome)}.</div>`:""}`;
  }
  if(g.tipo==="padrao"){
    return topo+`<div style="text-align:center"><div class="eyebrow">Padrão</div><h2 style="font-size:32px">O que vem depois?</h2></div>
    <div class="jgTrilha">${g.seq.map(i=>`<div class="jgSlot cheio">${jgForma(i,72)}</div>`).join("")}<div class="jgSlot vez">${g.feedback==="acerto"?jgForma(g.resp,72):'<span class="note" style="font-size:32px">?</span>'}</div></div>
    <div class="jgOpcoes" style="max-width:520px">${g.opcoes.map(i=>`<button class="jgOpc ${g.feedback&&i===g.resp?"certa":""} ${g.feedback==="erro"&&i===g.ultimo?"errada":""}" data-act="jgPadrao" data-i="${i}" ${g.feedback?"disabled":""} aria-label="${JG.formas[i][1]}">${jgForma(i,120)}</button>`).join("")}</div>
    ${g.feedback==="acerto"?'<div class="jgMsg ok">Isso!</div>':g.feedback==="erro"?'<div class="jgMsg">Olhe a ordem de novo.</div>':""}`;
  }
  if(g.tipo==="quero"){
    return topo+`<div style="text-align:center"><div class="eyebrow">A criança toca; o tablet fala</div><h2 style="font-size:32px">${g.atual?esc(g.atual.frase):"O que você quer?"}</h2>${!JG.som?'<p class="note">Ligue "Falar as palavras" na tela dos jogos para o tablet falar.</p>':""}</div>
    <div class="jgOpcoes" style="grid-template-columns:repeat(4,1fr);max-width:760px">${JG.pedidos.map(p=>`<button class="jgOpc jgPedido ${g.atual&&g.atual.id===p.id?"certa":""}" data-act="jgPedir" data-id="${p.id}" aria-label="${esc(p.frase)}">${jgSvg(p,96)}<span class="jgLeg">${esc(p.nome)}</span></button>`).join("")}</div>
    <div class="toolbar" style="justify-content:center"><button class="btn primary" data-act="jgQueroFim">Terminar</button></div>`;
  }
  if(g.tipo==="respirar"){
    const txt={pronto:"Vamos respirar juntos",inspira:"Inspira pelo nariz…",segura:"Segura…",solta:"Solta devagar…",fim:"Pronto. Como você está?"}[g.fase];
    return topo+`<div style="text-align:center"><div class="eyebrow">${g.ciclo} de ${g.total} respirações</div><h2 style="font-size:32px">${txt}</h2></div>
    <div class="jgResp"><div class="jgBolha ${g.fase}" id="jgBolha"></div></div>
    <div class="toolbar" style="justify-content:center">${g.fase==="pronto"?'<button class="btn primary big" data-act="jgRespStart">Começar</button>':g.fase==="fim"?'<button class="btn" data-act="jgRespStart">De novo</button>':'<button class="btn" data-act="jgRespStop">Parar</button>'}</div>`;
  }
  return topo;
}
function vJogoFim(g){
  const min=Math.max(1,Math.round((Date.now()-g.ini)/60000));
  const resumo=jgResumo(g,min);
  const p=JG.pid?pacById(JG.pid):null;
  return `<div class="empty" style="gap:14px"><strong style="font-size:24px">Rodada completa</strong><span style="font-size:17px">${esc(resumo)}</span>
    <div class="toolbar" style="justify-content:center">${p?`<button class="btn primary" data-act="jgRegistrar">Registrar na evolução de ${esc(first(p.nome))}</button>`:'<span class="note">Escolha a criança na tela dos jogos para registrar na evolução.</span>'}<button class="btn" data-act="jgAbrir" data-v="${g.tipo}">Jogar de novo</button><button class="btn" data-act="jgSair">Outro jogo</button></div></div>`;
}

const JG_NOMES={pares:"Pares",qual:"Qual é?",emocoes:"Emoções",turnos:"Minha vez, sua vez",rotina:"Primeiro, depois",separar:"Separar",ache:"Ache!",padrao:"O que vem depois?",quero:"Eu quero",respirar:"Respirar"};
function jgResumo(g,min){
  if(g.tipo==="quero")return `Eu quero: pediu ${g.usados.length?g.usados.map(u=>'"'+u+'"').join(", "):"nada"} (${min} min).`;
  if(g.tipo==="respirar")return `Respirar: ${g.ciclo} ${g.ciclo===1?"respiração guiada":"respirações guiadas"} (${min} min).`;
  return `${JG_NOMES[g.tipo]}: ${g.acertos} ${g.acertos===1?"acerto":"acertos"} em ${g.tentativas} ${g.tentativas===1?"tentativa":"tentativas"}, cerca de ${min} min.`;
}
async function jgRegistrar(){
  const g=JG.jogo,p=pacById(JG.pid); if(!g||!p) return;
  const ses=S.ses.filter(s=>s.paciente_id===p.id&&s.data===hoje()&&s.status!=="desmarcada"&&(isEquipe()||s.profissional_id===meuId())).sort((a,b)=>String(a.hora).localeCompare(String(b.hora)))[0];
  if(!ses) return toast("Não há sessão de hoje para essa criança.");
  if(!podeEvolucao(ses)) return toast("Só quem atende pode registrar a evolução.");
  const min=Math.max(1,Math.round((Date.now()-g.ini)/60000));
  const linha="Jogo · "+jgResumo(g,min);
  try{
    const atual=(await run(sb.from("evolucoes").select("atividades").eq("sessao_id",ses.id).maybeSingle()))||{};
    await run(sb.from("evolucoes").upsert({sessao_id:ses.id,atividades:[atual.atividades,linha].filter(Boolean).join("\n")},{onConflict:"sessao_id"}));
    if(ses.status!=="presente") await run(sb.from("sessoes").update({status:"presente"}).eq("id",ses.id));
    toast("Registrado na evolução de hoje"); reload(["evo","ses"]);
  }catch(e){ fail(e); }
}

/* ---------- ações ---------- */
function jgAcao(a,t){
  const g=JG.jogo;
  if(a==="jgAbrir"){ jgIniciar(t.dataset.v); return true; }
  if(a==="jgSair"){ JG.jogo=null; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); render(); return true; }
  if(a==="jgTela"){ const el=document.documentElement; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); else if(el.requestFullscreen) el.requestFullscreen().catch(()=>toast("Tela cheia não disponível neste aparelho.")); return true; }
  if(a==="jgOuvir"){ if(!JG.som) toast('Ligue "Falar as palavras" na tela dos jogos.'); jgFalar(g.alvo.nome); return true; }
  if(a==="jgRegistrar"){ jgRegistrar(); return true; }
  if(!g) return false;
  if(a==="jgCarta"){
    const i=Number(t.dataset.i),c=g.cartas[i]; if(g.trava||c.aberta||c.feita) return true;
    c.aberta=true;
    if(g.aberta==null){ g.aberta=i; render(); return true; }
    g.tentativas++; const o=g.cartas[g.aberta];
    if(o.it.id===c.it.id){ o.feita=c.feita=true; o.aberta=c.aberta=false; g.acertos++; g.rodada++; g.aberta=null; jgFalar(c.it.nome); if(g.acertos>=g.total){ g.fim=true; } render(); }
    else { g.trava=true; render(); setTimeout(()=>{ o.aberta=c.aberta=false; g.aberta=null; g.trava=false; render(); },900); }
    return true;
  }
  if(a==="jgOpc"){
    const id=t.dataset.id; g.tentativas++; g.ultimo=id;
    if(id===g.alvo.id){ g.acertos++; g.rodada++; g.feedback="acerto"; jgFalar("Isso!"); render(); setTimeout(()=>{ if(g.rodada>=g.total){ g.fim=true; render(); return; } (g.tipo==="emocoes"?jgNovaEmo:jgNovaQual)(g); render(); jgFalar(g.alvo.nome); },1100); }
    else { g.feedback="erro"; render(); setTimeout(()=>{ g.feedback=null; render(); jgFalar(g.alvo.nome); },1100); }
    return true;
  }
  if(a==="jgPasso"){
    const p=g.disp.find(x=>x.id===t.dataset.id); g.tentativas++;
    if(p===g.ordem[g.pos]){ g.pos++; g.acertos++; jgFalar(p.nome); if(g.pos>=g.ordem.length){ g.rodada++; g.feedback="fim"; render(); setTimeout(()=>{ if(g.rodada>=g.total){ g.fim=true; render(); return; } jgNovaRotina(g); render(); },1400); } else { g.feedback="acerto"; render(); setTimeout(()=>{ g.feedback=null; render(); },800); } }
    else { g.feedback="erro"; render(); setTimeout(()=>{ g.feedback=null; render(); },1000); }
    return true;
  }
  if(a==="jgSel"){ g.sel=g.restantes.find(x=>x.id===t.dataset.id); jgFalar(g.sel.nome); render(); return true; }
  if(a==="jgCesta"){
    const c=t.dataset.c; if(!g.sel) return true; g.tentativas++; g.ultimo=c;
    if(g.sel.cat===c){ g.acertos++; g.feitos.push(g.sel); g.restantes=g.restantes.filter(x=>x!==g.sel); g.sel=null; g.feedback="acerto"; render(); setTimeout(()=>{ g.feedback=null; if(!g.restantes.length){ g.rodada++; if(g.rodada>=g.total){ g.fim=true; } else jgNovaSep(g); } render(); },700); }
    else { g.feedback="erro"; render(); setTimeout(()=>{ g.feedback=null; render(); },1200); }
    return true;
  }
  if(a==="jgAche"){
    const i=Number(t.dataset.i),it=g.grade[i]; g.tentativas++;
    if(it.id===g.alvo.id){ g.achados.push(i); g.acertos++; if(g.achados.length>=g.k){ g.rodada++; g.feedback="fim"; render(); setTimeout(()=>{ if(g.rodada>=g.total){ g.fim=true; render(); return; } jgNovoAche(g); render(); jgFalar(g.alvo.nome); },1200); } else render(); }
    else { g.ultimoNome=it.nome; g.feedback="erro"; render(); setTimeout(()=>{ g.feedback=null; render(); },1000); }
    return true;
  }
  if(a==="jgPadrao"){
    const i=Number(t.dataset.i); g.tentativas++; g.ultimo=i;
    if(i===g.resp){ g.acertos++; g.rodada++; g.feedback="acerto"; render(); setTimeout(()=>{ if(g.rodada>=g.total){ g.fim=true; render(); return; } jgNovoPadrao(g); render(); },1100); }
    else { g.feedback="erro"; render(); setTimeout(()=>{ g.feedback=null; render(); },1000); }
    return true;
  }
  if(a==="jgPedir"){ const p=JG.pedidos.find(x=>x.id===t.dataset.id); g.atual=p; g.usados.push(p.nome); g.tentativas++; g.acertos++; jgFalar(p.frase); render(); return true; }
  if(a==="jgQueroFim"){ g.fim=true; render(); return true; }
  if(a==="jgRespStart"){ g.ciclo=0; g.fase="inspira"; render(); jgRespCiclo(); return true; }
  if(a==="jgRespStop"){ clearTimeout(JG.respT); g.fase="fim"; g.fim=true; render(); return true; }
  if(a==="jgPad"){
    const c=Number(t.dataset.pad); t.classList.add("on"); setTimeout(()=>t.classList.remove("on"),300);
    g.entrada.push(c); const k=g.entrada.length-1;
    if(g.entrada[k]!==g.seq[k]){ g.tentativas++; g.feedback="erro"; render(); setTimeout(()=>{ g.entrada=[]; g.feedback=null; jgMostrarSeq(); },1100); return true; }
    if(g.entrada.length===g.seq.length){ g.tentativas++; g.acertos++; g.rodada++; g.feedback="acerto"; render(); setTimeout(()=>{ if(g.rodada>=g.total){ g.fim=true; render(); return; } jgNovoTurno(g); jgMostrarSeq(); },1100); }
    return true;
  }
  return false;
}
function jgRespCiclo(){
  const g=JG.jogo; if(!g||g.tipo!=="respirar"||g.fim) return;
  const passo=(fase,ms,next)=>{ g.fase=fase; render(); jgFalar({inspira:"inspira",segura:"segura",solta:"solta"}[fase]); JG.respT=setTimeout(next,ms); };
  passo("inspira",4000,()=>passo("segura",2000,()=>passo("solta",5000,()=>{ g.ciclo++; g.acertos=g.ciclo; g.tentativas=g.ciclo; if(g.ciclo>=g.total){ g.fase="fim"; g.fim=true; render(); } else jgRespCiclo(); })));
}
document.addEventListener("change",e=>{
  if(e.target.id==="jgSom"){ JG.som=e.target.checked; if(JG.som) jgFalar("Vamos jogar"); }
  if(e.target.dataset.change==="jgPac"){ JG.pid=e.target.value||null; }
});
