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

"${PSQL[@]}" -d postgres -c "create database app" >/dev/null
"${PSQL[@]}" -d app <<'SQL'
create extension if not exists pgcrypto;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase의 기본 권한: public 스키마의 새 표·함수는 anon/authenticated가 쓸 수 있다.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
SQL

MIGRATIONS="${MIGRATIONS_DIR:-$ROOT/supabase/migrations}"
for f in "$MIGRATIONS"/*.sql; do
  echo "migration: $(basename "$f")"
  "${PSQL[@]}" -d app -f "$f"
done
"${PSQL[@]}" -d app -f "$ROOT/tests/db/rls.sql"
