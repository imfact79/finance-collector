import { supabase } from "@/lib/supabase";
import type { MonthlyStat } from "@/lib/weight-simulation";

/** 코스피와 국고채 10년물 월별 통계를 오래된 달부터 읽는다. 실패하면 던진다. */
export async function loadMonthlyStats(): Promise<MonthlyStat[]> {
  const { data, error } = await supabase
    .from("monthly_stats")
    .select("month, kospi_close, bond_yield")
    .order("month", { ascending: true });

  if (error) throw new Error(`통계를 불러오지 못했습니다: ${error.message}`);

  return data.map((row) => ({
    month: row.month,
    kospiClose: Number(row.kospi_close),
    bondYield: Number(row.bond_yield),
  }));
}
