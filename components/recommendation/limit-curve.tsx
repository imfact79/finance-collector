"use client";

import { useState } from "react";

import type { LimitCurvePoint } from "@/lib/weight-simulation";

const WIDTH = 640;
const HEIGHT = 280;
const MARGIN = { top: 16, right: 20, bottom: 40, left: 52 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function niceTicks(min: number, max: number, count = 4): number[] {
  const step = Math.max(0.005, Math.ceil(((max - min) / count) * 200) / 200);
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v < max + step; v += step) ticks.push(v);
  return ticks;
}

export function LimitCurve({
  points,
  currentLimitPercent,
}: {
  points: LimitCurvePoint[];
  /** 곡선 범위 밖이거나 입력이 잘못되면 null */
  currentLimitPercent: number | null;
}) {
  const [active, setActive] = useState<LimitCurvePoint | null>(null);

  const first = points[0].limitPercent;
  const last = points[points.length - 1].limitPercent;
  const returns = points.map((p) => p.annualReturn);
  const yTicks = niceTicks(Math.min(...returns), Math.max(...returns));
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];

  const x = (limit: number) => MARGIN.left + ((limit - first) / (last - first || 1)) * PLOT_WIDTH;
  const y = (value: number) => MARGIN.top + (1 - (value - yMin) / (yMax - yMin || 1)) * PLOT_HEIGHT;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.limitPercent).toFixed(1)},${y(p.annualReturn).toFixed(1)}`)
    .join(" ");
  const xTickStep = last - first > 20 ? 5 : last - first > 8 ? 2 : 1;
  const xTicks = points.map((p) => p.limitPercent).filter((l) => (l - first) % xTickStep === 0);
  const current = points.find((p) => p.limitPercent === currentLimitPercent) ?? null;

  const summary = `MDD 한도 ${first}%에서 ${last}%까지, 한도별 최고 연환산 수익률은 ${pct(points[0].annualReturn)}에서 ${pct(points[points.length - 1].annualReturn)}로 늘어납니다.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
      <div className="relative" style={{ minWidth: 520 }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={summary}
          className="h-auto w-full"
          onMouseLeave={() => setActive(null)}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {pct(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text
              key={tick}
              x={x(tick)}
              y={HEIGHT - MARGIN.bottom + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {tick}%
            </text>
          ))}
          <text
            x={MARGIN.left + PLOT_WIDTH / 2}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            MDD 한도
          </text>

          <path d={path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />

          {active ? (
            <line
              x1={x(active.limitPercent)}
              x2={x(active.limitPercent)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_HEIGHT}
              className="stroke-muted-foreground"
              strokeDasharray="3 3"
            />
          ) : null}

          {current ? (
            <g>
              <circle
                cx={x(current.limitPercent)}
                cy={y(current.annualReturn)}
                r={5}
                className="fill-primary stroke-background"
                strokeWidth={2}
              />
              <text
                x={x(current.limitPercent)}
                y={y(current.annualReturn) - 12}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                현재 한도 {current.limitPercent}%
              </text>
            </g>
          ) : null}

          {points.map((p) => (
            <circle
              key={p.limitPercent}
              cx={x(p.limitPercent)}
              cy={y(p.annualReturn)}
              r={10}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`한도 ${p.limitPercent}%: 주식 ${Math.round(p.stockWeight * 100)}%, 연환산 수익률 ${pct(p.annualReturn)}, MDD -${pct(p.maxDrawdown)}`}
              onMouseEnter={() => setActive(p)}
              onFocus={() => setActive(p)}
              onBlur={() => setActive(null)}
              className="outline-none focus-visible:stroke-ring"
              strokeWidth={2}
            />
          ))}
        </svg>

        {active ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm"
            style={{
              left: `${(x(active.limitPercent) / WIDTH) * 100}%`,
              transform: `translateX(${x(active.limitPercent) > WIDTH / 2 ? "-105%" : "5%"})`,
            }}
          >
            <p className="font-medium">MDD 한도 {active.limitPercent}%</p>
            <p>
              주식 {Math.round(active.stockWeight * 100)}% · 채권 {100 - Math.round(active.stockWeight * 100)}%
            </p>
            <p>연환산 수익률 {pct(active.annualReturn)}</p>
            <p>실제 MDD -{pct(active.maxDrawdown)}</p>
          </div>
        ) : null}
      </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">표로 보기</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-right tabular-nums">
            <thead className="sticky top-0 bg-background text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 text-left font-medium">MDD 한도</th>
                <th className="py-1 pr-3 font-medium">주식 비중</th>
                <th className="py-1 pr-3 font-medium">연환산 수익률</th>
                <th className="py-1 font-medium">실제 MDD</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.limitPercent} className="border-t">
                  <td className="py-1 pr-3 text-left">{p.limitPercent}%</td>
                  <td className="py-1 pr-3">{Math.round(p.stockWeight * 100)}%</td>
                  <td className="py-1 pr-3">{pct(p.annualReturn)}</td>
                  <td className="py-1">-{pct(p.maxDrawdown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
