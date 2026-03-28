"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/header"
import { KpiCards, DashboardKpis } from "@/components/dashboard/kpi-cards"
import { RevenueExpensesChart, CaChargesData } from "@/components/dashboard/revenue-expenses-chart"
import { ProfitTrendChart, ResultatData } from "@/components/dashboard/profit-trend-chart"
import { ExpenseBreakdownChart, ChargesBreakdownData } from "@/components/dashboard/expense-breakdown-chart"
import { MonthlyComparisonChart, TresorerieMensuelleData } from "@/components/dashboard/monthly-comparison-chart"
import { getAllBudgets } from "@/data/previsionnel/storage"
import { calculerPrevisionnel } from "@/data/previsionnel/calculations"
import { BudgetPrevisionnel } from "@/data/previsionnel/types"
import { BarChart3, ArrowRight } from "lucide-react"
import Link from "next/link"

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

function aggregateDashboardData(budgets: BudgetPrevisionnel[]) {
  const resultats = budgets.map((b) => calculerPrevisionnel(b))

  const totalClients = new Set(budgets.map((b) => b.clientId)).size
  const caTotal = resultats.reduce((sum, r) => sum + r.caTotalParAn[0], 0)
  const resultatNetTotal = resultats.reduce((sum, r) => sum + r.resultatNetParAn[0], 0)
  const resultatNetMoyen = resultats.length > 0 ? resultatNetTotal / resultats.length : 0
  const clientsRentables = resultats.filter((r) => r.estRentable).length

  const kpis: DashboardKpis = {
    totalClients,
    caTotal,
    resultatNetMoyen,
    clientsRentables,
    totalClients2: resultats.length,
  }

  const caCharges: CaChargesData[] = [0, 1, 2].map((i) => ({
    label: `Année ${i + 1}`,
    ca: resultats.reduce((sum, r) => sum + r.caTotalParAn[i], 0),
    charges: resultats.reduce(
      (sum, r) =>
        sum +
        r.achatsConsommesParAn[i] +
        r.chargesExternesParAn[i] +
        r.impotsTaxesParAn[i] +
        r.salairesEmployesParAn[i] +
        r.chargesSocialesEmployesParAn[i] +
        r.remunerationDirigeantParAn[i] +
        r.chargesSocialesDirigeantParAn[i] +
        r.dotationsAmortissementsParAn[i] +
        r.chargesFinancieresParAn[i],
      0
    ),
  }))

  const resultatNetData: ResultatData[] = [0, 1, 2].map((i) => ({
    label: `Année ${i + 1}`,
    resultatNet: resultats.reduce((sum, r) => sum + r.resultatNetParAn[i], 0),
  }))

  const chargesLabels: { key: string; label: string }[] = [
    { key: "assurances", label: "Assurances" },
    { key: "telephoneInternet", label: "Téléphone / Internet" },
    { key: "autresAbonnements", label: "Autres abonnements" },
    { key: "carburantTransports", label: "Transports" },
    { key: "fraisDeplacementHebergement", label: "Déplacements" },
    { key: "eauElectriciteGaz", label: "Énergie" },
    { key: "mutuelle", label: "Mutuelle" },
    { key: "fournituresDiverses", label: "Fournitures" },
    { key: "entretienMaterielVetements", label: "Entretien" },
    { key: "nettoyageLocaux", label: "Nettoyage" },
    { key: "budgetPubliciteCommunication", label: "Publicité" },
    { key: "loyerChargesLocatives", label: "Loyer" },
    { key: "expertComptableAvocats", label: "Comptable / Avocats" },
    { key: "fraisBancairesTerminalCB", label: "Frais bancaires" },
    { key: "taxesCFE", label: "Taxes / CFE" },
  ]

  const chargesBreakdown: ChargesBreakdownData[] = chargesLabels.map(({ key, label }) => ({
    category: label,
    amount: budgets.reduce((sum, b) => {
      const val = (b.chargesFixes as unknown as Record<string, [number, number, number]>)[key]
      return sum + (val ? val[0] : 0)
    }, 0),
  }))

  const tresorerieMensuelle: TresorerieMensuelleData[] = MOIS_LABELS.map((label, i) => ({
    label,
    tresorerie: resultats.reduce((sum, r) => sum + (r.tresorerieMensuelle[i] || 0), 0),
  }))

  return { kpis, caCharges, resultatNetData, chargesBreakdown, tresorerieMensuelle }
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([])

  useEffect(() => {
    setMounted(true)
    setBudgets(getAllBudgets())
  }, [])

  if (!mounted) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (budgets.length === 0) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 p-8">
            <BarChart3 className="h-12 w-12 text-indigo-500" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold">Aucun budget prévisionnel</h2>
            <p className="text-muted-foreground mt-2">
              Créez un client et un budget dans la section Prévisionnel pour voir apparaître vos données ici.
            </p>
          </div>
          <Link
            href="/previsionnel"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Créer un prévisionnel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const { kpis, caCharges, resultatNetData, chargesBreakdown, tresorerieMensuelle } =
    aggregateDashboardData(budgets)

  return (
    <div>
      <Header title="Dashboard" />
      <motion.div
        className="space-y-8 p-4 md:p-8"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {/* Welcome section */}
        <motion.div variants={fadeIn} transition={{ duration: 0.5 }}>
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 md:p-8 text-white shadow-xl shadow-indigo-500/20">
            <h2 className="text-2xl font-bold">Bienvenue sur votre tableau de bord</h2>
            <p className="text-indigo-100 mt-1.5">
              Vue d&apos;ensemble de vos {budgets.length} budget{budgets.length > 1 ? "s" : ""} prévisionnel{budgets.length > 1 ? "s" : ""}
            </p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={fadeIn} transition={{ duration: 0.5 }}>
          <KpiCards data={kpis} />
        </motion.div>

        {/* Charts row 1 */}
        <motion.div variants={fadeIn} transition={{ duration: 0.5 }} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RevenueExpensesChart data={caCharges} />
          <ProfitTrendChart data={resultatNetData} />
        </motion.div>

        {/* Charts row 2 */}
        <motion.div variants={fadeIn} transition={{ duration: 0.5 }} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExpenseBreakdownChart data={chargesBreakdown} />
          <MonthlyComparisonChart data={tresorerieMensuelle} />
        </motion.div>
      </motion.div>
    </div>
  )
}
