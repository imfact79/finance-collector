-- 코스피 월말 종가와 국고채 10년물 월별 금리. 출처: 한국은행 ECOS.
create table if not exists public.monthly_stats (
  month text primary key check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kospi_close numeric not null check (kospi_close > 0),
  bond_yield numeric not null
);

alter table public.monthly_stats enable row level security;

-- 로그인 없이 누구나 읽을 수 있고, 쓰기 정책은 두지 않는다.
create policy "monthly_stats are readable by everyone"
  on public.monthly_stats
  for select
  to anon, authenticated
  using (true);
