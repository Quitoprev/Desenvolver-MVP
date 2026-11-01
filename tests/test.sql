\set ON_ERROR_STOP 0
\set QUIET on
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
set role authenticated;
-- dona cria clínica e carrega exemplos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.criar_clinica('Clínica Crescer','Mariana') is not null as criou;
select public.carregar_exemplos();
select count(*) as pacientes_dona from pacientes;
select codigo_convite as codigo from clinicas \gset
-- fono, TO, recepção entram
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b'); select public.entrar_clinica(:'codigo','Lívia');
select count(*) as fono_pendente_ve_pacientes from pacientes;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c'); select public.entrar_clinica(lower(:'codigo'),'Rafael','Terapia ocupacional');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d'); select public.entrar_clinica(:'codigo','Bia','Recepcionista');
-- outra clínica
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e'); select public.criar_clinica('Outra','Zeca');
select count(*) as outra_ve_pacientes from pacientes;
-- dona aprova
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update membros set ativo=true where nome in ('Lívia','Rafael','Bia');
select nome, papel, especialidade from membros where nome in ('Bia','Rafael') order by nome;
update membros set ativo=true where nome='Bia';
update membros set repasse_pct=30 where nome='Lívia';
-- dona liga Theo também à TO (Rafael)
insert into vinculos(paciente_id, profissional_id, terapia) select id,'00000000-0000-0000-0000-00000000000c','Terapia ocupacional' from pacientes where nome='Theo Albuquerque';
insert into sessoes(vinculo_id,data,hora) select id, current_date, '14:00' from vinculos where terapia='Terapia ocupacional' and paciente_id=(select id from pacientes where nome='Theo Albuquerque');
-- Rafael (TO)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select string_agg(nome, ', ' order by nome) as rafael_ve_pacientes from pacientes;
select count(*) as rafael_ve_sessoes from sessoes;
select count(*) as rafael_ve_evolucoes_antes from evolucoes;
select count(*) as rafael_ve_pagamentos from pagamentos;
select count(*) as rafael_ve_vinculos from vinculos;
-- Rafael tenta ver/alterar sessões da dona
update sessoes set status='falta' where profissional_id='00000000-0000-0000-0000-00000000000a';
select 'rafael alterou sessões alheias? ' || (select count(*) from sessoes where status='falta')::text;
-- Rafael escreve evolução da sessão dele
insert into evolucoes(sessao_id, atividades) select id,'TO: integração sensorial' from sessoes limit 1;
-- Rafael tenta criar sessão num vínculo da dona (deve falhar)
insert into sessoes(vinculo_id,data,hora) select v.id, current_date, '15:00' from vinculos v where v.terapia='Fonoaudiologia' limit 1;
-- Rafael cria paciente próprio e vínculo
insert into pacientes(id,nome,clinica_id) values ('11111111-1111-1111-1111-111111111111','Paciente do Rafael','00000000-0000-0000-0000-000000000000');
insert into vinculos(paciente_id, profissional_id, terapia) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000c','Terapia ocupacional');
select count(*) as rafael_ve_paciente_novo from pacientes where id='11111111-1111-1111-1111-111111111111';
-- Rafael tenta pôr vínculo em nome da Lívia (deve falhar)
insert into vinculos(paciente_id, profissional_id, terapia) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000b','Fono');
-- Rafael tenta se promover (deve não alterar)
update membros set papel='dona' where user_id=auth.uid();
-- Recepção
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as recep_ve_pacientes, (select count(*) from sessoes) as recep_ve_sessoes, (select count(*) from pagamentos) as recep_ve_pagamentos, (select count(*) from evolucoes) as recep_ve_evolucoes, (select count(*) from unimed_ciclos) as recep_ve_ciclos, (select count(*) from reunioes) as recep_ve_reunioes, (select count(*) from notas_fiscais) as recep_ve_notas from pacientes;
update sessoes set status='confirmada', msg_em=now() where status='agendada';
select count(*) as recep_confirmou from sessoes where status='confirmada';
update membros set papel='dona' where user_id=auth.uid();
select papel as papel_bia_depois from membros where user_id=auth.uid();
-- Dona: vê evolução do Rafael, pagamentos, e papel do Rafael
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select count(*) as dona_ve_evolucoes, (select count(*) from pagamentos) as dona_ve_pagamentos, (select papel from membros where nome='Rafael') as papel_rafael, (select count(*) from pacientes) as dona_ve_pacientes from evolucoes;
-- Dona registra evolução da sessão de hoje dela; Lívia (fono) não atende Theo -> não vê
insert into evolucoes(sessao_id, atividades) select id,'Fono' from sessoes where profissional_id=auth.uid() and data=current_date and hora='08:00';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select count(*) as livia_ve_pacientes, (select count(*) from evolucoes) as livia_ve_evolucoes from pacientes;
-- Rafael (atende Theo) vê a evolução de fono do Theo
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select count(*) as rafael_ve_evolucoes_do_theo from evolucoes;
-- Outra clínica não vê nada
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select count(*) as outra_pac, (select count(*) from sessoes) s, (select count(*) from membros) m from pacientes;
-- anon
reset role; set role anon;
select count(*) from pacientes;
reset role; set role authenticated;
-- dona apaga exemplos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.apagar_exemplos();
select count(*) as sobra_pacientes from pacientes;
select public.novo_codigo() is not null as novo_codigo_ok;
-- checagens extras
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select count(*) as rafael_vinculos_final, (select count(*) from evolucoes) as rafael_evolucoes_final, (select string_agg(terapia,',') from vinculos) as rafael_terapias from vinculos;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as bia_pacientes, (select count(*) from sessoes) as bia_sessoes, (select count(*) from evolucoes) as bia_evolucoes, (select count(*) from pagamentos) as bia_pagamentos, (select count(*) from reunioes) as bia_reunioes, (select papel from membros where user_id=auth.uid()) as papel_bia from pacientes;
update sessoes set status='confirmada' where status='agendada';
select count(*) as bia_confirmou from sessoes where status='confirmada';
-- fiscal
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.carregar_exemplos();
update membros set repasse_pct=35 where nome='Rafael';
select sessao_id as sid from pagamentos limit 1 \gset
insert into notas_fiscais(sessao_ids, valor, tomador_cpf, tomador_nome) values (array[:'sid'::uuid], 180, '00000000191', 'Patrícia');
select status as nota_status, (select count(*) from pagamentos where nota_id is not null) as pag_com_nota from notas_fiscais;
-- duplicar deve falhar
insert into notas_fiscais(sessao_ids, valor) values (array[:'sid'::uuid], 180);
-- profissional não cria nota nem vê a da dona
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into sessoes(vinculo_id,data,hora,status) select id, current_date-1, '15:00','presente' from vinculos where profissional_id=auth.uid() limit 1;
select count(*) as rafael_sessoes_agora from sessoes;
insert into notas_fiscais(sessao_ids, valor) select array[id], 70 from sessoes where profissional_id=auth.uid() limit 1;
select count(*) as rafael_ve_notas from notas_fiscais;
update membros set cpf='12345678901', registro='CREFITO 1-1234' where user_id=auth.uid();
update membros set repasse_pct=0 where user_id=auth.uid();
update membros set papel='dona' where user_id=auth.uid();
update membros set recebe='pf' where user_id=auth.uid();
select cpf, repasse_pct as rafael_repasse_depois, papel, recebe from membros where user_id=auth.uid();
-- dona apaga nota pendente -> libera sessão
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from notas_fiscais;
select count(*) as pag_com_nota_depois from pagamentos where nota_id is not null;
-- reuniões
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into reunioes(titulo, participantes) values ('Reunião de equipe', 'Mariana, Lívia, Rafael');
select count(*) as dona_reunioes, (select clinica_id is not null from reunioes limit 1) as reuniao_tem_clinica from reunioes;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select count(*) as rafael_reunioes from reunioes;
insert into reunioes(titulo) values ('tentativa');
update reunioes set ata='x';
-- prontuário e documentos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select id as vr from vinculos where profissional_id=auth.uid() limit 1 \gset
insert into prontuarios(vinculo_id, anamnese) values (:'vr', 'Anamnese do Rafael');
select paciente_id is not null as pront_tem_paciente, profissional_id=auth.uid() as pront_prof_ok from prontuarios;
insert into documentos(paciente_id, nome, caminho) select paciente_id, 'laudo.pdf', 'x/y/laudo.pdf' from vinculos where id=:'vr';
select count(*) as rafael_docs from documentos;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select count(*) as livia_pront, (select count(*) from documentos) as livia_docs from prontuarios;
insert into prontuarios(vinculo_id, anamnese) values (:'vr', 'tentativa');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as bia_pront, (select count(*) from documentos) as bia_docs from prontuarios;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select count(*) as dona_pront, (select count(*) from documentos) as dona_docs from prontuarios;
-- metas e notas
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into metas(vinculo_id, area, descricao) values (:'vr', 'sensorial', 'Registro no sistema tátil');
select id as meta from metas limit 1 \gset
insert into metas_notas(meta_id, data, nota) values (:'meta', '2026-06-30', 2), (:'meta', '2026-12-31', 4);
select paciente_id is not null as meta_tem_paciente, profissional_id=auth.uid() as meta_prof_ok from metas;
select count(*) as rafael_notas from metas_notas;
insert into metas_notas(meta_id, data, nota) values (:'meta', '2027-01-01', 9);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select count(*) as livia_metas, (select count(*) from metas_notas) as livia_notas from metas;
insert into metas_notas(meta_id, data, nota) values (:'meta', '2027-02-01', 3);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select count(*) as bia_metas from metas;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select count(*) as dona_metas, (select count(*) from metas_notas) as dona_notas from metas;
-- auditoria, assinatura e admin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select count(*) > 0 as dona_ve_auditoria, (select count(*) from auditoria where acao='alterar') > 0 as tem_alteracoes from auditoria;
select public.registrar_acesso('ver','prontuarios',:'vr',null,null);
select count(*) as acessos_registrados from auditoria where acao='ver';
select (meu_status()->'assinatura'->>'status') as assinatura_status, (meu_status()->>'admin') as sou_admin;
insert into auditoria(clinica_id, acao, tabela) values (minha_clinica(),'x','y');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select count(*) as livia_auditoria from auditoria;
-- admin do Rythmos
reset role;
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000f') on conflict do nothing;
insert into admins(user_id, nome) values ('00000000-0000-0000-0000-00000000000f','Admin Rythmos');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select json_array_length(admin_clinicas()) as admin_ve_clinicas, (admin_clinicas()->0->>'pacientes')::int > 0 as com_pacientes;
select admin_assinatura((admin_clinicas()->0->>'id')::uuid,'clinica','ativa',null,'2027-01-31',349,'piloto');
select (admin_clinicas()->0->'assinatura'->>'status') as status_apos;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select admin_assinatura((select clinica_id from membros where user_id=auth.uid()),'rede','ativa',null,null,null,null);
select json_array_length(admin_clinicas()) as livia_admin_clinicas;
