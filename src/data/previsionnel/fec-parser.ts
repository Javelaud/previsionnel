/**
 * Parseur FEC (Fichier des Écritures Comptables) — Format DGFIP
 *
 * Le FEC est un fichier texte délimité par tabulations avec les colonnes :
 * JournalCode | JournalLib | EcritureNum | EcritureDate | CompteNum | CompteLib |
 * CompAuxNum | CompAuxLib | PieceRef | PieceDate | EcritureLib | Debit | Credit |
 * EcritureLet | DateLet | ValidDate | Montantdevise | Idevise
 *
 * Les montants Debit et Credit utilisent la virgule comme séparateur décimal.
 */

import type { BalanceNmoins1 } from "./types";

interface SoldeCompte {
  compteNum: string;
  compteLib: string;
  debit: number;
  credit: number;
  solde: number; // débit - crédit (positif = actif/débit, négatif = passif/crédit)
}

function parseAmount(s: string): number {
  if (!s || s.trim() === "") return 0;
  // FEC peut utiliser virgule ou point comme séparateur décimal
  return parseFloat(s.replace(",", ".")) || 0;
}

/**
 * Agrège les écritures FEC par numéro de compte.
 */
function aggregateByCompte(lines: string[][]): Map<string, SoldeCompte> {
  const map = new Map<string, SoldeCompte>();

  for (const cols of lines) {
    if (cols.length < 13) continue;
    const compteNum = cols[4]?.trim() ?? "";
    const compteLib = cols[5]?.trim() ?? "";
    const debit = parseAmount(cols[11]);
    const credit = parseAmount(cols[12]);

    if (!compteNum) continue;

    const existing = map.get(compteNum);
    if (existing) {
      existing.debit += debit;
      existing.credit += credit;
      existing.solde = existing.debit - existing.credit;
    } else {
      map.set(compteNum, {
        compteNum,
        compteLib,
        debit,
        credit,
        solde: debit - credit,
      });
    }
  }

  return map;
}

/**
 * Somme le solde débiteur net (max 0) pour les comptes commençant par un des préfixes.
 * Utilisé pour les comptes d'actif (solde normalement débiteur).
 */
function sumSoldeDebiteur(
  map: Map<string, SoldeCompte>,
  prefixes: string[]
): number {
  let total = 0;
  for (const [num, s] of map) {
    if (prefixes.some((p) => num.startsWith(p))) {
      total += Math.max(0, s.solde); // solde débiteur = actif
    }
  }
  return Math.round(total);
}

/**
 * Somme le solde créditeur net (max 0) pour les comptes commençant par un des préfixes.
 * Utilisé pour les comptes de passif (solde normalement créditeur).
 */
function sumSoldeCrediteur(
  map: Map<string, SoldeCompte>,
  prefixes: string[]
): number {
  let total = 0;
  for (const [num, s] of map) {
    if (prefixes.some((p) => num.startsWith(p))) {
      total += Math.max(0, -s.solde); // solde créditeur = passif
    }
  }
  return Math.round(total);
}

/**
 * Somme les débits bruts (charges de classe 6, dotations, etc.)
 */
function sumDebit(
  map: Map<string, SoldeCompte>,
  prefixes: string[]
): number {
  let total = 0;
  for (const [num, s] of map) {
    if (prefixes.some((p) => num.startsWith(p))) {
      total += s.debit;
    }
  }
  return Math.round(total);
}

/**
 * Somme les crédits bruts (produits de classe 7, etc.)
 */
function sumCredit(
  map: Map<string, SoldeCompte>,
  prefixes: string[]
): number {
  let total = 0;
  for (const [num, s] of map) {
    if (prefixes.some((p) => num.startsWith(p))) {
      total += s.credit;
    }
  }
  return Math.round(total);
}

/**
 * Détecte la ligne d'en-tête et extrait le numéro d'exercice depuis EcritureDate.
 */
function detectExercice(lines: string[][]): string | undefined {
  for (const cols of lines) {
    const date = cols[3]?.trim() ?? "";
    if (date.length >= 4) {
      return date.slice(0, 4); // année AAAA
    }
  }
  return undefined;
}

/**
 * Parse un fichier FEC (contenu texte) et retourne une BalanceNmoins1.
 */
export function parseFec(content: string): BalanceNmoins1 {
  // Détecter le délimiteur (tabulation ou point-virgule ou pipe)
  const firstLine = content.split("\n")[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes("|") ? "|" : ";";

  const rows = content
    .split("\n")
    .map((l) => l.split(delimiter));

  // Supprimer l'en-tête (première ligne)
  const dataRows = rows.slice(1).filter((r) => r.length >= 13);

  const map = aggregateByCompte(dataRows);
  const exercice = detectExercice(dataRows);

  // ── ACTIF ─────────────────────────────────────────────────────────────────

  // Immobilisations brutes (classe 20, 21, 22, 23, 26, 27)
  const immoBrutes = sumSoldeDebiteur(map, ["20", "21", "22", "23", "26", "27"]);
  // Amortissements cumulés (classe 28) — solde créditeur
  const amortissementsCumules = sumSoldeCrediteur(map, ["28"]);
  const immobilisationsNettes = Math.max(0, immoBrutes - amortissementsCumules);

  // Stocks (classe 3x)
  const stocks = sumSoldeDebiteur(map, ["30", "31", "32", "33", "34", "35", "36", "37"]);

  // Créances clients (classe 41x)
  const creancesClients = sumSoldeDebiteur(map, ["41"]);

  // Trésorerie (classe 5x)
  const tresorerie = sumSoldeDebiteur(map, ["50", "51", "53", "54", "58"]);

  // ── PASSIF ────────────────────────────────────────────────────────────────

  // Capitaux propres (classe 10, 11, 12, 13, 14, 15)
  const capitauxPropres = sumSoldeCrediteur(map, ["10", "11", "12", "13", "14", "15"]);

  // Dettes financières LT (classe 16)
  const dettesFinancieresLT = sumSoldeCrediteur(map, ["16"]);

  // Dettes fournisseurs (classe 40x)
  const dettesFournisseurs = sumSoldeCrediteur(map, ["40"]);

  // Autres dettes CT (classes 42 à 49 hors 41)
  const autresDettesCT = sumSoldeCrediteur(map, ["42", "43", "44", "45", "46", "47", "48", "49"]);

  // ── COMPTE DE RÉSULTAT N-1 ────────────────────────────────────────────────

  // CA Marchandises (707 = ventes de marchandises, + 706 ventes produits finis assimilés)
  const caMarchandises = sumCredit(map, ["707"]);
  // CA Services (706 = prestations de services, 704, 705, 701, 702, 703)
  const caServices = sumCredit(map, ["701", "702", "703", "704", "705", "706", "708"]);
  const caTotal = caMarchandises + caServices;

  // Achats consommés (60x = achats marchandises/matières)
  // On prend le net (débit - avoir sur achats des comptes 609)
  const achatsDebit = sumDebit(map, ["600", "601", "602", "603", "604", "605", "606", "607", "608"]);
  const achatsCredit = sumCredit(map, ["609"]); // avoirs sur achats
  const achatsConsommes = Math.max(0, achatsDebit - achatsCredit);

  const margeBrute = caTotal - achatsConsommes;

  // Charges externes (61x + 62x)
  const chargesExternes = sumDebit(map, ["61", "62"]);

  const valeurAjoutee = margeBrute - chargesExternes;

  // Impôts et taxes (63x)
  const impotsTaxes = sumDebit(map, ["63"]);

  // Charges de personnel (64x)
  const chargesPersonnel = sumDebit(map, ["64"]);

  const ebe = valeurAjoutee - impotsTaxes - chargesPersonnel;

  // Dotations amortissements et provisions (68x)
  const dotationsAmortissements = sumDebit(map, ["68"]);

  const resultatExploitation = ebe - dotationsAmortissements;

  // Charges financières (66x)
  const chargesFinancieres = sumDebit(map, ["66"]);
  // Produits financiers (76x)
  const produitsFinanciers = sumCredit(map, ["76"]);

  const resultatCourant = resultatExploitation - chargesFinancieres + produitsFinanciers;

  // Éléments exceptionnels (67x - 77x)
  const chargesExceptionnelles = sumDebit(map, ["67"]);
  const produitsExceptionnels = sumCredit(map, ["77"]);

  // Impôt sur les bénéfices (695x)
  const is = sumDebit(map, ["695"]);

  const resultatNet = resultatCourant + produitsExceptionnels - chargesExceptionnelles - is;

  // CAF = résultat net + dotations amortissements
  const capaciteAutofinancement = resultatNet + dotationsAmortissements;

  return {
    immobilisationsNettes,
    stocks,
    creancesClients,
    tresorerie,
    capitauxPropres,
    dettesFinancieresLT,
    dettesFournisseurs,
    autresDettesCT,
    compteResultat: {
      caMarchandises,
      caServices,
      caTotal,
      achatsConsommes,
      margeBrute,
      chargesExternes,
      valeurAjoutee,
      impotsTaxes,
      chargesPersonnel,
      ebe,
      dotationsAmortissements,
      resultatExploitation,
      chargesFinancieres,
      autresProduits: produitsFinanciers + produitsExceptionnels,
      autresCharges: chargesExceptionnelles + is,
      resultatNet,
      capaciteAutofinancement,
    },
    source: "fec" as const,
    exercice,
  };
}
