"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  ca: { label: "Chiffre d'affaires", color: "#10b981" },
  charges: { label: "Total charges", color: "#f43f5e" },
} satisfies ChartConfig

export interface CaChargesData {
  label: string
  ca: number
  charges: number
}

export function RevenueExpensesChart({ data }: { data: CaChargesData[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <div className="mb-4">
        <h3 className="text-base font-bold">CA vs Charges</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Comparaison sur 3 ans</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="ca" fill="var(--color-ca)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="charges" fill="var(--color-charges)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
