-- 부모 계정 1단계 (docs/parent-accounts.md)
--  - consents      : 부모가 어떤 문서(약관·개인정보·국외이전)의 어떤 버전에 언제 동의했는지(추가만 가능한 기록)
--  - account_state : 이 기기에서 올린 기록의 스냅샷 1건(아이 프로필·별·콜렉션 등). 대화 내용·안전 알림 발췌·PIN은 넣지 않는다.
--  - save_account_state / delete_my_account : 낙관적 잠금 저장, 내 계정과 모든 데이터 삭제
-- 모든 표는 행 단위 보안(RLS)으로 로그인한 부모 본인 행만 읽고 쓴다.
-- 권한(grant)도 여기서 직접 준다: 새 Supabase 프로젝트는 public 스키마의 표·함수에 자동으로 권한을 주지 않으므로
-- (주지 않으면 42501 permission denied), 필요한 최소 권한만 로그인한 사용자(authenticated)에게 준다. anon에는 주지 않는다.

create table public.consents (
  id bigint generated always as identity primary key,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy', 'overseas_transfer')),
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now()
);
create index consents_parent_id_idx on public.consents (parent_id);
alter table public.consents enable row level security;

create policy consents_select_own on public.consents
  for select to authenticated using ((select auth.uid()) = parent_id);
create policy consents_insert_own on public.consents
  for insert to authenticated with check ((select auth.uid()) = parent_id);
-- 수정·삭제는 정책도 권한도 두지 않는다: 동의 기록은 고칠 수 없다. 계정을 삭제하면 함께 지워진다.
revoke all on table public.consents from public, anon, authenticated;
-- 넣을 수 있는 칸은 문서와 버전뿐이다. 동의 시각(accepted_at)·부모(parent_id)는 서버 기본값으로만 정해진다
-- (모든 칸을 열어 두면 동의 시각을 과거로 꾸며 넣을 수 있었다).
grant select on table public.consents to authenticated;
grant insert (document, version) on table public.consents to authenticated;

-- 한 부모가 남길 수 있는 동의 기록 수의 상한. 문서 3종 × 버전 몇 개면 충분하다.
-- 상한이 없으면 로그인한 누구나 요청을 반복해 데이터베이스를 채울 수 있다.
create or replace function public.consents_cap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.consents c where c.parent_id = new.parent_id) >= 60 then
    raise exception 'too many consent records' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function public.consents_cap() from public, anon, authenticated;
create trigger consents_cap before insert on public.consents
  for each row execute function public.consents_cap();

create table public.account_state (
  parent_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  rev integer not null default 1 check (rev >= 1),
  -- 크기는 글로 바꾼 길이(바이트)로 잰다. 앱은 이보다 작은 300,000바이트에서 먼저 막는다(src/lib/snapshot.js).
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 500000),
  updated_at timestamptz not null default now()
);
alter table public.account_state enable row level security;

create policy account_state_select_own on public.account_state
  for select to authenticated using ((select auth.uid()) = parent_id);
create policy account_state_insert_own on public.account_state
  for insert to authenticated with check ((select auth.uid()) = parent_id);
create policy account_state_update_own on public.account_state
  for update to authenticated
  using ((select auth.uid()) = parent_id) with check ((select auth.uid()) = parent_id);
create policy account_state_delete_own on public.account_state
  for delete to authenticated using ((select auth.uid()) = parent_id);
revoke all on table public.account_state from public, anon, authenticated;
-- 쓰기는 save_account_state 함수로만 한다(직접 쓰면 rev·updated_at을 마음대로 정해 다른 기기의 충돌 확인을 속일 수 있었다).
grant select, delete on table public.account_state to authenticated;

-- 저장: 내가 마지막으로 본 rev(처음이면 0)와 서버 rev가 같을 때만 쓴다. 다르면 다른 기기가 먼저 저장한 것이다.
create or replace function public.save_account_state(expected_rev integer, new_data jsonb)
returns integer
language plpgsql
security definer -- 표에 직접 쓰기 권한이 없으므로 함수가 대신 쓴다. 행은 auth.uid() 본인 것으로만 정한다.
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cur integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select rev into cur from public.account_state where parent_id = uid for update;

  if not found then
    if expected_rev <> 0 then
      raise exception 'conflict' using errcode = '40001';
    end if;
    begin
      insert into public.account_state (parent_id, rev, data) values (uid, 1, new_data);
    exception when unique_violation then
      -- 두 기기가 동시에 처음 저장했다: 늦은 쪽은 충돌로 알린다
      raise exception 'conflict' using errcode = '40001';
    end;
    return 1;
  end if;

  if cur <> expected_rev then
    raise exception 'conflict' using errcode = '40001';
  end if;

  update public.account_state
     set rev = cur + 1, data = new_data, updated_at = now()
   where parent_id = uid;
  return cur + 1;
end;
$$;

revoke all on function public.save_account_state(integer, jsonb) from public, anon;
grant execute on function public.save_account_state(integer, jsonb) to authenticated;

-- 계정 삭제: 로그인한 본인의 계정과 연결된 모든 데이터(동의 기록 포함)를 지운다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid; -- consents, account_state는 on delete cascade
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
