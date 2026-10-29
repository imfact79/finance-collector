import { expect, test } from "@playwright/test";

test("기간을 고르면 수익률 기준과 MDD 기준 추천이 나란히 보이고 한계 고지가 함께 있다", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("비중랩");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("비중랩");
  await expect(page.getByText("수익률 기준 추천")).toBeVisible();
  await expect(page.getByText("MDD 기준 추천")).toBeVisible();
  await expect(page.getByText(/미래 수익을 보장하지 않습니다/)).toBeVisible();

  await expect(page.getByText("MDD 한도 내 최고 수익률 추천")).toBeVisible();
  await expect(page.getByText(/MDD -20% 이내/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "MDD 한도별 최고 수익률" })).toBeVisible();
  await expect(page.getByText("현재 한도 20%")).toBeVisible();
  await page.getByText("표로 보기").click();
  await expect(page.getByRole("row", { name: "16% 9% 5.7% -16.0%" })).toBeVisible();

  await page.getByLabel("MDD 한도 (%)").fill("5");
  await page.getByRole("button", { name: "최적 비중 보기" }).click();
  await expect(page.getByText(/한도를 지키는 비중이 없습니다/)).toBeVisible();
  await expect(page.getByText("수익률 기준 추천")).toBeVisible();

  await page.getByLabel("MDD 한도 (%)").fill("abc");
  await page.getByRole("button", { name: "최적 비중 보기" }).click();
  await expect(page.getByText(/1에서 99 사이의 정수/)).toBeVisible();

  await page.getByLabel("시작 월").selectOption("2020-01");
  await page.getByLabel("종료 월").selectOption("2020-06");
  await page.getByRole("button", { name: "최적 비중 보기" }).click();

  await expect(page.getByText("기간이 너무 짧습니다")).toBeVisible();
  await expect(page.getByRole("heading", { name: "MDD 한도별 최고 수익률" })).toHaveCount(0);
  await expect(page.getByText(/미래 수익을 보장하지 않습니다/)).toBeVisible();
});
