"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  resultatNet: { label: "Résultat net", color: "#6366f1" },
} satisfies ChartConfig

export interface ResultatData {
  label: string
  resultatNet: number
}

export function ProfitTrendChart({ data }: { data: ResultatData[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 border">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
      <div className="mb-4">
        <h3 className="text-base font-bold">Résultat net prévisionnel</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Évolution sur 3 ans</p>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="3 3" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="resultatNet"
            stroke="var(--color-resultatNet)"
            strokeWidth={3}
            dot={{ r: 5, fill: "var(--color-resultatNet)", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
