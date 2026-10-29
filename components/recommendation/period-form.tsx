import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
}: {
  months: string[];
  from: string;
  to: string;
}) {
  return (
    <form method="get" className="flex flex-col gap-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <MonthSelect name="from" title="시작 월" months={months} value={from} />
        <MonthSelect name="to" title="종료 월" months={months} value={to} />
      </FieldGroup>
      <Button type="submit" size="lg" className="self-start">
        최적 비중 보기
      </Button>
    </form>
  );
}
