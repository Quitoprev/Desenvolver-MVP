-- ============================================================
-- Sessio — banco de dados (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem perder dados: ele só cria o que falta e
-- atualiza funções e regras de acesso.
--
-- Papéis:
--   dona          vê e altera tudo da clínica, inclusive caixa e equipe
--   recepcao      vê e organiza agenda, confirmações, pacientes, fila e Unimed de
--                 toda a clínica; não vê caixa, fiscal, evoluções nem reuniões
--   profissional  vê só os próprios pacientes: as terapias, sessões, evoluções,
--                 fila, Unimed e caixa dela. Não vê nada de outras profissionais,
--                 nem quando atende o mesmo paciente.
-- As regras ficam no banco (Row Level Security): mesmo que alguém
-- mexa no app, o banco não entrega o que a pessoa não pode ver.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique default upper(substr(md5(random()::text), 1, 6)),
  modelos jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  papel text not null default 'profissional' check (papel in ('dona','recepcao','profissional')),
  especialidade text,
  repasse_pct numeric(5,2) not null default 0 check (repasse_pct between 0 and 100),
  ativo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  nome text not null,
  responsavel text,
  telefone text,
  nascimento date,
  convenio text not null default 'Particular',
  observacoes text,
  exemplo boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Um vínculo = um paciente com uma terapia e uma profissional.
-- A situação (ativo, fila, pausado, alta) é por vínculo: o mesmo
-- paciente pode estar ativo na fono e na fila da TO.
create table if not exists public.vinculos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  terapia text not null,
  situacao text not null default 'ativo' check (situacao in ('ativo','fila','pausado','alta')),
  prioridade text not null default 'normal' check (prioridade in ('normal','alta')),
  entrada_fila date,
  inicio_convenio date,
  valor_sessao numeric(10,2),
  criado_em timestamptz not null default now()
);

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  vinculo_id uuid not null references public.vinculos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  terapia text,
  data date not null,
  hora time not null,
  status text not null default 'agendada' check (status in ('agendada','confirmada','presente','falta','desmarcada')),
  criado_em timestamptz not null default now()
);

create table if not exists public.evolucoes (
  sessao_id uuid primary key references public.sessoes(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  data date,
  atividades text,
  resposta text,
  proximos text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.pagamentos (
  sessao_id uuid primary key references public.sessoes(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  data date,
  valor numeric(10,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente','pago','convenio')),
  forma text,
  pago_em date
);

-- Ciclo mensal da Unimed por vínculo: pedido de prorrogação até o dia 20,
-- aviso ao responsável e guia nova no dia 1º do mês seguinte.
create table if not exists public.unimed_ciclos (
  vinculo_id uuid not null references public.vinculos(id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  pedido_em date,
  msg_em timestamptz,
  guia_em date,
  pausado_em date,
  primary key (vinculo_id, mes)
);

-- (atualização) papéis válidos
alter table public.membros drop constraint if exists membros_papel_check;
alter table public.membros add constraint membros_papel_check check (papel in ('dona','recepcao','profissional'));

-- ---------- parte fiscal ----------
-- Profissional: CPF e registro no conselho (vão no recibo/nota); 'recebe' diz quem
-- recebe o pagamento das sessões particulares dela: 'pf' (ela mesma, autônoma →
-- recibo pelo Receita Saúde) ou 'clinica' (a clínica fatura → NFS-e).
alter table public.membros add column if not exists cpf text;
alter table public.membros add column if not exists registro text;
alter table public.membros add column if not exists recebe text not null default 'clinica';
alter table public.membros drop constraint if exists membros_recebe_check;
alter table public.membros add constraint membros_recebe_check check (recebe in ('pf','clinica'));
-- Paciente: quem paga (vai como tomador na nota e como pagador no Receita Saúde)
alter table public.pacientes add column if not exists cpf_pagador text;
alter table public.pacientes add column if not exists nome_pagador text;
alter table public.pacientes add column if not exists email_pagador text;
-- Clínica: dados do prestador para a NFS-e (o token do emissor NÃO fica aqui)
alter table public.clinicas add column if not exists fiscal jsonb not null default '{}'::jsonb;
-- Logo da clínica (imagem pequena, guardada como data URL)
alter table public.clinicas add column if not exists logo text;
-- Pagamento: controle do recibo/nota
alter table public.pagamentos add column if not exists receita_saude_em date;
alter table public.pagamentos add column if not exists nota_id uuid;

create table if not exists public.notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  paciente_id uuid references public.pacientes(id) on delete set null,
  sessao_ids uuid[] not null default '{}',
  competencia text,
  tomador_cpf text,
  tomador_nome text,
  tomador_email text,
  valor numeric(10,2) not null,
  discriminacao text,
  item_lista_servico text,
  ref text not null unique default ('orb-' || replace(gen_random_uuid()::text, '-', '')),
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao','producao')),
  status text not null default 'pendente' check (status in ('pendente','processando','autorizada','erro','cancelada')),
  numero text,
  codigo_verificacao text,
  url_pdf text,
  url_xml text,
  erro text,
  payload jsonb,
  emitida_em timestamptz,
  cancelada_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists notas_clinica_idx on public.notas_fiscais(clinica_id, criado_em);
alter table public.pagamentos drop constraint if exists pagamentos_nota_fk;
alter table public.pagamentos add constraint pagamentos_nota_fk foreign key (nota_id) references public.notas_fiscais(id) on delete set null;

-- ---------- reuniões (só a dona) ----------
-- Transcrição e ata ficam aqui; o áudio fica no bucket 'reunioes' só até
-- ser transcrito e é apagado em seguida.
create table if not exists public.reunioes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  titulo text not null,
  data date not null default current_date,
  participantes text,
  origem text not null default 'ao_vivo' check (origem in ('ao_vivo','arquivo')),
  transcricao text,
  ata text,
  status text not null default 'rascunho' check (status in ('rascunho','transcrevendo','transcrita','gerando_ata','concluida','erro')),
  erro text,
  arquivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists reunioes_clinica_idx on public.reunioes(clinica_id, data desc);

-- ---------- prontuário e documentos ----------
-- Prontuário: um por terapia (vínculo). Anamnese, avaliação, habilidades e
-- objetivos em texto livre, escritos pela profissional que atende.
create table if not exists public.prontuarios (
  vinculo_id uuid primary key references public.vinculos(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  anamnese text,
  avaliacao text,
  habilidades text,
  objetivos text,
  protocolos jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);
alter table public.prontuarios add column if not exists protocolos jsonb not null default '[]'::jsonb;
-- Documentos do paciente (relatórios gerados, laudos, Word, PDF): o arquivo
-- fica no bucket 'documentos', em <clinica>/<paciente>/<arquivo>.
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  nome text not null,
  tipo text,
  tamanho integer,
  caminho text not null,
  criado_em timestamptz not null default now()
);
create index if not exists documentos_paciente_idx on public.documentos(paciente_id, criado_em desc);
-- Metas/habilidades da terapia, com nota de 1 a 5 a cada avaliação (gráfico de evolução).
-- 'area' é comum a todas as especialidades, para a visão geral da criança.
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  vinculo_id uuid not null references public.vinculos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  area text not null default 'comunicacao',
  descricao text not null,
  ativa boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create table if not exists public.metas_notas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  meta_id uuid not null references public.metas(id) on delete cascade,
  vinculo_id uuid not null references public.vinculos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.membros(user_id) on delete set null,
  data date not null default current_date,
  nota smallint not null check (nota between 1 and 5),
  obs text,
  unique (meta_id, data)
);
create index if not exists metas_vinculo_idx on public.metas(vinculo_id);
create index if not exists metas_notas_paciente_idx on public.metas_notas(paciente_id, data);

create index if not exists membros_clinica_idx on public.membros(clinica_id);
create index if not exists pacientes_clinica_idx on public.pacientes(clinica_id);
create index if not exists vinculos_paciente_idx on public.vinculos(paciente_id);
create index if not exists vinculos_prof_idx on public.vinculos(profissional_id);
create index if not exists sessoes_clinica_data_idx on public.sessoes(clinica_id, data);
create index if not exists sessoes_prof_data_idx on public.sessoes(profissional_id, data);
create index if not exists evolucoes_paciente_idx on public.evolucoes(paciente_id, data);
create index if not exists pagamentos_data_idx on public.pagamentos(clinica_id, data);
create index if not exists ciclos_clinica_mes_idx on public.unimed_ciclos(clinica_id, mes);

-- ---------- funções de apoio (quem sou eu) ----------
create or replace function public.minha_clinica() returns uuid
language sql stable security definer set search_path = public as $$
  select clinica_id from membros where user_id = auth.uid() and ativo
$$;

create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from membros where user_id = auth.uid() and ativo
$$;

create or replace function public.eh_dona() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'dona', false)
$$;

-- dona ou recepção: enxergam a clínica inteira na agenda, pacientes, fila e Unimed
create or replace function public.eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('dona','recepcao'), false)
$$;

-- a profissional atende este paciente (tem algum vínculo com ele)?
create or replace function public.atende(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vinculos where paciente_id = p and profissional_id = auth.uid())
$$;

create or replace function public.paciente_da_clinica(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pacientes where id = p and clinica_id = public.minha_clinica())
$$;

create or replace function public.membro_da_clinica(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where user_id = u and clinica_id = public.minha_clinica() and ativo)
$$;

-- ---------- gatilhos: preenchem clínica, paciente e profissional ----------
-- O app não precisa (nem consegue) escolher a clínica: o banco usa a
-- clínica de quem está logado e copia paciente/profissional do vínculo.
create or replace function public.tg_pacientes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.clinica_id := public.minha_clinica();
  else
    new.clinica_id := old.clinica_id;
  end if;
  return new;
end $$;

create or replace function public.tg_vinculos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.clinica_id := public.minha_clinica();
  else
    new.clinica_id := old.clinica_id;
    new.paciente_id := old.paciente_id;
  end if;
  if new.situacao = 'fila' and new.entrada_fila is null then
    new.entrada_fila := current_date;
  end if;
  return new;
end $$;

create or replace function public.tg_sessoes() returns trigger
language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype;
begin
  select * into v from vinculos where id = new.vinculo_id;
  if v.id is null or v.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Vínculo não encontrado nesta clínica';
  end if;
  new.clinica_id := v.clinica_id;
  new.paciente_id := v.paciente_id;
  new.profissional_id := v.profissional_id;
  new.terapia := coalesce(nullif(new.terapia, ''), v.terapia);
  return new;
end $$;

create or replace function public.tg_da_sessao() returns trigger
language plpgsql security definer set search_path = public as $$
declare s sessoes%rowtype;
begin
  select * into s from sessoes where id = new.sessao_id;
  if s.id is null or s.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Sessão não encontrada nesta clínica';
  end if;
  new.clinica_id := s.clinica_id;
  new.profissional_id := s.profissional_id;
  new.data := s.data;
  if tg_table_name = 'evolucoes' then
    new.paciente_id := s.paciente_id;
    new.atualizado_em := now();
  end if;
  return new;
end $$;

create or replace function public.tg_ciclos() returns trigger
language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype;
begin
  select * into v from vinculos where id = new.vinculo_id;
  if v.id is null or v.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Vínculo não encontrado nesta clínica';
  end if;
  new.clinica_id := v.clinica_id;
  new.profissional_id := v.profissional_id;
  return new;
end $$;

-- a profissional de uma sessão segue a do vínculo, se o vínculo mudar de profissional
create or replace function public.tg_vinculo_prof() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.profissional_id is distinct from old.profissional_id then
    update sessoes set profissional_id = new.profissional_id
      where vinculo_id = new.id and data >= current_date;
    update unimed_ciclos set profissional_id = new.profissional_id where vinculo_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists pacientes_bi on public.pacientes;
create trigger pacientes_bi before insert or update on public.pacientes
  for each row execute function public.tg_pacientes();
drop trigger if exists vinculos_bi on public.vinculos;
create trigger vinculos_bi before insert or update on public.vinculos
  for each row execute function public.tg_vinculos();
drop trigger if exists vinculos_au on public.vinculos;
create trigger vinculos_au after update on public.vinculos
  for each row execute function public.tg_vinculo_prof();
drop trigger if exists sessoes_bi on public.sessoes;
create trigger sessoes_bi before insert or update on public.sessoes
  for each row execute function public.tg_sessoes();
drop trigger if exists evolucoes_bi on public.evolucoes;
create trigger evolucoes_bi before insert or update on public.evolucoes
  for each row execute function public.tg_da_sessao();
drop trigger if exists pagamentos_bi on public.pagamentos;
create trigger pagamentos_bi before insert or update on public.pagamentos
  for each row execute function public.tg_da_sessao();
create or replace function public.tg_notas() returns trigger
language plpgsql security definer set search_path = public as $$
declare s sessoes%rowtype; n int;
begin
  new.clinica_id := public.minha_clinica();
  select count(*) into n from sessoes where id = any(new.sessao_ids) and clinica_id = new.clinica_id;
  if n = 0 or n <> coalesce(array_length(new.sessao_ids, 1), 0) then
    raise exception 'Sessões inválidas para a nota';
  end if;
  select * into s from sessoes where id = new.sessao_ids[1];
  new.profissional_id := s.profissional_id;
  new.paciente_id := s.paciente_id;
  if exists (select 1 from pagamentos where sessao_id = any(new.sessao_ids) and nota_id is not null) then
    raise exception 'Alguma dessas sessões já tem nota';
  end if;
  return new;
end $$;
drop trigger if exists notas_bi on public.notas_fiscais;
create trigger notas_bi before insert on public.notas_fiscais
  for each row execute function public.tg_notas();

-- depois de criada, a nota é ligada aos pagamentos das sessões
create or replace function public.tg_notas_ai() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  foreach sid in array new.sessao_ids loop
    insert into pagamentos (sessao_id, nota_id, status) values (sid, new.id, 'pago')
      on conflict (sessao_id) do update set nota_id = excluded.nota_id;
  end loop;
  return new;
end $$;
drop trigger if exists notas_ai on public.notas_fiscais;
create trigger notas_ai after insert on public.notas_fiscais
  for each row execute function public.tg_notas_ai();

-- ao apagar uma nota pendente/erro, libera as sessões
create or replace function public.tg_notas_del() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pagamentos set nota_id = null where nota_id = old.id;
  return old;
end $$;
drop trigger if exists notas_bd on public.notas_fiscais;
create trigger notas_bd before delete on public.notas_fiscais
  for each row execute function public.tg_notas_del();

create or replace function public.tg_reunioes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.clinica_id := public.minha_clinica(); else new.clinica_id := old.clinica_id; end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists reunioes_bi on public.reunioes;
create trigger reunioes_bi before insert or update on public.reunioes
  for each row execute function public.tg_reunioes();

create or replace function public.tg_prontuarios() returns trigger
language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype;
begin
  select * into v from vinculos where id = new.vinculo_id;
  if v.id is null or v.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Terapia não encontrada nesta clínica';
  end if;
  new.clinica_id := v.clinica_id; new.paciente_id := v.paciente_id; new.profissional_id := v.profissional_id;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists prontuarios_bi on public.prontuarios;
create trigger prontuarios_bi before insert or update on public.prontuarios
  for each row execute function public.tg_prontuarios();

create or replace function public.tg_documentos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.clinica_id := public.minha_clinica();
  new.profissional_id := auth.uid();
  if not public.paciente_da_clinica(new.paciente_id) then raise exception 'Paciente não encontrado nesta clínica'; end if;
  return new;
end $$;
create or replace function public.tg_metas() returns trigger
language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype;
begin
  select * into v from vinculos where id = new.vinculo_id;
  if v.id is null or v.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Terapia não encontrada nesta clínica';
  end if;
  new.clinica_id := v.clinica_id; new.paciente_id := v.paciente_id; new.profissional_id := v.profissional_id;
  return new;
end $$;
drop trigger if exists metas_bi on public.metas;
create trigger metas_bi before insert or update on public.metas
  for each row execute function public.tg_metas();
create or replace function public.tg_metas_notas() returns trigger
language plpgsql security definer set search_path = public as $$
declare m metas%rowtype;
begin
  select * into m from metas where id = new.meta_id;
  if m.id is null or m.clinica_id is distinct from public.minha_clinica() then
    raise exception 'Meta não encontrada nesta clínica';
  end if;
  new.clinica_id := m.clinica_id; new.vinculo_id := m.vinculo_id; new.paciente_id := m.paciente_id; new.profissional_id := m.profissional_id;
  return new;
end $$;
drop trigger if exists metas_notas_bi on public.metas_notas;
create trigger metas_notas_bi before insert or update on public.metas_notas
  for each row execute function public.tg_metas_notas();
drop trigger if exists documentos_bi on public.documentos;
create trigger documentos_bi before insert on public.documentos
  for each row execute function public.tg_documentos();

drop trigger if exists ciclos_bi on public.unimed_ciclos;
create trigger ciclos_bi before insert or update on public.unimed_ciclos
  for each row execute function public.tg_ciclos();

-- ---------- regras de acesso ----------
alter table public.clinicas enable row level security;
alter table public.membros enable row level security;
alter table public.pacientes enable row level security;
alter table public.vinculos enable row level security;
alter table public.sessoes enable row level security;
alter table public.evolucoes enable row level security;
alter table public.pagamentos enable row level security;
alter table public.unimed_ciclos enable row level security;
alter table public.notas_fiscais enable row level security;
alter table public.reunioes enable row level security;
alter table public.prontuarios enable row level security;
alter table public.documentos enable row level security;
alter table public.metas enable row level security;
alter table public.metas_notas enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('clinicas','membros','pacientes','vinculos','sessoes','evolucoes','pagamentos','unimed_ciclos','notas_fiscais','reunioes','prontuarios','documentos','metas','metas_notas')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- clínica
create policy clinica_ver on public.clinicas for select to authenticated
  using (id = public.minha_clinica());
create policy clinica_editar on public.clinicas for update to authenticated
  using (id = public.minha_clinica() and public.eh_dona())
  with check (id = public.minha_clinica());

-- equipe: todos da clínica veem os nomes; só a dona aprova e altera
create policy membros_ver on public.membros for select to authenticated
  using (user_id = auth.uid() or clinica_id = public.minha_clinica());
create policy membros_editar on public.membros for update to authenticated
  using (clinica_id = public.minha_clinica() and public.eh_dona())
  with check (clinica_id = public.minha_clinica() and public.eh_dona());
-- a própria profissional pode completar CPF, registro e nome (papel e repasse continuam com a dona)
create policy membros_editar_proprio on public.membros for update to authenticated
  using (user_id = auth.uid() and ativo and not public.eh_dona())
  with check (user_id = auth.uid() and ativo and papel = (select papel from membros m where m.user_id = auth.uid())
    and repasse_pct = (select repasse_pct from membros m where m.user_id = auth.uid())
    and recebe = (select recebe from membros m where m.user_id = auth.uid()));
create policy membros_remover on public.membros for delete to authenticated
  using (clinica_id = public.minha_clinica() and public.eh_dona() and user_id <> auth.uid());

-- pacientes: dona e recepção veem todos; profissional vê só os que atende
create policy pacientes_ver on public.pacientes for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or public.atende(id)));
create policy pacientes_criar on public.pacientes for insert to authenticated
  with check (clinica_id = public.minha_clinica());
create policy pacientes_editar on public.pacientes for update to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or public.atende(id)))
  with check (clinica_id = public.minha_clinica());
create policy pacientes_remover on public.pacientes for delete to authenticated
  using (clinica_id = public.minha_clinica() and public.eh_dona());

-- terapias (vínculos): dona vê todas; profissional só as dela
create policy vinculos_ver on public.vinculos for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));
create policy vinculos_criar on public.vinculos for insert to authenticated
  with check (clinica_id = public.minha_clinica()
    and public.paciente_da_clinica(paciente_id)
    and (profissional_id is null or public.membro_da_clinica(profissional_id))
    and (public.eh_equipe() or profissional_id = auth.uid()));
create policy vinculos_editar on public.vinculos for update to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica()
    and (profissional_id is null or public.membro_da_clinica(profissional_id))
    and (public.eh_equipe() or profissional_id = auth.uid()));
create policy vinculos_remover on public.vinculos for delete to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));

-- sessões: dona vê todas; profissional só as dela
create policy sessoes_ver on public.sessoes for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));
create policy sessoes_criar on public.sessoes for insert to authenticated
  with check (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));
create policy sessoes_editar on public.sessoes for update to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));
create policy sessoes_remover on public.sessoes for delete to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));

-- evoluções: dona lê todas; profissional só as que escreveu
create policy evolucoes_ver on public.evolucoes for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
create policy evolucoes_criar on public.evolucoes for insert to authenticated
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
create policy evolucoes_editar on public.evolucoes for update to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
create policy evolucoes_remover on public.evolucoes for delete to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));

-- caixa: só a dona e a própria profissional
create policy pagamentos_tudo on public.pagamentos for all to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));

-- Unimed: dona vê tudo; profissional só os atendimentos dela
create policy ciclos_tudo on public.unimed_ciclos for all to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_equipe() or profissional_id = auth.uid()));

-- notas fiscais: a dona cria e cancela; a profissional só vê as das sessões dela.
-- Quem muda o status é a função no servidor (chave de serviço), nunca o app.
create policy notas_ver on public.notas_fiscais for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
create policy notas_criar on public.notas_fiscais for insert to authenticated
  with check (clinica_id = public.minha_clinica() and public.eh_dona() and status = 'pendente');
create policy notas_apagar on public.notas_fiscais for delete to authenticated
  using (clinica_id = public.minha_clinica() and public.eh_dona() and status in ('pendente','erro'));

-- reuniões: só a dona vê, cria, edita e apaga
create policy reunioes_tudo on public.reunioes for all to authenticated
  using (clinica_id = public.minha_clinica() and public.eh_dona())
  with check (clinica_id = public.minha_clinica() and public.eh_dona());

-- prontuário: dona tudo; profissional só os das terapias dela; recepção nada
create policy prontuarios_tudo on public.prontuarios for all to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
-- metas e notas: mesma regra do prontuário
create policy metas_tudo on public.metas for all to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
create policy metas_notas_tudo on public.metas_notas for all to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()))
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));
-- documentos: dona tudo; profissional vê os dos pacientes que atende e apaga só os que enviou
create policy documentos_ver on public.documentos for select to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or public.atende(paciente_id)));
create policy documentos_criar on public.documentos for insert to authenticated
  with check (clinica_id = public.minha_clinica() and (public.eh_dona() or public.atende(paciente_id)));
create policy documentos_apagar on public.documentos for delete to authenticated
  using (clinica_id = public.minha_clinica() and (public.eh_dona() or profissional_id = auth.uid()));

-- ---------- ações especiais ----------
-- Quem cria a clínica vira dona.
create or replace function public.criar_clinica(p_nome text, p_meu_nome text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro'; end if;
  if exists (select 1 from membros where user_id = auth.uid()) then
    raise exception 'Sua conta já faz parte de uma clínica';
  end if;
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_meu_nome), '') = '' then
    raise exception 'Informe o nome da clínica e o seu nome';
  end if;
  insert into clinicas (nome) values (trim(p_nome)) returning id into c;
  insert into membros (user_id, clinica_id, nome, papel, ativo)
    values (auth.uid(), c, trim(p_meu_nome), 'dona', true);
  return c;
end $$;

-- Profissional entra com o código da clínica e espera a dona aprovar.
drop function if exists public.entrar_clinica(text, text);
create or replace function public.entrar_clinica(p_codigo text, p_meu_nome text, p_funcao text default null) returns text
language plpgsql security definer set search_path = public as $$
declare c clinicas%rowtype;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta primeiro'; end if;
  if exists (select 1 from membros where user_id = auth.uid()) then
    raise exception 'Sua conta já faz parte de uma clínica';
  end if;
  select * into c from clinicas where codigo_convite = upper(trim(p_codigo));
  if c.id is null then raise exception 'Código não encontrado. Confira com a clínica.'; end if;
  if coalesce(trim(p_meu_nome), '') = '' then raise exception 'Informe o seu nome'; end if;
  insert into membros (user_id, clinica_id, nome, papel, especialidade, ativo)
    values (auth.uid(), c.id, trim(p_meu_nome),
      case when lower(coalesce(p_funcao,'')) like 'recep%' then 'recepcao' else 'profissional' end,
      case when lower(coalesce(p_funcao,'')) like 'recep%' then null else nullif(trim(p_funcao),'') end,
      false);
  return c.nome;
end $$;

-- Situação da conta logada (funciona também para quem espera aprovação).
create or replace function public.meu_status() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('user_id', m.user_id, 'nome', m.nome, 'papel', m.papel, 'ativo', m.ativo,
    'clinica_id', m.clinica_id, 'clinica', c.nome)
  from membros m join clinicas c on c.id = m.clinica_id
  where m.user_id = auth.uid()
$$;

create or replace function public.novo_codigo() returns text
language plpgsql security definer set search_path = public as $$
declare novo text;
begin
  if not public.eh_dona() then raise exception 'Só a dona da clínica pode trocar o código'; end if;
  novo := upper(substr(md5(random()::text), 1, 6));
  update clinicas set codigo_convite = novo where id = public.minha_clinica();
  return novo;
end $$;

-- Dados de exemplo ligados à própria dona, para demonstração.
create or replace function public.carregar_exemplos() returns void
language plpgsql security definer set search_path = public as $$
declare c uuid := public.minha_clinica(); eu uuid := auth.uid();
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid;
  hoje date := (now() at time zone 'America/Maceio')::date;
  m0 text; m1 text;
  s uuid;
begin
  if not public.eh_dona() then raise exception 'Só a dona da clínica pode carregar exemplos'; end if;
  m0 := to_char(hoje, 'YYYY-MM');
  m1 := to_char(hoje - interval '1 month', 'YYYY-MM');
  insert into pacientes (clinica_id, nome, responsavel, convenio, exemplo)
    values (c, 'Theo Albuquerque', 'Camila Albuquerque', 'Unimed', true) returning id into p1;
  insert into pacientes (clinica_id, nome, responsavel, convenio, exemplo)
    values (c, 'Helena Rocha', 'Bruno Rocha', 'Unimed', true) returning id into p2;
  insert into pacientes (clinica_id, nome, responsavel, convenio, exemplo, cpf_pagador, nome_pagador)
    values (c, 'Alice Menezes', 'Patrícia Menezes', 'Particular', true, '00000000191', 'Patrícia Menezes') returning id into p3;
  insert into pacientes (clinica_id, nome, responsavel, convenio, exemplo)
    values (c, 'Davi Lins', 'Renata Lins', 'Particular', true) returning id into p4;
  insert into pacientes (clinica_id, nome, responsavel, convenio, exemplo, observacoes)
    values (c, 'Laura Cavalcante', 'Diego Cavalcante', 'Unimed', true, 'Encaminhada pela pediatra.') returning id into p5;

  insert into vinculos (clinica_id, paciente_id, profissional_id, terapia, valor_sessao, inicio_convenio)
    values (c, p1, eu, 'Fonoaudiologia', 60, (date_trunc('month', hoje) - interval '2 months')::date + 1) returning id into v1;
  insert into vinculos (clinica_id, paciente_id, profissional_id, terapia, valor_sessao, inicio_convenio)
    values (c, p2, eu, 'Fonoaudiologia', 60, (date_trunc('month', hoje) - interval '3 months')::date + 3) returning id into v2;
  insert into vinculos (clinica_id, paciente_id, profissional_id, terapia, valor_sessao)
    values (c, p3, eu, 'Fonoaudiologia', 180) returning id into v3;
  insert into vinculos (clinica_id, paciente_id, profissional_id, terapia, situacao, prioridade, entrada_fila)
    values (c, p4, eu, 'Fonoaudiologia', 'fila', 'alta', hoje - 40);
  insert into vinculos (clinica_id, paciente_id, profissional_id, terapia, situacao, entrada_fila)
    values (c, p5, null, 'Terapia ocupacional', 'fila', hoje - 75);

  -- sessões: semana passada (realizadas) e hoje/amanhã
  insert into sessoes (clinica_id, vinculo_id, paciente_id, profissional_id, terapia, data, hora, status)
  values
    (c, v1, p1, eu, 'Fonoaudiologia', hoje - 7, '08:00', 'presente'),
    (c, v2, p2, eu, 'Fonoaudiologia', hoje - 7, '09:00', 'falta'),
    (c, v3, p3, eu, 'Fonoaudiologia', hoje - 7, '10:00', 'presente'),
    (c, v1, p1, eu, 'Fonoaudiologia', hoje, '08:00', 'confirmada'),
    (c, v2, p2, eu, 'Fonoaudiologia', hoje, '09:00', 'agendada'),
    (c, v3, p3, eu, 'Fonoaudiologia', hoje, '10:00', 'agendada'),
    (c, v1, p1, eu, 'Fonoaudiologia', hoje + 7, '08:00', 'agendada');

  select id into s from sessoes where vinculo_id = v3 and data = hoje - 7;
  insert into pagamentos (sessao_id, clinica_id, profissional_id, valor, status, forma, pago_em)
    values (s, c, eu, 180, 'pago', 'Pix', hoje - 7);

  -- Unimed: guia deste mês recebida para o Theo; Helena ainda sem guia
  insert into unimed_ciclos (vinculo_id, mes, clinica_id, profissional_id, pedido_em, msg_em, guia_em)
    values (v1, m1, c, eu, to_date(m1 || '-19', 'YYYY-MM-DD'), now() - interval '20 days', to_date(m0 || '-01', 'YYYY-MM-DD'));
  insert into unimed_ciclos (vinculo_id, mes, clinica_id, profissional_id, pedido_em)
    values (v2, m1, c, eu, to_date(m1 || '-20', 'YYYY-MM-DD'));
end $$;

create or replace function public.apagar_exemplos() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_dona() then raise exception 'Só a dona da clínica pode apagar exemplos'; end if;
  delete from pacientes where clinica_id = public.minha_clinica() and exemplo;
end $$;

-- ---------- permissões das funções ----------
revoke all on function public.criar_clinica(text, text) from public, anon;
revoke all on function public.entrar_clinica(text, text, text) from public, anon;
revoke all on function public.meu_status() from public, anon;
revoke all on function public.novo_codigo() from public, anon;
revoke all on function public.carregar_exemplos() from public, anon;
revoke all on function public.apagar_exemplos() from public, anon;
grant execute on function public.criar_clinica(text, text) to authenticated;
grant execute on function public.entrar_clinica(text, text, text) to authenticated;
grant execute on function public.meu_status() to authenticated;
grant execute on function public.novo_codigo() to authenticated;
grant execute on function public.carregar_exemplos() to authenticated;
grant execute on function public.apagar_exemplos() to authenticated;

grant select, insert, update, delete on
  public.clinicas, public.membros, public.pacientes, public.vinculos, public.sessoes,
  public.evolucoes, public.pagamentos, public.unimed_ciclos, public.notas_fiscais, public.reunioes,
  public.prontuarios, public.documentos, public.metas, public.metas_notas
  to authenticated;
revoke all on
  public.clinicas, public.membros, public.pacientes, public.vinculos, public.sessoes,
  public.evolucoes, public.pagamentos, public.unimed_ciclos, public.notas_fiscais, public.reunioes,
  public.prontuarios, public.documentos, public.metas, public.metas_notas
  from anon;

-- ---------- bucket de áudio das reuniões (Supabase Storage) ----------
-- Privado. A dona envia; a função no servidor lê e apaga depois de transcrever.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
      values ('reunioes', 'reunioes', false, 26214400)
      on conflict (id) do update set public = false, file_size_limit = 26214400;
    drop policy if exists reunioes_upload on storage.objects;
    drop policy if exists reunioes_ler on storage.objects;
    drop policy if exists reunioes_apagar on storage.objects;
    create policy reunioes_upload on storage.objects for insert to authenticated
      with check (bucket_id = 'reunioes' and public.eh_dona() and (storage.foldername(name))[1] = public.minha_clinica()::text);
    create policy reunioes_ler on storage.objects for select to authenticated
      using (bucket_id = 'reunioes' and public.eh_dona() and (storage.foldername(name))[1] = public.minha_clinica()::text);
    create policy reunioes_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'reunioes' and public.eh_dona() and (storage.foldername(name))[1] = public.minha_clinica()::text);
    -- documentos dos pacientes: <clinica>/<paciente>/<arquivo>
    insert into storage.buckets (id, name, public, file_size_limit)
      values ('documentos', 'documentos', false, 26214400)
      on conflict (id) do update set public = false, file_size_limit = 26214400;
    drop policy if exists documentos_upload on storage.objects;
    drop policy if exists documentos_ler on storage.objects;
    drop policy if exists documentos_apagar on storage.objects;
    create policy documentos_upload on storage.objects for insert to authenticated
      with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.minha_clinica()::text
        and (public.eh_dona() or public.atende(((storage.foldername(name))[2])::uuid)));
    create policy documentos_ler on storage.objects for select to authenticated
      using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.minha_clinica()::text
        and (public.eh_dona() or public.atende(((storage.foldername(name))[2])::uuid)));
    create policy documentos_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'documentos' and (storage.foldername(name))[1] = public.minha_clinica()::text
        and (public.eh_dona() or owner = auth.uid()));
  end if;
end $$;
