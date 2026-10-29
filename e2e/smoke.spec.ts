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

  await page.getByLabel("시작 월").selectOption("2020-01");
  await page.getByLabel("종료 월").selectOption("2020-06");
  await page.getByRole("button", { name: "최적 비중 보기" }).click();

  await expect(page.getByText("기간이 너무 짧습니다")).toBeVisible();
  await expect(page.getByText(/미래 수익을 보장하지 않습니다/)).toBeVisible();
});
