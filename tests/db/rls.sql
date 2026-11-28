-- 부모 계정 스키마(supabase/migrations)의 행 단위 보안과 함수를 확인한다.
-- 실행: tests/db/run-local.sh  (임시 Postgres에 Supabase와 같은 역할·auth.uid()를 흉내 낸 뒤 이 파일을 돌린다)
\set ON_ERROR_STOP on

create or replace function pg_temp.expect_error(stmt text, want_state text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'EXPECTED ERROR % BUT STATEMENT SUCCEEDED: %', want_state, stmt;
exception when others then
  if sqlstate = 'P0001' and sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlstate <> want_state then
    raise exception 'EXPECTED SQLSTATE % BUT GOT % (%): %', want_state, sqlstate, sqlerrm, stmt;
  end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to public;

-- 두 부모
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com');

-- ── A로 로그인 ──
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

-- 동의 기록: 내 것만 추가하고 읽는다 (parent_id는 기본값으로 내 id)
insert into public.consents (document, version) values ('terms', '2026-11-draft'), ('privacy', '2026-11-draft');
do $$ begin
  assert (select count(*) from public.consents) = 2, 'A는 자기 동의 2건을 본다';
end $$;
select pg_temp.expect_error($$insert into public.consents (parent_id, document, version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'terms', 'x')$$, '42501');
select pg_temp.expect_error($$insert into public.consents (document, version) values ('아무문서', 'x')$$, '23514');

-- 동의 기록은 고치거나 지울 수 없다 (권한 자체가 없다)
select pg_temp.expect_error($$update public.consents set version = 'tampered'$$, '42501');
select pg_temp.expect_error($$delete from public.consents$$, '42501');
do $$ begin
  assert (select count(*) from public.consents where version = 'tampered') = 0, '수정이 반영됐다';
  assert (select count(*) from public.consents) = 2, '동의 기록이 지워졌다';
end $$;

-- 동의 기록 수에는 상한이 있다: 한 번에 많이 넣어도, 나눠 넣어도 60건을 넘지 못한다
select pg_temp.expect_error($$insert into public.consents (document, version) select 'terms', 'v' || g from generate_series(1, 100) g$$, '54000');
insert into public.consents (document, version) select 'terms', 'v' || g from generate_series(1, 58) g;
select pg_temp.expect_error($$insert into public.consents (document, version) values ('terms', 'one-too-many')$$, '54000');
do $$ begin
  assert (select count(*) from public.consents) = 60, '상한까지만 들어간다';
end $$;

-- 스냅샷 저장: 낙관적 잠금
do $$
declare r int;
begin
  r := public.save_account_state(0, '{"kids":{"k":{"name":"지안"}}}'::jsonb);
  assert r = 1, '처음 저장은 rev 1';
  r := public.save_account_state(1, '{"kids":{"k":{"name":"지안","stars":3}}}'::jsonb);
  assert r = 2, '다음 저장은 rev 2';
end $$;
select pg_temp.expect_error($$select public.save_account_state(1, '{}'::jsonb)$$, '40001'); -- 오래된 rev
select pg_temp.expect_error($$select public.save_account_state(0, '{}'::jsonb)$$, '40001'); -- 이미 있는데 0
select pg_temp.expect_error($$select public.save_account_state(2, '[]'::jsonb)$$, '23514');  -- 객체가 아님
select pg_temp.expect_error($$select public.save_account_state(2, jsonb_build_object('big', repeat('가', 200000)))$$, '23514'); -- 한글 20만 자 = 60만 바이트
do $$ begin
  assert (select rev from public.account_state) = 2, '실패한 저장이 rev를 바꿨다';
end $$;

-- 남의 행으로 바꿀 수 없다
select pg_temp.expect_error($$update public.account_state set parent_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, '42501');
select pg_temp.expect_error($$insert into public.account_state (parent_id, data) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{}')$$, '42501');

-- 자기 행이라도 표에 직접 쓰지 못한다(저장 함수로만): rev를 꾸며 다른 기기의 충돌 확인을 속일 수 없다
select pg_temp.expect_error($$update public.account_state set rev = 999999$$, '42501');
select pg_temp.expect_error($$insert into public.account_state (data) values ('{}')$$, '42501');
do $$ begin
  assert (select rev from public.account_state) = 2, '직접 쓰기가 rev를 바꿨다';
end $$;

-- 동의 기록은 문서·버전만 넣는다: 동의 시각이나 부모를 꾸며 넣을 수 없다
select pg_temp.expect_error($$insert into public.consents (document, version, accepted_at) values ('terms', 'x', '2001-01-01')$$, '42501');

-- ── B로 전환: A의 것이 보이지 않는다 ──
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
do $$
declare n int;
begin
  assert (select count(*) from public.consents) = 0, 'B가 A의 동의 기록을 본다';
  assert (select count(*) from public.account_state) = 0, 'B가 A의 스냅샷을 본다';
  delete from public.account_state; get diagnostics n = row_count;
  assert n = 0, 'B가 A의 스냅샷을 삭제했다';
  assert public.save_account_state(0, '{"kids":{}}'::jsonb) = 1, 'B는 자기 스냅샷을 rev 1로 시작한다';
end $$;

-- ── 로그인하지 않은 사용자(anon) ──
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($$select count(*) from public.consents$$, '42501');
select pg_temp.expect_error($$select count(*) from public.account_state$$, '42501');
select pg_temp.expect_error($$insert into public.consents (document, version) values ('terms', 'x')$$, '42501');
select pg_temp.expect_error($$select public.save_account_state(0, '{}'::jsonb)$$, '42501');
select pg_temp.expect_error($$select public.delete_my_account()$$, '42501');

-- ── A가 계정 삭제 ──
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0, 'A의 계정이 남았다';
  assert (select count(*) from public.consents where parent_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0, 'A의 동의 기록이 남았다';
  assert (select count(*) from public.account_state where parent_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 0, 'A의 스냅샷이 남았다';
  assert (select count(*) from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 1, 'B의 계정이 사라졌다';
  assert (select count(*) from public.account_state where parent_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 1, 'B의 스냅샷이 사라졌다';
end $$;

\echo 'RLS OK'
