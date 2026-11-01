# Sessio

App para clínicas de terapia: agenda com confirmação pelo WhatsApp, pacientes, fila de espera, ciclo de guias da Unimed, evoluções e caixa, com um painel para cada profissional.

## Quem vê o quê

Cada pessoa da equipe tem uma **função**, escolhida ao pedir acesso e confirmada pela gestora na aprovação: Psicologia, Fonoaudiologia, Psicopedagogia, Terapia ocupacional, Musicoterapia, Fisioterapia, Nutricionista ou Recepcionista. A função define o que a pessoa vê.

| | Gestora (dona da clínica) | Recepcionista | Profissional (terapias) |
|---|---|---|---|
| Agenda (dia, semana, mês) | de todas | de todas | só a dela |
| Confirmações (painel da semana, WhatsApp, "ligar agora") | de todas | de todas | só as dela |
| Pacientes (ficha e contato) | todos | todos | só os que atende |
| Terapias de um paciente | todas | todas | só a dela |
| Fila de espera | toda | toda | só a dela |
| Unimed | tudo | tudo | só os atendimentos dela |
| Evoluções | todas | não vê | só as que ela escreveu |
| Prontuário (anamnese, avaliação, relatórios, anexos) | de todos | não vê | só da terapia dela |
| Caixa e Fiscal | de todas, com fechamento | não vê | só o dela |
| Painel da clínica (evolução por área, metas estagnadas) | sim | não | não |
| Reuniões e atas | sim | não | não |
| Equipe, mensagens, logo, importação | sim | não | não |

Essas regras ficam no banco de dados (Supabase), não só na tela. Mesmo alguém que mexa no app não consegue ver o que não pode.

**A tela da recepcionista** tem cinco abas: Agenda, Confirmações, Pacientes, Fila e Unimed. Em Confirmações ela vê a semana inteira agrupada por família, manda a mensagem de confirmação pelo WhatsApp (uma por família, listando todas as sessões), marca quem confirmou ou não vem, e tem a lista "ligar agora" com quem tem sessão hoje ou amanhã e ainda não respondeu. Ela não vê evoluções, valores nem notas.

## Como colocar no ar

### 1. Supabase (banco e login)
1. Em [supabase.com](https://supabase.com), crie um projeto chamado `rythmos`, na região **South America (São Paulo)**. Guarde a senha do banco.
2. No menu da esquerda, abra **SQL Editor** → **New query**. Cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Deve aparecer "Success".
3. Abra **Authentication** → **Sign In / Providers** → **Email** e **desligue "Confirm email"**. O envio de e-mails que vem com o Supabase só entrega para quem faz parte da sua equipe no Supabase, no máximo 2 por hora. Sem desligar, as profissionais não recebem o link de confirmação. O "Esqueci a senha" também depende de e-mail: para ele funcionar para todo mundo, configure um serviço de e-mail próprio em **Authentication** → **Emails** → **SMTP** (o Resend tem plano gratuito). Enquanto isso não estiver configurado, quem esquecer a senha precisa criar uma conta nova e pedir acesso de novo.
4. Abra **Project Settings** → **API** (ou **Data API**). Copie a **Project URL** e a chave **anon public** (às vezes aparece como **publishable**).

### 2. GitHub (código)
1. No repositório do projeto (por exemplo, `sessio`), clique em **Add file** → **Upload files** e arraste todos os arquivos desta pasta, incluindo a pasta `supabase`. Clique em **Commit changes**.
2. Abra o arquivo `config.js` no GitHub, clique no lápis e cole a Project URL e a chave anon public nos lugares indicados. Clique em **Commit changes**.
   Nunca cole ali a chave `service_role` ou `secret`.

### 3. Vercel (endereço do app)
1. Em [vercel.com](https://vercel.com), entre com a mesma conta do GitHub. Clique em **Add New** → **Project** e importe o repositório.
2. Em **Framework Preset**, escolha **Other** e clique em **Deploy**. Não precisa configurar mais nada.
3. Copie o endereço que a Vercel criar (algo como `sessio-xxxx.vercel.app`).

### 4. Último ajuste no Supabase
Em **Authentication** → **URL Configuration**:
- **Site URL**: cole o endereço da Vercel.
- **Redirect URLs**: adicione o mesmo endereço.

Isso faz o link de "Esqueci a senha" voltar para o app.

### 5. Primeiro acesso
1. Abra o endereço da Vercel, clique em **Criar conta** e depois em **Cadastrar minha clínica**. Quem cadastra a clínica vira a dona.
2. Para ver o app funcionando, abra **Clínica** → **Exemplos** → **Carregar exemplos**. Depois, apague os exemplos no mesmo lugar.
3. Em **Clínica** → **Equipe** está o **código da clínica**. Cada pessoa da equipe cria a própria conta, escolhe **Entrar na clínica**, digita o código e informa a função (Fonoaudiologia, Recepcionista etc.). Você aprova o pedido em **Clínica** → **Equipe**, confirmando a função.
4. Em **Equipe**, defina a especialidade e o **repasse à clínica (%)** de cada profissional. É esse percentual que o caixa usa no fechamento.

## Parte fiscal

Quem recebe o pagamento das sessões particulares define o documento. Isso é configurado por profissional em **Clínica → Equipe → "Quem recebe as sessões particulares"**:

- **A própria profissional (pessoa física):** desde 1º/01/2025, fonoaudiólogas, terapeutas ocupacionais, psicólogas, fisioterapeutas, médicas e dentistas pessoa física são obrigadas a emitir o recibo pelo app **Receita Saúde** (IN RFB 2.240/2024). O Receita Saúde não tem integração; a aba **Fiscal → Receita Saúde** lista o que cada profissional precisa lançar no mês (pagador, CPF, datas e valores), com um botão para copiar os dados e outro para marcar como emitido.
- **A clínica (CNPJ):** o documento é a **NFS-e**. A aba **Fiscal → Notas fiscais** agrupa as sessões pagas de cada paciente e emite a nota pelo Sessio. Só a gestora emite e cancela.
- **Fiscal → Contador:** resumo do mês e planilha (.csv) com cada sessão paga, CPF do pagador, forma de pagamento, nota ou recibo e repasse.

Para isso, a ficha do paciente ganhou os campos **Quem paga** (nome, CPF e e-mail do pagador) e cada profissional informa CPF e registro no conselho em **Conta**. Sessões da Unimed não entram: quem paga é o convênio.

### Como ligar a emissão de NFS-e

A nota é emitida por uma função que roda no servidor do Supabase e fala com a **Focus NFe** (focusnfe.com.br), um emissor que atende Maceió e os municípios do padrão nacional. O app nunca vê o token nem o certificado.

1. **Contrate a Focus NFe** e cadastre a clínica lá com o **certificado digital A1** (arquivo .pfx) da clínica. Eles fornecem dois tokens: homologação (testes) e produção.
2. **No Supabase, crie a função:** menu **Edge Functions** → **Deploy a new function** → **Via Editor**. Nome: `nfse`. Apague o conteúdo de exemplo, cole o conteúdo de `supabase/functions/nfse/index.ts` e clique em **Deploy function**. Se aparecer a opção **Verify JWT with legacy secret**, deixe desligada (a função confere o login sozinha).
3. **Guarde os tokens como segredos:** **Edge Functions** → **Secrets** (página "Edge Function Secrets") → adicione `FOCUS_TOKEN_HOMOLOGACAO` e `FOCUS_TOKEN_PRODUCAO` com os tokens da Focus NFe.
4. **No app**, em **Clínica → Fiscal**, preencha CNPJ, inscrição municipal, código IBGE do município (Maceió: 2704302), Simples Nacional, alíquota e, se o contador indicar, o item da lista de serviços e o código de tributação do município. Deixe o ambiente em **Testes** até uma nota de teste sair autorizada; depois mude para **Produção**.
5. Emita uma nota de teste em **Fiscal → Notas fiscais**. Notas de teste aparecem com a marca "teste" e não valem.

Confira com o contador o item da lista de serviços (normalmente 04.08 para fono, TO e fisioterapia e 04.16 para psicologia), a alíquota e o regime. O Sessio não substitui o contador.

## Reuniões e atas (só a gestora)

Na aba **Reuniões**, a gestora registra a reunião de equipe de dois jeitos:

- **Gravar agora:** o navegador ouve pelo microfone e transcreve na hora, de graça, com o reconhecimento de voz do Chrome ou do Safari. Serve para reuniões curtas e presenciais; a tela precisa ficar aberta.
- **Enviar gravação:** grave com o gravador do celular e envie o arquivo (até 25 MB, cerca de 50 minutos). Uma função no servidor transcreve com a OpenAI e apaga o áudio em seguida.

Com a transcrição pronta, **Gerar ata** usa o Claude (Anthropic) para escrever a ata com pauta, resumo, decisões, encaminhamentos (o quê, quem, prazo) e pendências. A gestora revisa, edita, copia ou baixa. Pacientes aparecem só pelas iniciais.

### Como ligar
1. **No Supabase, crie a função `reunioes`** do mesmo jeito que a `nfse`: **Edge Functions** → **Deploy a new function** → **Via Editor**, cole o conteúdo de `supabase/functions/reunioes/index.ts` e clique em **Deploy function**. Deixe **Verify JWT** desligado.
2. **Segredos** (Edge Functions → Secrets): `OPENAI_API_KEY` (crie em platform.openai.com → API keys) e `ANTHROPIC_API_KEY` (console.anthropic.com → API keys). As duas contas são pré-pagas: coloque um crédito pequeno, por exemplo US$ 10 em cada.
3. Rode o `schema.sql` de novo: ele cria a tabela e o espaço de armazenamento das gravações.

Custo aproximado: transcrição em torno de US$ 0,006 por minuto de áudio (uma reunião de 1 hora dá uns US$ 0,36); a ata, poucos centavos. A gravação ao vivo não custa nada.

**LGPD:** em reunião de clínica se fala de pacientes. O áudio e a transcrição passam pelos serviços de IA, fora do Brasil, para serem processados. A ata fica visível só para a dona, o áudio é apagado depois da transcrição e a ata usa só as iniciais, mas a transcrição guardada pode conter nomes. Oriente a equipe a citar pacientes pelas iniciais e deixe isso claro no contrato com a clínica.

## Logo e importação de pacientes (Clínica)

- **Logo da clínica:** em **Clínica → Mensagens**, envie um PNG ou JPG. Ele aparece no topo do app, ao lado do nome. A imagem é reduzida e guardada no banco.
- **Importar pacientes:** em **Clínica → Importar**, baixe o modelo (.csv), preencha no Excel ou no Google Planilhas e envie o arquivo (.xlsx, .xls ou .csv). Uma linha por paciente e terapia: o mesmo paciente com fono e TO ocupa duas linhas. O app reconhece os cabeçalhos mais comuns (nome, responsável, WhatsApp, nascimento, convênio, terapia, terapeuta, situação, valor, CPF), mostra uma prévia com o que vai entrar e avisa quando não encontra a profissional pelo nome. Pacientes que já existem não são duplicados: só ganham a terapia nova.



- **Paciente e terapias:** cada paciente tem uma ficha só. Cada terapia é ligada a uma profissional, com situação própria (em atendimento, fila, pausado, alta), valor da sessão e data do atendimento inicial pelo convênio. O mesmo paciente pode estar em atendimento na fono e na fila da TO.
- **Unimed:** no atendimento inicial a família já traz a primeira guia. **Até o dia 20**, a equipe entrega à família o pedido de prorrogação, para ela levar à Unimed. **Até o dia 1º** do mês seguinte, a família traz a guia nova; sem ela, o atendimento é pausado. O app alerta a equipe na Agenda e na aba Unimed: a partir do dia 15, os pedidos que faltam entregar; a partir do dia 26, o lembrete da guia para mandar às famílias pelo WhatsApp; depois do dia 1º, as guias que não chegaram, com cobrança e pausa.
- **Caixa:** entram as sessões marcadas como Presente. Nas particulares, registra-se o pagamento (pago ou em aberto, e a forma). As da Unimed entram pelo valor da terapia. A gestora vê o fechamento por profissional, com o repasse.
- **WhatsApp:** o app abre a conversa com a mensagem pronta, e alguém toca em enviar. Envio automático exige a API oficial do WhatsApp Business.

## Prontuário, relatórios em Word e documentos

Na ficha do paciente, o botão **Prontuário** abre o registro clínico da terapia (uma por profissional: a fono não vê o prontuário da TO do mesmo paciente; a gestora vê todos). São quatro campos de texto livre:

- **Anamnese:** queixa, história do desenvolvimento, saúde, família, escola.
- **Avaliação:** observação clínica e hipótese, mais a lista **Protocolos e testes aplicados**: um catálogo por especialidade (fono: ABFW, PROC, TVIP, MBGR, CONFIAS…; TO: Perfil Sensorial 2, SPM, PEDI-CAT, COPM; psicologia/ABA: VB-MAPP, ABLLS-R, AFLS, PEAK, Vineland-3, Portage, CARS-2, ATEC, SRS-2, CBCL, WISC-V, SON-R; psicopedagogia: TDE-II, PROLEC, Provas Operatórias, EOCA; fisioterapia: GMFM, AIMS, TIMP, EDM; musicoterapia: IMTAP; nutrição: BAMBI, recordatório, antropometria; triagem: M-CHAT-R/F, Denver II, Bayley-III, ADOS-2) em que a profissional marca os que usou, com data e resultado de cada um, e "Outros" para protocolos próprios. O protocolo em si não cabe no app: o resultado fica aqui e o formulário preenchido pode ser anexado em PDF ou foto. O **Relatório de avaliação** sai com a tabela desses protocolos.
- **Habilidades:** o que a criança já faz, o que está emergindo, o que ainda não faz.
- **Objetivos terapêuticos:** metas do período.

**Metas e habilidades (nota de 1 a 5).** Abaixo dos campos de texto, a profissional cadastra as habilidades que a terapia trabalha (ex.: "aumento de vocabulário expressivo", "registro no sistema tátil"), cada uma numa **área** comum a todas as especialidades: Comunicação e linguagem, Cognição e aprendizagem, Socialização e engajamento, Emocional e autorregulação, Integração sensorial, Motora, Autonomia (AVDs). Em **Avaliar agora** ela dá nota de 1 a 5 a todas as metas de uma vez, com a data (1 não apresenta · 2 emergente · 3 com ajuda · 4 com pouca ajuda · 5 consolidada). O app desenha o **gráfico de evolução** de cada meta ao longo das avaliações, e a lista mostra a sequência de notas (2 → 3 → 4). Metas encerradas saem do gráfico mas ficam no histórico. Quando a criança tem mais de uma terapia, a **Visão geral da criança** (dona) junta tudo por área: média da primeira e da última nota, com quais terapias contribuem — é a visão multidisciplinar.

**Gerar relatório (Word)** monta um .docx com logo e nome da clínica, identificação do paciente, terapia e profissional, o período escolhido, anamnese e avaliação, habilidades, objetivos, frequência (sessões, presenças, faltas), a tabela de metas com primeira e última nota, e todas as evoluções do período, mais o parecer que a profissional escreve na hora e a linha de assinatura. Dá para escolher o tipo (evolução, avaliação, escola, convênio) e o que incluir. O arquivo abre no Word para revisar e assinar e, se "Guardar no prontuário" estiver marcado, fica salvo na lista de **Documentos** do paciente.

**Anexar arquivo** guarda laudos, protocolos preenchidos, encaminhamentos e relatórios antigos (PDF, Word, imagem, planilha, até 25 MB) na mesma lista. Os arquivos ficam num espaço privado do Supabase (bucket `documentos`); "Abrir" gera um link que vale cinco minutos. Quem anexou, ou a dona, pode apagar.

## Agenda inteligente

A aba Agenda tem três vistas: **Dia** (a lista com confirmação, presença, falta e evolução), **Semana** (sete colunas com as sessões em cartões coloridos por especialidade; tocar no dia abre a vista do dia) e **Mês** (calendário com a quantidade de sessões, pontos coloridos por especialidade, faltas e "a confirmar" em cada dia). Em todas, os números do período: sessões, a confirmar, presença (% das sessões já fechadas) e faltas. Para gestora e recepção, "Por profissional" mostra a ocupação de cada uma, com a barra dividida por especialidade; tocar filtra a agenda por ela. No mês, "Exportar sessões (CSV)" gera o relatório operacional (presença, faltas, confirmações) para o Excel. As cores: fono verde, TO laranja, psicologia roxo, psicopedagogia azul, musicoterapia rosa, fisioterapia azul-petróleo, nutrição âmbar.

## Painel da clínica (só a gestora)

A aba **Painel** resume as metas de todas as crianças, no período escolhido (3, 6, 12 meses ou 2 anos):

- **Números do período:** crianças avaliadas, avaliações feitas, % das metas que subiram de nota, metas estagnadas.
- **Evolução por área:** para cada área (Comunicação, Sensorial, Emocional…), quantas crianças evoluíram, ficaram estáveis ou regrediram — comparando a nota no início do período com a última — e a média de ganho.
- **Por profissional:** metas ativas, crianças avaliadas, notas dadas e % de metas que subiram.
- **Risco de evasão:** crianças em atendimento com 2+ faltas em 30 dias, duas faltas seguidas, menos de 60% de presença em 90 dias ou nada agendado nos próximos 14 dias, com o WhatsApp da família pronto para retomar contato.
- **Metas estagnadas:** mesma nota nas duas últimas avaliações e ainda não consolidada (nota 5). Tocar abre o prontuário da criança.
- **Sem avaliação há mais de 90 dias:** crianças com metas ativas que ninguém avaliou no trimestre.
- **Exportar CSV:** todas as metas e notas, para Excel ou para o investidor.

Uma meta só entra na comparação quando tem duas avaliações em datas diferentes e a última cai no período. O painel lê direto do banco ao abrir; "Atualizar" recarrega.

## Jogos para a sessão

A aba **Jogos** (dona e profissionais) tem dez atividades para usar no tablet com a criança, sem cronômetro, sem pontuação negativa e sem efeitos que piscam. Som desligado por padrão; "Falar as palavras" liga a voz em português.

| Jogo | Trabalha | O que a criança faz |
|---|---|---|
| Pares | memória, atenção | vira cartas e acha as duplas |
| Qual é? | compreensão de palavras, vocabulário | ouve a palavra e toca na figura |
| Emoções | reconhecer expressões | toca no rosto que mostra a emoção pedida |
| Minha vez, sua vez | troca de turnos, sequência | repete a ordem das cores |
| Primeiro, depois | rotina visual, sequência temporal | coloca os passos da manhã e da noite na ordem |
| Separar | classificar, categorias | leva cada figura para a cesta certa (comida, animais, brinquedos…) |
| Ache! | atenção visual, rastreio | encontra todas as figuras iguais no quadro |
| O que vem depois? | padrões, lógica | completa a sequência de formas |
| Eu quero | comunicação de necessidades | toca no que precisa e o tablet fala por ela (água, pausa, ajuda, banheiro…) |
| Respirar | autorregulação | acompanha cinco respirações guiadas |

No fim da rodada, "Registrar na evolução" anota acertos, tentativas e tempo (ou os pedidos feitos, no "Eu quero") na evolução da sessão de hoje da criança escolhida. "Tela cheia" esconde o resto do app.

## App no celular

O Rythmos é um **PWA** (app web instalável). Não precisa de loja nem de versão separada: o mesmo endereço da Vercel vira app no celular, com ícone na tela inicial e abrindo em tela cheia, sem a barra do navegador. Os dados continuam vindo do Supabase ao vivo; só a "casca" do app fica guardada no aparelho para abrir rápido.

**Como cada pessoa instala (uma vez, leva 20 segundos):**
- **Android (Chrome):** ao abrir o endereço, o próprio app mostra o aviso "Instalar". Se não aparecer, menu ⋮ → **Instalar aplicativo** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** o app mostra a dica; é tocar em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**. No iPhone só funciona pelo Safari.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Quem já instalou recebe as atualizações sozinho: na próxima vez que abrir com internet, o app baixa a versão nova do GitHub/Vercel.

**Se quiser colocar na Play Store** (opcional, para a clínica achar na loja): o [PWABuilder](https://www.pwabuilder.com) gera o pacote Android a partir do endereço do app, e a conta de desenvolvedor Google custa US$ 25 uma vez. Na App Store da Apple é mais caro (US$ 99/ano) e exige um projeto nativo; para clínicas, a instalação pelo Safari resolve.

Arquivos envolvidos: `manifest.json` (nome, cores e ícones), `sw.js` (cache da casca do app), `icons/` (ícones gerados a partir do símbolo do Rythmos) e as tags no `index.html`.

## Arquivos

- `index.html`, `styles.css`, `app.js`, `jogos.js`, `prontuario.js`, `painel.js`, `agenda.js`: o app. Roda direto no navegador, sem etapa de build.
- `config.js`: endereço e chave pública do Supabase.
- `manifest.json`, `sw.js`, `icons/`: o que faz o app ser instalável no celular.
- `supabase/schema.sql`: tabelas, regras de acesso e funções. Pode ser rodado de novo para atualizar, sem perder dados.
- `supabase/functions/nfse/index.ts`: função que emite, consulta e cancela a NFS-e (roda no Supabase).
- `supabase/functions/reunioes/index.ts`: função que transcreve gravações e gera atas (roda no Supabase).

## Custos

- **Focus NFe:** cobra por nota emitida; consulte o site. Só é preciso se a clínica fatura pelo CNPJ. O certificado digital A1 é comprado à parte, em uma certificadora.

Os planos gratuitos servem para o piloto. Antes de cobrar das clínicas:
- **Vercel:** o plano gratuito é só para uso pessoal, sem fins comerciais. O Pro custa US$ 20 por mês por pessoa que mexe no projeto.
- **Supabase:** no plano gratuito, projetos sem uso por 7 dias são pausados. O Pro custa a partir de US$ 25 por mês.
