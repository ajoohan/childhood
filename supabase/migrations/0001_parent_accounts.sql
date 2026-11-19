-- 부모 계정 1단계 (docs/parent-accounts.md)
--  - consents      : 부모가 어떤 문서(약관·개인정보·국외이전)의 어떤 버전에 언제 동의했는지(추가만 가능한 기록)
--  - account_state : 이 기기에서 올린 기록의 스냅샷 1건(아이 프로필·별·콜렉션 등). 대화 내용·안전 알림 발췌·PIN은 넣지 않는다.
--  - save_account_state / delete_my_account : 낙관적 잠금 저장, 내 계정과 모든 데이터 삭제
-- 모든 표는 행 단위 보안(RLS)으로 로그인한 부모 본인 행만 읽고 쓴다.

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
-- 수정·삭제 정책은 두지 않는다: 동의 기록은 고칠 수 없다. 계정을 삭제하면 함께 지워진다.

create table public.account_state (
  parent_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  rev integer not null default 1 check (rev >= 1),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 500000),
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

-- 저장: 내가 마지막으로 본 rev(처음이면 0)와 서버 rev가 같을 때만 쓴다. 다르면 다른 기기가 먼저 저장한 것이다.
create or replace function public.save_account_state(expected_rev integer, new_data jsonb)
returns integer
language plpgsql
security invoker
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
    insert into public.account_state (parent_id, rev, data) values (uid, 1, new_data);
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
