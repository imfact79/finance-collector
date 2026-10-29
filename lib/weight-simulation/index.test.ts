import { describe, expect, it } from "vitest";

import {
  drawdownLimitCurve,
  parseDrawdownLimitPercent,
  recommendWeights,
  recommendWithinDrawdownLimit,
  simulateWeight,
  type MonthlyStat,
} from "./index";

function months(count: number, from = "2020-01"): string[] {
  const [y, m] = from.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const total = y * 12 + (m - 1) + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

function stats(kospi: number[], bondYield: number[] | number = 0): MonthlyStat[] {
  return months(kospi.length).map((month, i) => ({
    month,
    kospiClose: kospi[i],
    bondYield: typeof bondYield === "number" ? bondYield : bondYield[i],
  }));
}

describe("simulateWeight", () => {
  it("분기마다 목표 비중으로 되돌린 평가액으로 연환산 수익률을 계산한다", () => {
    // 코스피 월 +10%, 채권 0%. 주식 50%로 3개월(분기 1회) 운용하면
    // 0.5 * 1.1^3 + 0.5 = 1.1655, 연환산은 1.1655^(12/3) - 1.
    const data = stats([100, 110, 121, 133.1]);

    const result = simulateWeight(data, { from: "2020-01", to: "2020-04" }, 0.5);

    expect(result.annualReturn).toBeCloseTo(0.8452, 3);
    expect(result.maxDrawdown).toBeCloseTo(0, 6);
  });

  it("최대 낙폭은 직전 최고점 대비 가장 큰 하락률이다", () => {
    // 주식 100%: 100 -> 120(고점) -> 90(저점) -> 100. 낙폭 1 - 90/120 = 25%.
    const data = stats([100, 120, 90, 100]);

    const result = simulateWeight(data, { from: "2020-01", to: "2020-04" }, 1);

    expect(result.maxDrawdown).toBeCloseTo(0.25, 6);
  });

  it("채권은 전월 금리의 월 이자에 금리 변화에 따른 가격 변동을 더해 근사한다", () => {
    // 금리 4% -> 5%: 4/1200 - 8 * 0.01 = -0.076667. 한 달 운용(리밸런싱 전).
    const data = stats([100, 100], [4, 5]);

    const result = simulateWeight(data, { from: "2020-01", to: "2020-02" }, 0);

    expect(result.annualReturn).toBeCloseTo(Math.pow(1 - 0.076667, 12) - 1, 4);
  });
});

describe("recommendWeights", () => {
  // 채권 금리 0%로 고정하면 채권 수익률은 0이다.
  const crashAfterRally = stats([100, 110, 120, 90, 95, 100, 105, 110, 115, 120, 125, 130, 130]);
  const year = { from: "2020-01", to: "2021-01" };

  it("수익률 기준은 연환산 수익률이 가장 높은 비중을, MDD 기준은 낙폭이 가장 얕은 비중을 고른다", () => {
    const result = recommendWeights(crashAfterRally, year);

    expect(result.byReturn.stockWeight).toBe(1);
    expect(result.byReturn.maxDrawdown).toBeCloseTo(0.25, 6);
    expect(result.byDrawdown.stockWeight).toBe(0);
    expect(result.byDrawdown.maxDrawdown).toBeCloseTo(0, 6);
  });

  it("값이 같으면 주식 비중이 낮은 쪽을 고른다", () => {
    const flat = stats(Array(13).fill(100));

    const result = recommendWeights(flat, year);

    expect(result.byReturn.stockWeight).toBe(0);
    expect(result.byDrawdown.stockWeight).toBe(0);
  });

  it("12개월 미만 기간은 계산하지 않는다", () => {
    expect(() => recommendWeights(crashAfterRally, { from: "2020-01", to: "2020-12" })).toThrow(
      RangeError,
    );
  });
});

describe("recommendWithinDrawdownLimit", () => {
  // 채권 금리 0%로 고정하면 채권 수익률은 0이다. 주식은 올랐다가 25% 폭락한 뒤 회복한다.
  const crashAfterRally = stats([100, 110, 120, 90, 95, 100, 105, 110, 115, 120, 125, 130, 130]);
  const year = { from: "2020-01", to: "2021-01" };

  function bruteForceBest(limit: number) {
    let best: ReturnType<typeof simulateWeight> | undefined;
    for (let percent = 0; percent <= 100; percent++) {
      const r = simulateWeight(crashAfterRally, year, percent / 100);
      if (r.maxDrawdown <= limit && (!best || r.annualReturn > best.annualReturn + 1e-12)) best = r;
    }
    return best;
  }

  it("낙폭이 한도 이하인 비중 중 연환산 수익률이 가장 높은 비중을 고른다", () => {
    const outcome = recommendWithinDrawdownLimit(crashAfterRally, year, 0.1);

    if (!("result" in outcome)) throw new Error("추천이 있어야 한다");
    const expected = bruteForceBest(0.1)!;
    expect(outcome.result.stockWeight).toBe(expected.stockWeight);
    expect(outcome.result.maxDrawdown).toBeLessThanOrEqual(0.1);
    expect(outcome.result.stockWeight).toBeGreaterThan(0);
    expect(outcome.result.stockWeight).toBeLessThan(1);
  });

  it("한도가 충분히 크면 수익률 기준 추천과 같은 비중이 된다", () => {
    const outcome = recommendWithinDrawdownLimit(crashAfterRally, year, 0.99);

    if (!("result" in outcome)) throw new Error("추천이 있어야 한다");
    expect(outcome.result.stockWeight).toBe(recommendWeights(crashAfterRally, year).byReturn.stockWeight);
  });

  it("한도가 느슨해질수록 추천 수익률은 같거나 높아진다", () => {
    const returns = [0.05, 0.1, 0.2, 0.3].map((limit) => {
      const outcome = recommendWithinDrawdownLimit(crashAfterRally, year, limit);
      if (!("result" in outcome)) throw new Error("추천이 있어야 한다");
      return outcome.result.annualReturn;
    });

    expect(returns).toEqual([...returns].sort((a, b) => a - b));
  });

  it("한도를 지키는 비중이 없으면 추천 대신 이 기간의 가장 얕은 낙폭을 알려준다", () => {
    // 주식은 매월 -5%, 채권 금리는 매월 +0.5%p 올라 두 자산이 모두 떨어진다.
    const falling = stats(
      Array.from({ length: 13 }, (_, i) => 100 * Math.pow(0.95, i)),
      Array.from({ length: 13 }, (_, i) => 3 + 0.5 * i),
    );

    const outcome = recommendWithinDrawdownLimit(falling, year, 0.01);

    if (!("minDrawdown" in outcome)) throw new Error("추천이 없어야 한다");
    const minimum = Math.min(
      ...Array.from({ length: 101 }, (_, p) => simulateWeight(falling, year, p / 100).maxDrawdown),
    );
    expect(outcome.minDrawdown).toBeCloseTo(minimum, 10);
    expect(outcome.minDrawdown).toBeGreaterThan(0.01);
  });
});

describe("parseDrawdownLimitPercent", () => {
  it("1~99의 정수만 받아들이고 나머지는 거부한다", () => {
    expect(parseDrawdownLimitPercent("20")).toBe(20);
    expect(parseDrawdownLimitPercent("1")).toBe(1);
    expect(parseDrawdownLimitPercent("99")).toBe(99);
    for (const bad of ["", "0", "100", "-5", "abc", "2.5", " "]) {
      expect(parseDrawdownLimitPercent(bad)).toBeNull();
    }
  });
});

describe("drawdownLimitCurve", () => {
  const crashAfterRally = stats([100, 110, 120, 90, 95, 100, 105, 110, 115, 120, 125, 130, 130]);
  const year = { from: "2020-01", to: "2021-01" };

  it("한도를 지킬 수 있는 가장 얕은 낙폭부터 수익률 기준 추천의 낙폭까지, 정수 한도마다 한 점씩 만든다", () => {
    const curve = drawdownLimitCurve(crashAfterRally, year);

    // 채권만 들면 낙폭이 0이라 1%부터 시작하고, 주식 100%의 낙폭 25%에서 끝난다.
    expect(curve[0].limitPercent).toBe(1);
    expect(curve.at(-1)!.limitPercent).toBe(25);
    expect(curve.map((p) => p.limitPercent)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it("모든 점은 같은 한도의 한도 내 추천과 일치하고, 한도가 느슨해질수록 수익률은 내려가지 않는다", () => {
    const curve = drawdownLimitCurve(crashAfterRally, year);

    for (const point of curve) {
      const outcome = recommendWithinDrawdownLimit(crashAfterRally, year, point.limitPercent / 100);
      if (!("result" in outcome)) throw new Error("추천이 있어야 한다");
      expect(point.stockWeight).toBe(outcome.result.stockWeight);
      expect(point.annualReturn).toBe(outcome.result.annualReturn);
      expect(point.maxDrawdown).toBe(outcome.result.maxDrawdown);
    }
    const returns = curve.map((p) => p.annualReturn);
    expect(returns).toEqual([...returns].sort((a, b) => a - b));
  });

  it("두 자산이 모두 떨어지는 기간은 지킬 수 있는 가장 얕은 낙폭의 올림에서 시작한다", () => {
    const falling = stats(
      Array.from({ length: 13 }, (_, i) => 100 * Math.pow(0.95, i)),
      Array.from({ length: 13 }, (_, i) => 3 + 0.5 * i),
    );
    const minimum = Math.min(
      ...Array.from({ length: 101 }, (_, p) => simulateWeight(falling, year, p / 100).maxDrawdown),
    );

    const curve = drawdownLimitCurve(falling, year);

    expect(curve[0].limitPercent).toBe(Math.ceil(minimum * 100));
    expect(curve[0].maxDrawdown).toBeLessThanOrEqual(curve[0].limitPercent / 100);
  });
});

describe("drawdownLimitCurve (낙폭이 없는 기간)", () => {
  it("모든 비중의 낙폭이 0인 기간에도 최소 한 점을 만든다", () => {
    // 주식이 매월 오르고 채권 금리는 0%로 고정이라 어느 비중도 하락하지 않는다.
    const rising = stats(Array.from({ length: 13 }, (_, i) => 100 * Math.pow(1.01, i)));

    const curve = drawdownLimitCurve(rising, { from: "2020-01", to: "2021-01" });

    expect(curve).toHaveLength(1);
    expect(curve[0].limitPercent).toBe(1);
    expect(curve[0].stockWeight).toBe(1);
  });
});
