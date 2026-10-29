import { describe, expect, it } from "vitest";

import { recommendWeights, simulateWeight, type MonthlyStat } from "./index";

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
