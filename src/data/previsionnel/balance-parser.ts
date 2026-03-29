/**
 * Parseur Balance Comptable au format Excel (XLSX)
 *
 * Format attendu (issu des principaux logiciels comptables FR : Sage, Cegid, EBP…) :
 *   Col A : Compte (numéro)
 *   Col B : Intitulé
 *   Col C : Débit période N-1 (ou ouverture)
 *   Col D : Crédit période N-1 (ou ouverture)
 *   Col E : Débit période N (ou clôture)
 *   Col F : Crédit période N (ou clôture)
 *
 * Pour le BILAN N-1 : utilise les colonnes C/D (soldes d'ouverture = clôture N-1).
 * Pour le COMPTE DE RÉSULTAT : utilise les colonnes E/F (mouvements de l'exercice).
 */

import type { BalanceNmoins1, LigneBalanceDetail } from "./types";

interface LigneBalance {
  compte: string;
  intitule: string;
  /** Débit colonne 3 (ouverture / N-1) */
  dDeb: number;
  /** Crédit colonne 4 (ouverture / N-1) */
  cDeb: number;
  /** Débit colonne 5 (clôture / N courant) */
  dFin: number;
  /** Crédit colonne 6 (clôture / N courant) */
  cFin: number;
  /** Solde N-1 : positif = débiteur (actif), négatif = créditeur (passif) */
  soldeDeb: number;
  /** Solde N (courant) : positif = débiteur, négatif = créditeur */
  soldeFin: number;
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function startsWithAny(s: string, prefixes: string[]): boolean {
  return prefixes.some((p) => s.startsWith(p));
}

/**
 * Parse un ArrayBuffer (contenu du fichier .xlsx) et retourne une BalanceNmoins1.
 */
export async function parseBalanceXlsx(buffer: ArrayBuffer): Promise<BalanceNmoins1> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];

  // ── Détecter les lignes de données ───────────────────────────────────────
  // On ignore les 2 premières lignes (en-têtes) et les lignes sans numéro de compte
  const lignes: LigneBalance[] = [];
  let exercice: string | undefined;

  // Chercher l'exercice dans la première ligne
  const h0 = String(rows[0]?.[2] ?? "");
  const matchExo = h0.match(/\d{4}/);
  if (matchExo) exercice = matchExo[0];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const compteRaw = String(row[0] ?? "").trim();
    // Ne conserver que les lignes avec un numéro de compte numérique
    if (!compteRaw || !/^\d/.test(compteRaw)) continue;
    const compte = compteRaw;
    const intitule = String(row[1] ?? "").trim();
    const dDeb = num(row[2]);
    const cDeb = num(row[3]);
    const dFin = num(row[4] ?? 0);
    const cFin = num(row[5] ?? 0);
    lignes.push({
      compte, intitule,
      dDeb, cDeb, dFin, cFin,
      soldeDeb: dDeb - cDeb,
      soldeFin: dFin - cFin,
    });
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /** Actif N-1 : somme des soldes débiteurs (positifs) pour les préfixes donnés */
  const actifDeb = (prefixes: string[]) =>
    Math.round(lignes.filter(l => startsWithAny(l.compte, prefixes) && l.soldeDeb > 0)
      .reduce((s, l) => s + l.soldeDeb, 0));

  /** Passif N-1 : somme des soldes créditeurs (négatifs → valeur absolue) */
  const passifDeb = (prefixes: string[]) =>
    Math.round(lignes.filter(l => startsWithAny(l.compte, prefixes) && l.soldeDeb < 0)
      .reduce((s, l) => s + Math.abs(l.soldeDeb), 0));

  /** Charge N : montant net débiteur sur la période */
  const chargeFin = (prefixes: string[]) =>
    Math.round(lignes.filter(l => startsWithAny(l.compte, prefixes))
      .reduce((s, l) => s + l.soldeFin, 0));

  /** Produit N : montant net créditeur (négatif → valeur absolue) sur la période */
  const produitFin = (prefixes: string[]) =>
    Math.round(lignes.filter(l => startsWithAny(l.compte, prefixes) && l.soldeFin < 0)
      .reduce((s, l) => s + Math.abs(l.soldeFin), 0));

  /** Lignes de détail pour une catégorie (CdR, colonnes E/F) */
  const detailCharges = (prefixes: string[]): LigneBalanceDetail[] =>
    lignes
      .filter(l => startsWithAny(l.compte, prefixes) && Math.abs(l.soldeFin) > 0.01)
      .map(l => ({ compte: l.compte, intitule: l.intitule, montant: l.soldeFin }))
      .filter(l => Math.abs(l.montant) > 0.01)
      .sort((a, b) => a.compte.localeCompare(b.compte));

  const detailProduits = (prefixes: string[]): LigneBalanceDetail[] =>
    lignes
      .filter(l => startsWithAny(l.compte, prefixes) && Math.abs(l.soldeFin) > 0.01)
      .map(l => ({ compte: l.compte, intitule: l.intitule, montant: Math.abs(l.soldeFin) }))
      .filter(l => l.montant > 0.01)
      .sort((a, b) => a.compte.localeCompare(b.compte));

  // ── BILAN N-1 (colonnes D_debut / C_debut) ───────────────────────────────

  // Actif
  // Immobilisations : toute la classe 2 (incorp. 20x, corp. 21-25x, financ. 26-27x)
  // moins amortissements (28x) et dépréciations (29x)
  const immoBrutes = actifDeb(["20", "21", "22", "23", "24", "25", "26", "27"]);
  const amortissements = passifDeb(["28", "29"]);
  const immobilisationsNettes = Math.max(0, immoBrutes - amortissements);

  // Stocks nets : toute la classe 3 (30x-37x) moins dépréciations (39x)
  const stocksBrut = actifDeb(["30", "31", "32", "33", "34", "35", "36", "37"]);
  const stocksProv = passifDeb(["39"]);
  const stocks = Math.max(0, stocksBrut - stocksProv);

  // Créances clients nettes : 41x débit − 419x crédit (avances reçues de clients)
  const creancesBrut = actifDeb(["41"]);
  const avancesClientsRecues = passifDeb(["419"]);
  const creancesClients = Math.max(0, creancesBrut - avancesClientsRecues);

  // Autres créances actif : avances fournisseurs (409x) + créances fiscales/sociales/diverses
  // (42x-49x soldes débiteurs, dont 444x IS avance, 445x TVA déductible, 486x CCA, 45x associés débiteurs…)
  const autresCreances = actifDeb([
    "409",
    "42", "43", "44", "45", "46", "47", "48", "49",
  ]);

  // Trésorerie : toute la classe 5 (VMP 50x, banques 51x, caisse 53x, etc.)
  const tresorerie = actifDeb(["50", "51", "52", "53", "54", "55", "56", "57", "58"]);

  // Passif
  // Capitaux propres nets (10x-14x créditeurs, moins 139x débiteur)
  // 14x = provisions réglementées (réserves fiscales incluses dans CP en France)
  const cpBrut = passifDeb([
    "101", "102", "104", "106", "107",
    "110", "111", "112", "113", "114", "115", "119",
    "120", "121", "129",
    "130", "131", "132", "134",
    "14",
  ]);
  const cpReductions = actifDeb(["139"]);
  const capitauxPropres = Math.max(0, cpBrut - cpReductions);

  // Provisions pour risques et charges (15x) — hors CP
  const provisions = passifDeb(["15"]);

  // Dettes financières LT (emprunts classe 16x)
  const dettesFinancieresLT = passifDeb(["16"]);

  // Dettes fournisseurs (401x, 403x, 404x, 408x) — NON nettées avec les avances 409x
  // Les avances versées aux fournisseurs (409x) sont en actif (autresCreances)
  const dettesFournisseurs = passifDeb(["401", "403", "404", "408"]);

  // Autres dettes CT : dettes sociales (42x-43x), fiscales (44x-45x), associés (455x),
  // produits constatés d'avance (487x) et autres (46x-49x créditeurs)
  const autresDettesCT = passifDeb([
    "421", "422", "423", "424", "425", "426", "427", "428",
    "431", "437", "438",
    "441", "442", "443", "444", "445", "446", "447", "448",
    "455", "456", "457", "458",
    "462", "464",
    "483", "485", "487",
  ]);

  // ── COMPTE DE RÉSULTAT N (colonnes D_fin / C_fin) ────────────────────────
  // Nota : les comptes de classe 6 et 7 ont un solde nul à l'ouverture (réinitialisation annuelle)
  // → les mouvements figurent uniquement en D_fin / C_fin

  // CA : produits d'exploitation (70x à 75x, valeur absolue solde créditeur)
  const caMarchandisesLignes = detailProduits(["701", "702", "703", "707"]);
  const caServicesLignes = detailProduits(["704", "705", "706", "708"]);
  const caMarchandises = caMarchandisesLignes.reduce((s, l) => s + l.montant, 0);
  const caServices = caServicesLignes.reduce((s, l) => s + l.montant, 0);
  const caTotal = caMarchandises + caServices;

  // Achats (60x) : positif = débit = charge
  // 603x (variation de stocks) peut être négatif (crédit = stock augmente = réduit charge)
  const achatsLignes = detailCharges(["601", "602", "603", "604", "605", "606", "607", "608"]);
  const achatsConsommes = Math.max(0, achatsLignes.reduce((s, l) => s + l.montant, 0));
  const margeBrute = caTotal - achatsConsommes;

  // Charges externes (61x, 62x) — hors 64x personnel
  const chargesExternesLignes = detailCharges(["61", "62"]);
  const chargesExternes = chargesExternesLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);
  const valeurAjoutee = margeBrute - chargesExternes;

  // Impôts et taxes (63x)
  const impotsTaxesLignes = detailCharges(["63"]);
  const impotsTaxes = impotsTaxesLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);

  // Charges de personnel (64x)
  const chargesPersonnelLignes = detailCharges(["64"]);
  const chargesPersonnel = chargesPersonnelLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);
  const ebe = valeurAjoutee - impotsTaxes - chargesPersonnel;

  // Dotations amortissements (68x)
  const dotationsLignes = detailCharges(["68"]);
  const dotationsAmortissements = dotationsLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);
  const resultatExploitation = ebe - dotationsAmortissements;

  // Charges financières (66x)
  const chargesFinancieresLignes = detailCharges(["66"]);
  const chargesFinancieres = chargesFinancieresLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);

  // Autres produits (74x subventions, 75x produits divers, 76x financiers, 77x, 78x reprises)
  const autresProduitsLignes = [
    ...detailProduits(["74", "75", "76", "77", "78"]),
  ];
  const autresProduits = autresProduitsLignes.reduce((s, l) => s + l.montant, 0);

  // Autres charges (65x, 67x — exceptionnel)
  const autresChargesLignes = detailCharges(["65", "67"]);
  const autresCharges = autresChargesLignes.reduce((s, l) => s + Math.max(0, l.montant), 0);

  // IS (695x)
  const is = Math.max(0, chargeFin(["695"]));

  const resultatNet = resultatExploitation - chargesFinancieres + autresProduits - autresCharges - is;
  const capaciteAutofinancement = resultatNet + dotationsAmortissements;

  return {
    immobilisationsNettes,
    stocks,
    creancesClients,
    autresCreances,
    tresorerie,
    capitauxPropres,
    provisions,
    dettesFinancieresLT,
    dettesFournisseurs,
    autresDettesCT,
    compteResultat: {
      caMarchandises: Math.round(caMarchandises),
      caServices: Math.round(caServices),
      caTotal: Math.round(caTotal),
      achatsConsommes: Math.round(achatsConsommes),
      margeBrute: Math.round(margeBrute),
      chargesExternes: Math.round(chargesExternes),
      valeurAjoutee: Math.round(valeurAjoutee),
      impotsTaxes: Math.round(impotsTaxes),
      chargesPersonnel: Math.round(chargesPersonnel),
      ebe: Math.round(ebe),
      dotationsAmortissements: Math.round(dotationsAmortissements),
      resultatExploitation: Math.round(resultatExploitation),
      chargesFinancieres: Math.round(chargesFinancieres),
      autresProduits: Math.round(autresProduits),
      autresCharges: Math.round(autresCharges),
      resultatNet: Math.round(resultatNet),
      capaciteAutofinancement: Math.round(capaciteAutofinancement),
    },
    detailLignes: {
      ca: [...caMarchandisesLignes, ...caServicesLignes].sort((a, b) => a.compte.localeCompare(b.compte)),
      achats: achatsLignes,
      chargesExternes: chargesExternesLignes,
      impotsTaxes: impotsTaxesLignes,
      chargesPersonnel: chargesPersonnelLignes,
      chargesFinancieres: chargesFinancieresLignes,
      dotations: dotationsLignes,
      autresCharges: autresChargesLignes,
      autresProduits: autresProduitsLignes,
    },
    source: "balance" as const,
    exercice,
  };
}
