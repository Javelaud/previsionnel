"use client"

import { TrendingUp, TrendingDown, Users, Euro, Target } from "lucide-react"
import { formatCurrency } from "@/lib/format"

export interface DashboardKpis {
  totalClients: number
  caTotal: number
  resultatNetMoyen: number
  clientsRentables: number
  totalClients2: number
}

const cardStyles = [
  {
    gradient: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
    lightBg: "bg-blue-50",
  },
  {
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/25",
    lightBg: "bg-emerald-50",
  },
  {
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/25",
    lightBg: "bg-violet-50",
  },
  {
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/25",
    lightBg: "bg-amber-50",
  },
]

export function KpiCards({ data }: { data: DashboardKpis }) {
  const tauxRentabilite = data.totalClients2 > 0
    ? Math.round((data.clientsRentables / data.totalClients2) * 100)
    : 0

  const cards = [
    {
      title: "Clients",
      value: data.totalClients.toString(),
      subtitle: "clients actifs",
      icon: Users,
      style: cardStyles[0],
    },
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(data.caTotal),
      subtitle: "prévisionnel An 1",
      icon: Euro,
      style: cardStyles[1],
    },
    {
      title: "Résultat net moyen",
      value: formatCurrency(data.resultatNetMoyen),
      subtitle: "par projet — An 1",
      icon: data.resultatNetMoyen >= 0 ? TrendingUp : TrendingDown,
      style: data.resultatNetMoyen >= 0 ? cardStyles[2] : { gradient: "from-red-500 to-rose-600", shadow: "shadow-red-500/25", lightBg: "bg-red-50" },
    },
    {
      title: "Rentabilité",
      value: `${tauxRentabilite}%`,
      subtitle: `${data.clientsRentables}/${data.totalClients2} projets rentables`,
      icon: Target,
      style: cardStyles[3],
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className={`relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm hover:shadow-lg ${card.style.shadow} transition-all duration-300 hover:-translate-y-1 border`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.style.gradient}`} />

            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </p>
              <div className={`rounded-xl p-2.5 bg-gradient-to-br ${card.style.gradient} shadow-lg ${card.style.shadow}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1.5">{card.subtitle}</p>
          </div>
        )
      })}
    </div>
  )
}
