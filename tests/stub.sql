create schema auth;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create role anon nologin; create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','dona@x'),
 ('00000000-0000-0000-0000-00000000000b','fono@x'),
 ('00000000-0000-0000-0000-00000000000c','to@x'),
 ('00000000-0000-0000-0000-00000000000d','recep@x'),
 ('00000000-0000-0000-0000-00000000000e','outra@x');
