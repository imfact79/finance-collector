import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Disclaimer, RecommendationResults } from "@/components/recommendation/results";

test("두 기준의 추천 비중과 지표를 같은 구성으로 나란히 보여준다", () => {
  render(
    <RecommendationResults
      byReturn={{ stockWeight: 0.7, annualReturn: 0.0834, maxDrawdown: 0.3123 }}
      byDrawdown={{ stockWeight: 0.1, annualReturn: 0.0412, maxDrawdown: 0.0456 }}
    />,
  );

  expect(screen.getByText("수익률 기준 추천")).toBeInTheDocument();
  expect(screen.getByText("MDD 기준 추천")).toBeInTheDocument();
  expect(screen.getByText("주식 70% · 채권 30%")).toBeInTheDocument();
  expect(screen.getByText("주식 10% · 채권 90%")).toBeInTheDocument();
  expect(screen.getByText("8.3%")).toBeInTheDocument();
  expect(screen.getByText("-31.2%")).toBeInTheDocument();
});

test("한계 고지는 미래 보장 불가, 비용·세금 미반영, 근사, 최종 결정은 사용자 몫을 알린다", () => {
  render(<Disclaimer lastMonth="2026-09" />);

  expect(screen.getByText(/미래 수익을 보장하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText(/거래 비용과 세금은 반영하지 않았습니다/)).toBeInTheDocument();
  expect(screen.getByText(/월별 금리로 근사/)).toBeInTheDocument();
  expect(screen.getByText(/최종 결정은 직접 하세요/)).toBeInTheDocument();
  expect(screen.getByText(/2026-09까지 반영/)).toBeInTheDocument();
});
