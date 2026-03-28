"use client"

import { Pie, PieChart, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"]

export interface ChargesBreakdownData {
  category: string
  amount: number
}

export function ExpenseBreakdownChart({ data }: { data: ChargesBreakdownData[] }) {
  const filtered = data.filter((d) => d.amount > 0)

  const chartConfig = filtered.reduce<ChartConfig>((acc, item, i) => {
    acc[item.category] = {
      label: item.category,
      color: COLORS[i % COLORS.length],
    }
    return acc
  }, {})

  const chartData = filtered.map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
  }))

  if (chartData.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm border">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <div className="mb-4">
          <h3 className="text-base font-bold">Répartition des charges fixes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Année 1</p>
        </div>
        <p className="text-sm text-muted-foreground text-center py-12">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      <div className="mb-4">
        <h3 className="text-base font-bold">Répartition des charges fixes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Année 1</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
          <Pie
            data={chartData}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={2}
            stroke="#fff"
          >
            {chartData.map((entry) => (
              <Cell key={entry.category} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="category" />} />
        </PieChart>
      </ChartContainer>
    </div>
  )
}
