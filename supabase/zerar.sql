-- Rythmos — ZERAR o banco (apaga TODOS os dados do app). Depois, rode o schema.sql.
-- As contas de login (auth.users) continuam; a clínica e a equipe são criadas de novo no app.
begin;

-- Arquivos guardados (buckets 'reunioes' e 'documentos'): o Supabase não deixa apagar por SQL.
-- Se quiser limpá-los, use Storage no menu da esquerda → bucket → selecionar tudo → Delete. Não é obrigatório.

-- tabelas do app (cascade derruba policies, triggers, índices e chaves)
drop table if exists public.auditoria     cascade;
drop table if exists public.assinaturas   cascade;
drop table if exists public.admins        cascade;
drop table if exists public.metas_notas   cascade;
drop table if exists public.metas         cascade;
drop table if exists public.documentos    cascade;
drop table if exists public.prontuarios   cascade;
drop table if exists public.reunioes      cascade;
drop table if exists public.notas_fiscais cascade;
drop table if exists public.unimed_ciclos cascade;
drop table if exists public.pagamentos    cascade;
drop table if exists public.evolucoes     cascade;
drop table if exists public.sessoes       cascade;
drop table if exists public.vinculos      cascade;
drop table if exists public.pacientes     cascade;
drop table if exists public.membros       cascade;
drop table if exists public.clinicas      cascade;

-- funções do app (todas as versões/assinaturas)
do $$ declare r record; begin
  for r in
    select p.oid::regprocedure as f
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'minha_clinica','meu_papel','eh_dona','eh_equipe','eh_admin','atende','paciente_da_clinica','membro_da_clinica',
      'criar_clinica','entrar_clinica','meu_status','novo_codigo','carregar_exemplos','apagar_exemplos',
      'registrar_acesso','sou_admin','admin_clinicas','admin_assinatura',
      'tg_clinica','tg_pacientes','tg_vinculos','tg_sessoes','tg_evolucoes','tg_pagamentos','tg_ciclos','tg_notas','tg_notas_ai',
      'tg_reunioes','tg_prontuarios','tg_documentos','tg_metas','tg_metas_notas','tg_auditoria','tg_da_sessao','tg_notas_del','tg_vinculo_prof')
  loop execute 'drop function if exists ' || r.f || ' cascade'; end loop;
end $$;

commit;
-- Agora rode o schema.sql inteiro.
