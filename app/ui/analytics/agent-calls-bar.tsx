'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { COLORS } from '@/app/ui/analytics/donut';

/** One row per month; `a0`, `a1`… hold each agent's call count (see `agents`). */
export type AgentMonthRow = { month: string } & Record<string, string | number>;

/**
 * Calls per agent per month as grouped bars. Series are keyed by index rather
 * than agent name, since recharts reads a dataKey containing "." as a path.
 */
export default function AgentCallsBar({
  title,
  description,
  agents,
  data,
}: {
  title: string;
  description: string;
  agents: string[];
  data: AgentMonthRow[];
}) {
  return (
    <section className="rounded-lg bg-gradient-to-br from-white/[0.10] to-white/[0.03] border border-white/[0.12] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-gray-500">{description}</p>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
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
              wrapperStyle={{ fontSize: 12, paddingLeft: 10, paddingTop: 8}}
            />
            {agents.map((name, i) => (
              <Bar
                key={i}
                dataKey={`a${i}`}
                name={name}
                fill={COLORS[i % COLORS.length]}
                radius={4}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
