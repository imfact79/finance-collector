export type MonthlyStat = {
  /** YYYY-MM */
  month: string;
  kospiClose: number;
  /** 국고채 10년물 월별 금리(%) */
  bondYield: number;
};

export type Period = { from: string; to: string };

export type WeightResult = {
  /** 0~1 */
  stockWeight: number;
  /** 연환산 수익률. 0.1 = 10% */
  annualReturn: number;
  /** 최대 낙폭. 0.2 = 20% 하락 */
  maxDrawdown: number;
};

/** 금리 변화에 따른 채권 가격 변동에 쓰는 고정 수정듀레이션(10년 만기, 금리 3~6% 구간의 약 8). */
const BOND_DURATION = 8;
const REBALANCE_EVERY_MONTHS = 3;

function bondMonthlyReturn(previousYield: number, currentYield: number): number {
  return previousYield / 100 / 12 - (BOND_DURATION * (currentYield - previousYield)) / 100;
}

export function simulateWeight(
  stats: MonthlyStat[],
  period: Period,
  stockWeight: number,
): WeightResult {
  const window = stats.filter((s) => s.month >= period.from && s.month <= period.to);

  let stock = stockWeight;
  let bond = 1 - stockWeight;
  let peak = 1;
  let maxDrawdown = 0;

  for (let i = 1; i < window.length; i++) {
    stock *= window[i].kospiClose / window[i - 1].kospiClose;
    bond *= 1 + bondMonthlyReturn(window[i - 1].bondYield, window[i].bondYield);

    let value = stock + bond;
    if (i % REBALANCE_EVERY_MONTHS === 0) {
      stock = value * stockWeight;
      bond = value - stock;
      value = stock + bond;
    }
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, 1 - value / peak);
  }

  const months = window.length - 1;
  const annualReturn = Math.pow(stock + bond, 12 / months) - 1;
  return { stockWeight, annualReturn, maxDrawdown };
}

export const MIN_PERIOD_MONTHS = 12;

const WEIGHT_STEP_PERCENT = 1;
const TIE_EPSILON = 1e-12;

/** from~to 사이에 지나는 개월 수. 2020-01~2021-01은 12. */
export function periodMonths({ from, to }: Period): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/** 우선 지표가 더 좋으면 음수, 같으면 보조 지표, 그래도 같으면 주식 비중이 낮은 쪽이 앞선다. */
function compareBy(primary: "annualReturn" | "maxDrawdown") {
  const secondary = primary === "annualReturn" ? "maxDrawdown" : "annualReturn";
  // 수익률은 클수록, 낙폭은 작을수록 좋다.
  const sign = (key: "annualReturn" | "maxDrawdown") => (key === "annualReturn" ? -1 : 1);
  return (a: WeightResult, b: WeightResult) => {
    for (const key of [primary, secondary] as const) {
      const diff = a[key] - b[key];
      if (Math.abs(diff) > TIE_EPSILON) return sign(key) * diff;
    }
    return a.stockWeight - b.stockWeight;
  };
}

function evaluateCandidates(stats: MonthlyStat[], period: Period): WeightResult[] {
  if (periodMonths(period) < MIN_PERIOD_MONTHS) {
    throw new RangeError(`시뮬레이션 기간은 ${MIN_PERIOD_MONTHS}개월 이상이어야 합니다.`);
  }

  const candidates: WeightResult[] = [];
  for (let percent = 0; percent <= 100; percent += WEIGHT_STEP_PERCENT) {
    candidates.push(simulateWeight(stats, period, percent / 100));
  }
  return candidates;
}

export function recommendWeights(stats: MonthlyStat[], period: Period) {
  const candidates = evaluateCandidates(stats, period);

  return {
    byReturn: [...candidates].sort(compareBy("annualReturn"))[0],
    byDrawdown: [...candidates].sort(compareBy("maxDrawdown"))[0],
  };
}

export type DrawdownLimitRecommendation =
  | { result: WeightResult }
  /** 한도를 지키는 비중이 없을 때, 이 기간에 가능한 가장 얕은 낙폭 */
  | { minDrawdown: number };

/** 낙폭이 한도(0.2 = 20%) 이하인 비중 중 연환산 수익률이 가장 높은 비중을 고른다. */
export function recommendWithinDrawdownLimit(
  stats: MonthlyStat[],
  period: Period,
  drawdownLimit: number,
): DrawdownLimitRecommendation {
  const candidates = evaluateCandidates(stats, period);

  const best = bestWithinLimit(candidates, drawdownLimit);
  return best
    ? { result: best }
    : { minDrawdown: Math.min(...candidates.map((c) => c.maxDrawdown)) };
}

function bestWithinLimit(candidates: WeightResult[], drawdownLimit: number): WeightResult | undefined {
  return candidates
    .filter((c) => c.maxDrawdown <= drawdownLimit + TIE_EPSILON)
    .sort(compareBy("annualReturn"))[0];
}

export type LimitCurvePoint = WeightResult & { limitPercent: number };

/** 정수 한도(%)마다 한도 내 최고 수익률 추천을 모은 곡선. 지킬 수 있는 가장 얕은 낙폭부터 수익률 기준 추천의 낙폭까지. */
export function drawdownLimitCurve(stats: MonthlyStat[], period: Period): LimitCurvePoint[] {
  const candidates = evaluateCandidates(stats, period);
  const percentCeil = (drawdown: number) => Math.ceil(drawdown * 100 - TIE_EPSILON);

  const shallowest = Math.min(...candidates.map((c) => c.maxDrawdown));
  const deepest = [...candidates].sort(compareBy("annualReturn"))[0].maxDrawdown;
  const first = Math.max(1, percentCeil(shallowest));
  // 낙폭이 거의 없는 기간은 올림해도 first보다 작을 수 있어 한 점은 남긴다.
  const last = Math.min(99, Math.max(first, percentCeil(deepest)));

  const curve: LimitCurvePoint[] = [];
  for (let limitPercent = first; limitPercent <= last; limitPercent++) {
    const best = bestWithinLimit(candidates, limitPercent / 100);
    if (best) curve.push({ ...best, limitPercent });
  }
  return curve;
}

export const DEFAULT_DRAWDOWN_LIMIT_PERCENT = 20;

/** MDD 한도 입력(퍼센트)을 1~99의 정수로만 받아들인다. 그 밖이면 null. */
export function parseDrawdownLimitPercent(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= 1 && value <= 99 ? value : null;
}
