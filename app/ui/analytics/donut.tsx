'use client';

import type { ReactNode } from 'react';
import { Cell, Label, Pie, PieChart, Tooltip } from 'recharts';

export type Slice = { name: string; value: number };

// Brand reds first, then neutrals, so a slice never reads as an unrelated hue.
// All reds but one grey, light to dark, so neighbouring series stay apart.
// The third is the soft red the site already uses (#ff6b78); a pink, a gold
// and a pale grey were tried there and dropped.
export const COLORS = ['#ff2e43', '#8c1925', '#ff6b78', '#5e1622', '#a08f93', '#4a1119'];

/**
 * One donut: the slices, a legend with each value, and the headline figure in
 * the hole. Shared by all three Analytics charts; only the data differs.
 */
export default function Donut({
  title,
  description,
  slices,
  center,
  centerLabel,
  currency = false,
  filter,
  inlineLegend = false,
}: {
  title: string;
  description: string;
  slices: Slice[];
  center: string;
  centerLabel: string;
  /** Values are dollars. A flag, not a formatter: functions can't cross from the server page. */
  currency?: boolean;
  /** A server-rendered control (the month picker) shown in the card's header. */
  filter?: ReactNode;
  /** Lay the legend out in one row instead of a column. */
  inlineLegend?: boolean;
}) {
  const format = (n: number) =>
    currency ? `$${n.toFixed(2)}` : n.toLocaleString('en');
  const empty = slices.every((s) => s.value === 0);
  return (
    <section className="rounded-lg border border-white/[0.07] bg-white/[0.05] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {filter}
      </div>

      <div className="flex justify-center">
        <PieChart width={240} height={240}>
          <Tooltip
            formatter={(v) => format(Number(v))}
            contentStyle={{
              background: '#140a0d',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: '#f7f2f3' }}
          />
          <Pie
            data={empty ? [{ name: 'No data', value: 1 }] : slices}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            strokeWidth={4}
            stroke="#140a0d"
            // Sweeps clockwise from empty to full on load, so the red fills in.
            isAnimationActive
            animationBegin={150}
            animationDuration={1400}
            animationEasing="ease-out"
          >
            {(empty ? [{ name: '' }] : slices).map((_, i) => (
              <Cell key={i} fill={empty ? '#2a1a1e' : COLORS[i % COLORS.length]} />
            ))}
            <Label
              content={({ viewBox }) =>
                viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="text-2xl font-bold"
                      fill="#f7f2f3"
                    >
                      {center}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 20}
                      className="text-xs"
                      fill="#a08f93"
                    >
                      {centerLabel}
                    </tspan>
                  </text>
                ) : null
              }
            />
          </Pie>
        </PieChart>
      </div>

      <ul
        className={
          inlineLegend
            ? 'mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs'
            : 'mt-2 space-y-1 text-xs'
        }
      >
        {slices.map((s, i) => (
          <li key={s.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {s.name}
            </span>
            <span>{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
