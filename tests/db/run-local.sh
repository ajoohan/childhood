#!/usr/bin/env bash
# 임시 Postgres를 띄워 Supabase와 같은 역할(anon/authenticated)·auth.uid()를 흉내 낸 뒤
# supabase/migrations/*.sql 과 tests/db/rls.sql 을 돌린다. 끝나면 임시 데이터베이스를 정리한다.
# 필요: Postgres 서버 바이너리(예: /usr/lib/postgresql/16/bin). root면 postgres 계정으로 실행한다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$PGBIN" ] || { echo "Postgres 서버 바이너리를 찾지 못했습니다" >&2; exit 2; }

DIR="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
if [ "$(id -u)" = 0 ]; then
  chown postgres "$DIR"
  RUN=(runuser -u postgres --)
else
  RUN=()
fi
cleanup() { "${RUN[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

"${RUN[@]}" "$PGBIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -t -A)

"${PSQL[@]}" -d postgres <<'SQL'
create role anon nologin;
create role authenticated nologin;
SQL

MIGRATIONS="${MIGRATIONS_DIR:-$ROOT/supabase/migrations}"

# 두 가지 프로젝트 기본값에서 모두 확인한다.
#  legacy: 예전 Supabase — public의 새 표·함수에 anon/authenticated 권한이 자동으로 붙는다(마이그레이션이 anon 것을 걷어내야 한다).
#  optin : 새 Supabase — 자동 권한이 없다(마이그레이션이 필요한 권한을 직접 줘야 한다).
for MODE in legacy optin; do
  DB="app_$MODE"
  "${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null
  "${PSQL[@]}" -d "$DB" <<'SQL'
create extension if not exists pgcrypto;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
SQL
  if [ "$MODE" = legacy ]; then
    "${PSQL[@]}" -d "$DB" <<'SQL'
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
SQL
  else
    "${PSQL[@]}" -d "$DB" -c "alter default privileges revoke execute on functions from public" >/dev/null
  fi
  for f in "$MIGRATIONS"/*.sql; do
    echo "[$MODE] migration: $(basename "$f")"
    "${PSQL[@]}" -d "$DB" -f "$f"
  done
  "${PSQL[@]}" -d "$DB" -f "$ROOT/tests/db/rls.sql"
done
