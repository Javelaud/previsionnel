import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy", { locale: fr })
}

export function formatMonthLabel(monthStr: string): string {
  return format(parseISO(`${monthStr}-01`), "MMM yyyy", { locale: fr })
}

export function formatMonthShort(monthStr: string): string {
  return format(parseISO(`${monthStr}-01`), "MMM yy", { locale: fr })
}
