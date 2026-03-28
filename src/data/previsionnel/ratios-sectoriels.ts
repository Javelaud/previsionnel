/**
 * Ratios sectoriels de référence (source : Banque de France / INSEE)
 * Chaque ratio est exprimé en pourcentage du CA [min, median, max]
 */

export interface RatiosSecteur {
  secteur: string;
  /** Taux de marge brute = (CA - Achats consommés) / CA */
  margeBrute: { min: number; median: number; max: number };
  /** Taux de marge nette = Résultat net / CA */
  margeNette: { min: number; median: number; max: number };
  /** Taux de charges fixes = Charges externes / CA */
  chargesFixes: { min: number; median: number; max: number };
}

export const RATIOS_SECTORIELS: RatiosSecteur[] = [
  {
    secteur: "Commerce de détail",
    margeBrute:   { min: 22, median: 30, max: 40 },
    margeNette:   { min: 1,  median: 3,  max: 6  },
    chargesFixes: { min: 12, median: 20, max: 30 },
  },
  {
    secteur: "Commerce de gros",
    margeBrute:   { min: 12, median: 20, max: 28 },
    margeNette:   { min: 1,  median: 3,  max: 5  },
    chargesFixes: { min: 8,  median: 14, max: 22 },
  },
  {
    secteur: "Restauration / Hôtellerie",
    margeBrute:   { min: 58, median: 70, max: 78 },
    margeNette:   { min: 2,  median: 5,  max: 10 },
    chargesFixes: { min: 30, median: 45, max: 58 },
  },
  {
    secteur: "BTP / Construction",
    margeBrute:   { min: 30, median: 45, max: 58 },
    margeNette:   { min: 2,  median: 5,  max: 9  },
    chargesFixes: { min: 15, median: 25, max: 38 },
  },
  {
    secteur: "Services aux entreprises",
    margeBrute:   { min: 68, median: 80, max: 92 },
    margeNette:   { min: 6,  median: 14, max: 25 },
    chargesFixes: { min: 35, median: 50, max: 68 },
  },
  {
    secteur: "Services aux particuliers",
    margeBrute:   { min: 55, median: 70, max: 82 },
    margeNette:   { min: 4,  median: 10, max: 18 },
    chargesFixes: { min: 30, median: 45, max: 58 },
  },
  {
    secteur: "Santé / Bien-être",
    margeBrute:   { min: 72, median: 82, max: 92 },
    margeNette:   { min: 8,  median: 18, max: 30 },
    chargesFixes: { min: 35, median: 50, max: 65 },
  },
  {
    secteur: "Transport / Logistique",
    margeBrute:   { min: 30, median: 50, max: 65 },
    margeNette:   { min: 2,  median: 5,  max: 10 },
    chargesFixes: { min: 20, median: 35, max: 50 },
  },
  {
    secteur: "Industrie / Fabrication",
    margeBrute:   { min: 28, median: 40, max: 55 },
    margeNette:   { min: 2,  median: 5,  max: 10 },
    chargesFixes: { min: 18, median: 28, max: 40 },
  },
  {
    secteur: "Immobilier",
    margeBrute:   { min: 65, median: 78, max: 90 },
    margeNette:   { min: 5,  median: 12, max: 25 },
    chargesFixes: { min: 35, median: 50, max: 65 },
  },
  {
    secteur: "Agriculture / Élevage",
    margeBrute:   { min: 35, median: 50, max: 65 },
    margeNette:   { min: 3,  median: 8,  max: 15 },
    chargesFixes: { min: 20, median: 32, max: 48 },
  },
  {
    secteur: "Loisirs / Culture / Sport",
    margeBrute:   { min: 45, median: 62, max: 78 },
    margeNette:   { min: 1,  median: 6,  max: 12 },
    chargesFixes: { min: 30, median: 48, max: 65 },
  },
];

/**
 * Trouve les ratios sectoriels à partir d'un code APE
 * en cherchant dans quel secteur appartient ce code APE.
 */
export function getRatiosBySecteur(nomSecteur: string): RatiosSecteur | null {
  return RATIOS_SECTORIELS.find((r) => r.secteur === nomSecteur) ?? null;
}

/**
 * Détermine le statut d'un ratio client par rapport aux bornes sectorielles.
 * "bon"       : dans la fourchette [min, max]
 * "attention" : légèrement hors fourchette (±30% de l'écart)
 * "alerte"    : clairement hors fourchette
 */
export type StatutRatio = "bon" | "attention" | "alerte" | "inconnu";

export function getStatutRatio(
  valeur: number,
  ref: { min: number; median: number; max: number }
): StatutRatio {
  if (valeur >= ref.min && valeur <= ref.max) return "bon";
  const marge = (ref.max - ref.min) * 0.3;
  if (valeur >= ref.min - marge && valeur <= ref.max + marge) return "attention";
  return "alerte";
}
