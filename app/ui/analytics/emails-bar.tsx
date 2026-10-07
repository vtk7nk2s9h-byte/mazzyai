'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { COLORS } from '@/app/ui/analytics/donut';

/** One row per month; `t0`, `t1`… hold each email type's count (see `types`). */
export type EmailMonthRow = { month: string; total: number } & Record<
  string,
  string | number
>;

/**
 * Emails sent per month as columns: months along the bottom, the count up the
 * side, each column stacked by email type, with the month's total on top.
 * Series are keyed by index, as in AgentCallsBar.
 */
export default function EmailsBar({
  title,
  description,
  types,
  data,
  period,
}: {
  title: string;
  description: string;
  /** The label of each type, in the order of the `t0`, `t1`… keys. */
  types: string[];
  data: EmailMonthRow[];
  /** The span the chart covers, for the footer: "last 6 months". */
  period: string;
}) {
  // This month against last month, for the footer.
  const last = data.at(-1)?.total ?? 0;
  const before = data.at(-2)?.total ?? 0;
  const change = before ? Math.round(((last - before) / before) * 100) : null;
  const sent = data.reduce((n, r) => n + r.total, 0);

  return (
    <section className="flex flex-col rounded-lg bg-gradient-to-br from-white/[0.10] to-white/[0.03] border border-white/[0.12] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-gray-500">{description}</p>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: '#a08f93', fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
              tick={{ fill: '#a08f93', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: '#140a0d',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: '#f7f2f3' }}
              labelStyle={{ color: '#a08f93' }}
            />
            <Legend
              align="left"
              iconType="square"
              wrapperStyle={{ fontSize: 12, paddingLeft: 10, paddingTop: 8 }}
            />
            {types.map((name, i) => (
              <Bar
                key={i}
                dataKey={`t${i}`}
                name={name}
                stackId="emails"
                fill={COLORS[i % COLORS.length]}
                // Only the top of the stack is rounded, so it reads as one column.
                radius={i === types.length - 1 ? [4, 4, 0, 0] : 0}
              >
                {i === types.length - 1 && (
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={8}
                    fill="#a08f93"
                    fontSize={12}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 text-sm font-medium leading-none">
        <p className="flex items-center gap-2">
        {change === null ? (
          `${last.toLocaleString('en')} sent this month`
        ) : (
          <>
            {change >= 0 ? 'Up' : 'Down'} {Math.abs(change)}% on last month
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-brand-red-lit" />
            ) : (
              <TrendingDown className="h-4 w-4 text-gray-500" />
            )}
          </>
        )}
        </p>
        <p>
          {sent.toLocaleString('en')} emails over the {period}
        </p>
      </div>
    </section>
  );
}
