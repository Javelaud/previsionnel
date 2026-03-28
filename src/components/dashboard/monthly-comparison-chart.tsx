"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  tresorerie: { label: "Trésorerie cumulée", color: "#0ea5e9" },
} satisfies ChartConfig

export interface TresorerieMensuelleData {
  label: string
  tresorerie: number
}

export function MonthlyComparisonChart({ data }: { data: TresorerieMensuelleData[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
      <div className="mb-4">
        <h3 className="text-base font-bold">Trésorerie mensuelle</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Suivi mensuel — Année 1</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="tresorerie" fill="var(--color-tresorerie)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
