# Sessio

App para clínicas de terapia: agenda com confirmação pelo WhatsApp, pacientes, fila de espera, ciclo de guias da Unimed, evoluções e caixa, com um painel para cada profissional.

## Quem vê o quê

| | Dona da clínica | Profissional |
|---|---|---|
| Agenda | de todas | só a dela |
| Pacientes | todos | só os que atende |
| Terapias de um paciente | todas | só a dela (não vê as terapias de outras profissionais no mesmo paciente) |
| Fila de espera | toda | só a dela |
| Unimed | tudo | só os atendimentos dela |
| Evoluções | todas | só as que ela escreveu |
| Caixa | de todas, com fechamento | só o dela |
| Fiscal (Receita Saúde, notas, contador) | tudo; só ela emite notas | só o dela; não emite notas |
| Reuniões e atas | sim | não |
| Equipe e mensagens | sim | não |

Essas regras ficam no banco de dados (Supabase), não só na tela. Mesmo alguém que mexa no app não consegue ver o que não pode.

Uma consequência: se um paciente já existe e outra profissional vai começar a atendê-lo, quem adiciona a nova terapia na ficha é a dona. A profissional não enxerga pacientes que ainda não são dela, e cadastrar de novo criaria uma ficha duplicada.

## Como colocar no ar

### 1. Supabase (banco e login)
1. Em [supabase.com](https://supabase.com), crie um projeto chamado `sessio`, na região **South America (São Paulo)**. Guarde a senha do banco.
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
3. Em **Clínica** → **Equipe** está o **código da clínica**. Cada profissional cria a própria conta, escolhe **Entrar na clínica** e digita o código. Você aprova o pedido em **Clínica** → **Equipe**.
4. Em **Equipe**, defina a especialidade e o **repasse à clínica (%)** de cada profissional. É esse percentual que o caixa usa no fechamento.

## Parte fiscal

Quem recebe o pagamento das sessões particulares define o documento. Isso é configurado por profissional em **Clínica → Equipe → "Quem recebe as sessões particulares"**:

- **A própria profissional (pessoa física):** desde 1º/01/2025, fonoaudiólogas, terapeutas ocupacionais, psicólogas, fisioterapeutas, médicas e dentistas pessoa física são obrigadas a emitir o recibo pelo app **Receita Saúde** (IN RFB 2.240/2024). O Receita Saúde não tem integração; a aba **Fiscal → Receita Saúde** lista o que cada profissional precisa lançar no mês (pagador, CPF, datas e valores), com um botão para copiar os dados e outro para marcar como emitido.
- **A clínica (CNPJ):** o documento é a **NFS-e**. A aba **Fiscal → Notas fiscais** agrupa as sessões pagas de cada paciente e emite a nota pelo Sessio. Só a dona emite e cancela.
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

## Reuniões e atas (só a dona)

Na aba **Reuniões**, a dona registra a reunião de equipe de dois jeitos:

- **Gravar agora:** o navegador ouve pelo microfone e transcreve na hora, de graça, com o reconhecimento de voz do Chrome ou do Safari. Serve para reuniões curtas e presenciais; a tela precisa ficar aberta.
- **Enviar gravação:** grave com o gravador do celular e envie o arquivo (até 25 MB, cerca de 50 minutos). Uma função no servidor transcreve com a OpenAI e apaga o áudio em seguida.

Com a transcrição pronta, **Gerar ata** usa o Claude (Anthropic) para escrever a ata com pauta, resumo, decisões, encaminhamentos (o quê, quem, prazo) e pendências. A dona revisa, edita, copia ou baixa. Pacientes aparecem só pelas iniciais.

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
- **Caixa:** entram as sessões marcadas como Presente. Nas particulares, registra-se o pagamento (pago ou em aberto, e a forma). As da Unimed entram pelo valor da terapia. A dona vê o fechamento por profissional, com o repasse.
- **WhatsApp:** o app abre a conversa com a mensagem pronta, e alguém toca em enviar. Envio automático exige a API oficial do WhatsApp Business.

## Arquivos

- `index.html`, `styles.css`, `app.js`: o app. Roda direto no navegador, sem etapa de build.
- `config.js`: endereço e chave pública do Supabase.
- `supabase/schema.sql`: tabelas, regras de acesso e funções. Pode ser rodado de novo para atualizar, sem perder dados.
- `supabase/functions/nfse/index.ts`: função que emite, consulta e cancela a NFS-e (roda no Supabase).
- `supabase/functions/reunioes/index.ts`: função que transcreve gravações e gera atas (roda no Supabase).

## Custos

- **Focus NFe:** cobra por nota emitida; consulte o site. Só é preciso se a clínica fatura pelo CNPJ. O certificado digital A1 é comprado à parte, em uma certificadora.

Os planos gratuitos servem para o piloto. Antes de cobrar das clínicas:
- **Vercel:** o plano gratuito é só para uso pessoal, sem fins comerciais. O Pro custa US$ 20 por mês por pessoa que mexe no projeto.
- **Supabase:** no plano gratuito, projetos sem uso por 7 dias são pausados. O Pro custa a partir de US$ 25 por mês.
