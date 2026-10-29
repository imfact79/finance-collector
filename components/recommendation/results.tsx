import { AlertTriangleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WeightResult } from "@/lib/weight-simulation";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function RecommendationCard({
  title,
  description,
  result,
}: {
  title: string;
  description: string;
  result: WeightResult;
}) {
  const stock = Math.round(result.stockWeight * 100);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-heading text-2xl font-semibold tracking-tight">
          주식 {stock}% · 채권 {100 - stock}%
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">연환산 수익률</dt>
          <dd className="text-right font-medium tabular-nums">
            {percent(result.annualReturn)}
          </dd>
          <dt className="text-muted-foreground">MDD</dt>
          <dd className="text-right font-medium tabular-nums">
            -{percent(result.maxDrawdown)}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export type WithinLimit =
  | { kind: "ok"; limitPercent: number; result: WeightResult }
  | { kind: "infeasible"; limitPercent: number; minDrawdown: number }
  | { kind: "invalid" };

function LimitCard({ withinLimit }: { withinLimit: WithinLimit }) {
  const title = "MDD 한도 내 최고 수익률 추천";
  if (withinLimit.kind === "ok") {
    return (
      <RecommendationCard
        title={title}
        description={`MDD -${withinLimit.limitPercent}% 이내에서 연환산 수익률이 가장 높았던 비중`}
        result={withinLimit.result}
      />
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {withinLimit.kind === "infeasible"
            ? `MDD -${withinLimit.limitPercent}% 이내`
            : "MDD 한도를 확인해 주세요"}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {withinLimit.kind === "infeasible" ? (
          <p>
            이 기간에는 한도를 지키는 비중이 없습니다. 가능한 가장 얕은 MDD는 -
            {percent(withinLimit.minDrawdown)}이니, 한도를 이보다 크게 잡아 보세요.
          </p>
        ) : (
          <p>MDD 한도는 1에서 99 사이의 정수로 입력해 주세요.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationResults({
  byReturn,
  byDrawdown,
  withinLimit,
}: {
  byReturn: WeightResult;
  byDrawdown: WeightResult;
  withinLimit: WithinLimit;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <RecommendationCard
        title="수익률 기준 추천"
        description="이 기간에 연환산 수익률이 가장 높았던 비중"
        result={byReturn}
      />
      <RecommendationCard
        title="MDD 기준 추천"
        description="이 기간에 최대 낙폭이 가장 얕았던 비중"
        result={byDrawdown}
      />
      <LimitCard withinLimit={withinLimit} />
    </div>
  );
}

export function Disclaimer({ lastMonth }: { lastMonth?: string }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>이 결과의 한계</AlertTitle>
      <AlertDescription>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          <li>과거 데이터에 기반한 결과이며 미래 수익을 보장하지 않습니다.</li>
          <li>거래 비용과 세금은 반영하지 않았습니다.</li>
          <li>
            국고채 수익률은 월별 금리로 근사한 값이고, 코스피는 가격 지수라 배당이 빠져
            있습니다.
          </li>
          <li>
            월말 값으로 계산해서 월 중간의 하락은 MDD에 반영되지 않습니다.
          </li>
          <li>
            MDD 한도 내 추천은 이 기간에서만 성립한 값입니다. 앞으로의 낙폭이 한도 안에 든다는
            뜻이 아닙니다.
          </li>
          <li>최종 결정은 직접 하세요. 이 서비스는 근거 데이터만 제공합니다.</li>
          {lastMonth ? <li>통계는 {lastMonth}까지 반영되어 있습니다.</li> : null}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
