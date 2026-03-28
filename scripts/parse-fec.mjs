import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

const fecPath = join(ROOT, "FECSOCIC.txt")
const outputPath = join(ROOT, "src", "data", "fec-transactions.ts")

const raw = readFileSync(fecPath, "utf-8")
const lines = raw.split("\n").filter((l) => l.trim())

// Skip header
const header = lines[0].split("\t")
const rows = lines.slice(1).map((line) => {
  const cols = line.split("\t")
  const obj = {}
  header.forEach((h, i) => {
    obj[h.trim()] = (cols[i] || "").trim()
  })
  return obj
})

// Parse French number format (comma as decimal separator)
function parseAmount(str) {
  if (!str || str === "") return 0
  return parseFloat(str.replace(/\s/g, "").replace(",", ".")) || 0
}

// Format date from YYYYMMDD to YYYY-MM-DD
function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return "2024-10-01"
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
}

// Map account numbers to expense categories
function getExpenseCategory(compteNum) {
  const prefix3 = compteNum.slice(0, 3)
  const prefix4 = compteNum.slice(0, 4)

  // Rémunération & charges sociales
  if (prefix3 === "644" || prefix3 === "646") return "Salaires"

  // Location / loyer
  if (prefix3 === "613") return "Loyer"

  // Assurances
  if (prefix3 === "616") return "Services"

  // Énergie, eau, carburant, internet, téléphone
  if (prefix3 === "606" || prefix3 === "611" || prefix3 === "626") return "Infrastructure"

  // Entretien, maintenance, honoraires, formation
  if (prefix3 === "615" || prefix3 === "622" || prefix3 === "633") return "Services"

  // Taxes et cotisations
  if (prefix3 === "628" || prefix3 === "635" || prefix3 === "637") return "Taxes"

  // Voyages, déplacements, péages
  if (prefix3 === "625") return "Fournitures"

  // Frais bancaires
  if (prefix3 === "627") return "Divers"

  // Amortissements
  if (prefix3 === "681") return "Divers"

  // Charges financières
  if (prefix3 === "661") return "Divers"

  // Charges exceptionnelles
  if (prefix3 === "671") return "Divers"

  return "Divers"
}

// Map account numbers to income categories
function getIncomeCategory(compteNum) {
  const prefix3 = compteNum.slice(0, 3)

  // Ventes de prestations / services
  if (prefix3 === "706") return "Prestations"

  // Rétrocessions, management fees, locations
  if (prefix3 === "708") return "Prestations"

  // Produits financiers
  if (prefix3 === "767") return "Divers"

  // Transferts charges
  if (prefix3 === "791") return "Divers"

  return "Divers"
}

// Extract transactions from FEC entries
// Only process class 6 (expenses) and class 7 (income) accounts
const transactions = []
let id = 1

for (const row of rows) {
  const compteNum = row.CompteNum || ""
  const firstChar = compteNum.charAt(0)

  // Only process P&L accounts
  if (firstChar !== "6" && firstChar !== "7") continue

  const debit = parseAmount(row.Debit)
  const credit = parseAmount(row.Credit)

  // Skip zero entries
  if (debit === 0 && credit === 0) continue

  const date = formatDate(row.EcritureDate)
  const compteLib = row.CompteLib || ""
  const ecritureLib = row.EcritureLib || ""
  const description = ecritureLib || compteLib

  if (firstChar === "6") {
    // Expense account: debit = expense, credit = reversal
    const amount = debit - credit
    if (amount <= 0) continue // skip reversals or zero

    transactions.push({
      id: String(id++),
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      type: "expense",
      category: getExpenseCategory(compteNum),
      compteNum,
      compteLib,
    })
  } else if (firstChar === "7") {
    // Income account: credit = income, debit = reversal
    const amount = credit - debit
    if (amount <= 0) continue // skip reversals or zero

    transactions.push({
      id: String(id++),
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      type: "income",
      category: getIncomeCategory(compteNum),
      compteNum,
      compteLib,
    })
  }
}

// Sort by date descending
transactions.sort((a, b) => b.date.localeCompare(a.date))

// Generate TypeScript file
const tsContent = `import { Transaction } from "./types"

// Auto-generated from FECSOCIC.txt FEC file
// Generated on: ${new Date().toISOString().slice(0, 10)}
// Total transactions: ${transactions.length}
// Period: ${transactions[transactions.length - 1]?.date || "N/A"} to ${transactions[0]?.date || "N/A"}

export const fecTransactions: Transaction[] = ${JSON.stringify(
  transactions.map(({ compteNum, compteLib, ...t }) => t),
  null,
  2
)}

export function getNextId(): string {
  const maxId = fecTransactions.reduce((max, t) => Math.max(max, parseInt(t.id)), 0)
  return String(maxId + 1)
}
`

writeFileSync(outputPath, tsContent, "utf-8")

// Print summary
console.log("=== FEC Parser Summary ===")
console.log(`Total FEC entries: ${rows.length}`)
console.log(`P&L transactions extracted: ${transactions.length}`)
console.log(
  `Period: ${transactions[transactions.length - 1]?.date} to ${transactions[0]?.date}`
)

// Summarize by category
const byCategory = {}
for (const t of transactions) {
  const key = `${t.type}:${t.category}`
  if (!byCategory[key]) byCategory[key] = { count: 0, total: 0 }
  byCategory[key].count++
  byCategory[key].total += t.amount
}

console.log("\n--- Income categories ---")
for (const [key, val] of Object.entries(byCategory).filter(([k]) =>
  k.startsWith("income:")
)) {
  console.log(`  ${key.replace("income:", "")}: ${val.count} entries, ${val.total.toFixed(2)}€`)
}

console.log("\n--- Expense categories ---")
for (const [key, val] of Object.entries(byCategory).filter(([k]) =>
  k.startsWith("expense:")
)) {
  console.log(`  ${key.replace("expense:", "")}: ${val.count} entries, ${val.total.toFixed(2)}€`)
}

// Summarize by account
const byAccount = {}
for (const t of transactions) {
  const key = `${t.compteNum} ${t.compteLib}`
  if (!byAccount[key]) byAccount[key] = { type: t.type, count: 0, total: 0 }
  byAccount[key].count++
  byAccount[key].total += t.amount
}

console.log("\n--- By account ---")
for (const [key, val] of Object.entries(byAccount).sort(
  (a, b) => b[1].total - a[1].total
)) {
  console.log(`  ${val.type === "income" ? "+" : "-"} ${key}: ${val.count} entries, ${val.total.toFixed(2)}€`)
}

console.log(`\nOutput written to: ${outputPath}`)
