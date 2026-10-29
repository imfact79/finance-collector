import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { LimitCurve } from "@/components/recommendation/limit-curve";
import { Disclaimer, RecommendationResults } from "@/components/recommendation/results";

const byReturn = { stockWeight: 0.7, annualReturn: 0.0834, maxDrawdown: 0.3123 };
const byDrawdown = { stockWeight: 0.1, annualReturn: 0.0412, maxDrawdown: 0.0456 };

test("세 기준의 추천 비중과 지표를 같은 구성으로 나란히 보여준다", () => {
  render(
    <RecommendationResults
      byReturn={byReturn}
      byDrawdown={byDrawdown}
      withinLimit={{
        kind: "ok",
        limitPercent: 20,
        result: { stockWeight: 0.4, annualReturn: 0.0611, maxDrawdown: 0.1987 },
      }}
    />,
  );

  expect(screen.getByText("수익률 기준 추천")).toBeInTheDocument();
  expect(screen.getByText("MDD 기준 추천")).toBeInTheDocument();
  expect(screen.getByText("MDD 한도 내 최고 수익률 추천")).toBeInTheDocument();
  expect(screen.getByText(/MDD -20% 이내/)).toBeInTheDocument();
  expect(screen.getByText("주식 70% · 채권 30%")).toBeInTheDocument();
  expect(screen.getByText("주식 10% · 채권 90%")).toBeInTheDocument();
  expect(screen.getByText("주식 40% · 채권 60%")).toBeInTheDocument();
  expect(screen.getByText("-31.2%")).toBeInTheDocument();
});

test("한도를 지키는 비중이 없으면 추천 대신 가장 얕은 MDD를 안내한다", () => {
  render(
    <RecommendationResults
      byReturn={byReturn}
      byDrawdown={byDrawdown}
      withinLimit={{ kind: "infeasible", limitPercent: 5, minDrawdown: 0.1573 }}
    />,
  );

  expect(screen.getByText(/한도를 지키는 비중이 없습니다/)).toBeInTheDocument();
  expect(screen.getByText(/-15.7%/)).toBeInTheDocument();
  expect(screen.getByText("주식 70% · 채권 30%")).toBeInTheDocument();
});

test("한도 입력이 잘못되면 허용 범위를 안내하고 기존 두 추천은 그대로 보인다", () => {
  render(
    <RecommendationResults byReturn={byReturn} byDrawdown={byDrawdown} withinLimit={{ kind: "invalid" }} />,
  );

  expect(screen.getByText(/1에서 99 사이의 정수/)).toBeInTheDocument();
  expect(screen.getByText("주식 10% · 채권 90%")).toBeInTheDocument();
});

test("한계 고지는 미래 보장 불가, 비용·세금 미반영, 근사, 한도 추천의 과거 한정, 최종 결정은 사용자 몫을 알린다", () => {
  render(<Disclaimer lastMonth="2026-09" />);

  expect(screen.getByText(/미래 수익을 보장하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText(/거래 비용과 세금은 반영하지 않았습니다/)).toBeInTheDocument();
  expect(screen.getByText(/월별 금리로 근사/)).toBeInTheDocument();
  expect(screen.getByText(/이 기간에서만 성립한 값/)).toBeInTheDocument();
  expect(screen.getByText(/최종 결정은 직접 하세요/)).toBeInTheDocument();
  expect(screen.getByText(/2026-09까지 반영/)).toBeInTheDocument();
});

const curve = [
  { limitPercent: 16, stockWeight: 0.09, annualReturn: 0.057, maxDrawdown: 0.16 },
  { limitPercent: 17, stockWeight: 0.16, annualReturn: 0.062, maxDrawdown: 0.169 },
  { limitPercent: 18, stockWeight: 0.23, annualReturn: 0.067, maxDrawdown: 0.179 },
];

test("한도별 곡선은 현재 한도를 표시하고 같은 값을 표로 보여준다", () => {
  render(<LimitCurve points={curve} currentLimitPercent={17} />);

  expect(screen.getByRole("img", { name: /한도 16%에서 18%까지/ })).toBeInTheDocument();
  expect(screen.getByText("현재 한도 17%")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(1 + curve.length);
  expect(screen.getByRole("img", { name: "한도 17%: 주식 16%, 연환산 수익률 6.2%, MDD -16.9%" })).toBeInTheDocument();
});

test("현재 한도가 곡선 범위 밖이면 현재 위치 표시 없이 곡선만 보여준다", () => {
  render(<LimitCurve points={curve} currentLimitPercent={null} />);

  expect(screen.queryByText(/현재 한도/)).not.toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(1 + curve.length);
});
