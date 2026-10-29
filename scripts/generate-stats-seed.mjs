// ECOS에서 코스피 월말 종가와 국고채 10년물 월별 금리를 받아 supabase/seed.sql(upsert)을 만든다.
// 실행: node --env-file=.env.local scripts/generate-stats-seed.mjs
import { writeFileSync } from "node:fs";

const key = process.env.ECOS_API_KEY;
if (!key) throw new Error("ECOS_API_KEY must be set in .env.local");

const SERIES = {
  bondYield: "721Y001/M/200001/203012/5050000", // 국고채(10년)
  kospiClose: "901Y014/M/200001/203012/1070000", // KOSPI_종가
};

async function fetchSeries(path) {
  const res = await fetch(`https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/1000/${path}`);
  const body = await res.json();
  if (!body.StatisticSearch) throw new Error(`ECOS 응답 오류: ${JSON.stringify(body.RESULT ?? body)}`);
  return new Map(body.StatisticSearch.row.map((r) => [r.TIME, Number(r.DATA_VALUE)]));
}

const [bond, kospi] = await Promise.all([fetchSeries(SERIES.bondYield), fetchSeries(SERIES.kospiClose)]);
const months = [...kospi.keys()].filter((m) => bond.has(m)).sort();

const monthIndex = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(4));
months.forEach((m, i) => {
  if (i > 0 && monthIndex(m) !== monthIndex(months[i - 1]) + 1) {
    throw new Error(`월이 연속되지 않습니다: ${months[i - 1]} -> ${m}`);
  }
});

const values = months
  .map((m) => `  ('${m.slice(0, 4)}-${m.slice(4)}', ${kospi.get(m)}, ${bond.get(m)})`)
  .join(",\n");

writeFileSync(
  "supabase/seed.sql",
  `-- scripts/generate-stats-seed.mjs가 ECOS에서 받아 만든 파일이다. 직접 고치지 않는다.
insert into public.monthly_stats (month, kospi_close, bond_yield) values
${values}
on conflict (month) do update
  set kospi_close = excluded.kospi_close, bond_yield = excluded.bond_yield;
`,
);
console.log(`${months.length}개월 (${months[0]} ~ ${months.at(-1)}) -> supabase/seed.sql`);
