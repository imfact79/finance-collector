import { DatabaseIcon, TriangleAlertIcon } from "lucide-react";

import { PeriodForm } from "@/components/recommendation/period-form";
import { Disclaimer, RecommendationResults } from "@/components/recommendation/results";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { loadMonthlyStats } from "@/lib/market-stats";
import {
  MIN_PERIOD_MONTHS,
  periodMonths,
  recommendWeights,
  type MonthlyStat,
} from "@/lib/weight-simulation";

function pick(value: string | string[] | undefined, months: string[], fallback: string) {
  const single = Array.isArray(value) ? value[0] : value;
  return single && months.includes(single) ? single : fallback;
}

async function load(): Promise<{ stats: MonthlyStat[] } | { error: string }> {
  try {
    return { stats: await loadMonthlyStats() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "통계를 불러오지 못했습니다." };
  }
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const loaded = await load();
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">비중랩</h1>
        <p className="text-muted-foreground">
          코스피와 국고채 10년물의 과거 통계로, 분기 리밸런싱 시 주식·채권 비중별 수익률과
          MDD를 확인하세요.
        </p>
      </header>

      {"error" in loaded ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>통계를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            잠시 후 새로고침해 주세요. 계속되면 통계 테이블과 Supabase 연결 설정을 확인해야
            합니다.
          </AlertDescription>
        </Alert>
      ) : loaded.stats.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DatabaseIcon />
            </EmptyMedia>
            <EmptyTitle>아직 통계가 없습니다</EmptyTitle>
            <EmptyDescription>
              통계가 채워지면 기간을 골라 추천 비중을 볼 수 있습니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Simulation stats={loaded.stats} params={params} />
      )}
    </main>
  );
}

function Simulation({
  stats,
  params,
}: {
  stats: MonthlyStat[];
  params: Record<string, string | string[] | undefined>;
}) {
  const months = stats.map((s) => s.month);
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  const period = {
    from: pick(params.from, months, firstMonth),
    to: pick(params.to, months, lastMonth),
  };
  const tooShort = periodMonths(period) < MIN_PERIOD_MONTHS;

  return (
    <>
      <section aria-labelledby="period-heading" className="flex flex-col gap-4">
        <h2 id="period-heading" className="font-heading text-xl font-semibold">
          시뮬레이션 기간
        </h2>
        <PeriodForm months={months} from={period.from} to={period.to} />
      </section>

      <section aria-labelledby="result-heading" className="flex flex-col gap-4">
        <h2 id="result-heading" className="font-heading text-xl font-semibold">
          추천 비중
        </h2>
        {tooShort ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>기간이 너무 짧습니다</AlertTitle>
            <AlertDescription>
              시작 월과 종료 월 사이가 {MIN_PERIOD_MONTHS}개월 이상이어야 계산할 수 있습니다.
              기간을 다시 골라 주세요.
            </AlertDescription>
          </Alert>
        ) : (
          <RecommendationResults {...recommendWeights(stats, period)} />
        )}
      </section>

      <Disclaimer lastMonth={lastMonth} />
    </>
  );
}
