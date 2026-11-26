"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "@/lib/format";

export interface ContributionBar {
  label: string;
  contribution: number | null;
}

export function ComparisonChart({ data }: { data: ContributionBar[] }) {
  return (
    <div className="comparison-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height={250} initialDimension={{ width: 300, height: 250 }}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -5 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="#e2e8e3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#495e56", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={58} tick={{ fill: "#495e56", fontSize: 11 }} tickFormatter={(value: number) => Math.abs(value) >= 1000 ? `${formatNumber(value / 1000)} rb` : formatNumber(value)} />
          <Tooltip cursor={{ fill: "#f0f4ee" }} formatter={(value) => formatMoney(typeof value === "number" ? value : null)} />
          <Bar dataKey="contribution" name="Estimasi kontribusi" fill="#32745e" radius={[5, 5, 0, 0]} maxBarSize={88} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
