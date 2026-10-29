import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const label = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

function MonthSelect({
  name,
  title,
  months,
  value,
}: {
  name: string;
  title: string;
  months: string[];
  value: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{title}</FieldLabel>
      <NativeSelect id={name} name={name} defaultValue={value} className="w-full">
        {months.map((month) => (
          <NativeSelectOption key={month} value={month}>
            {label(month)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function PeriodForm({
  months,
  from,
  to,
  drawdownLimit,
}: {
  months: string[];
  from: string;
  to: string;
  /** 사용자가 입력한 MDD 한도(퍼센트) 그대로 */
  drawdownLimit: string;
}) {
  return (
    <form method="get" className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        <MonthSelect name="from" title="시작 월" months={months} value={from} />
        <MonthSelect name="to" title="종료 월" months={months} value={to} />
        <Field>
          <FieldLabel htmlFor="mdd">MDD 한도 (%)</FieldLabel>
          <Input
            id="mdd"
            name="mdd"
            type="text"
            inputMode="numeric"
            defaultValue={drawdownLimit}
            aria-describedby="mdd-help"
          />
          <FieldDescription id="mdd-help">
            1~99. 20이면 최대 낙폭이 -20%보다 깊지 않은 비중만 봅니다.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" className="self-start">
        최적 비중 보기
      </Button>
    </form>
  );
}
