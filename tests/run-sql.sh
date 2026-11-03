#!/usr/bin/env bash
# Testa o schema e as regras de acesso num Postgres local (ou no serviço do CI).
# Uso: PGURL=postgres://user:pass@host:5432/postgres tests/run-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PGURL="${PGURL:-postgres://postgres:postgres@localhost:5432/postgres}"
psql "$PGURL" -v ON_ERROR_STOP=0 -q -c 'drop database if exists vincla_test' -c 'create database vincla_test'
TEST="${PGTEST:-${PGURL%/*}/vincla_test}"
psql "$TEST" -q -f tests/stub.sql -f supabase/schema.sql 2>&1 | grep -i "error" | grep -v "already exists" && { echo "schema com erro"; exit 1; } || true
psql "$TEST" -f tests/test.sql > /tmp/vincla-test.out 2>&1 || true
# o que tem que dar certo
check(){ grep -A2 "$1" /tmp/vincla-test.out | grep -q "$2" || { echo "FALHOU: $1 esperava $2"; grep -A3 "$1" /tmp/vincla-test.out; exit 1; }; }
check "pront_tem_paciente" "t"
check "livia_pront" " 0 "
check "dona_pront" " 1 "
check "rafael_notas" " 2"
check "dona_ve_auditoria" "t"
check "assinatura_status" "teste"
check "admin_ve_clinicas" " 2"
check "status_apos" "ativa"
check "livia_admin_clinicas" " 0"
# o que tem que ser negado
grep -q 'livia_auditoria' /tmp/vincla-test.out
grep -q "Só a administração do Vincla" /tmp/vincla-test.out || { echo "FALHOU: profissional conseguiu mexer em assinatura"; exit 1; }
grep -q 'violates row-level security policy for table "metas_notas"' /tmp/vincla-test.out || { echo "FALHOU: nota em meta alheia passou"; exit 1; }
echo "SQL OK"
