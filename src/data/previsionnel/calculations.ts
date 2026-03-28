import { BudgetPrevisionnel, AnalysePret, ResultatsPrevisionnel, InvestissementAmortissable, BesoinsDemarrage, ChargesFixes, ImpotsTaxes } from "./types";

type T3 = [number, number, number];

function sum3(arrays: T3[]): T3 {
  return arrays.reduce<T3>((acc, a) => [acc[0] + a[0], acc[1] + a[1], acc[2] + a[2]], [0, 0, 0]);
}

// --- Calcul des investissements amortissables ---
const AMORTIZABLE_KEYS: (keyof BesoinsDemarrage)[] = [
  'fraisEtablissement', 'logicielsFormations',
  'depotMarqueBrevet', 'droitsEntree', 'achatFondsCommerce', 'droitAuBail',
  'enseigneCommunication',
  'achatImmobilier', 'travauxAmenagements', 'materiel', 'materielBureau',
];

function getDotationAmortissementAnnuelle(b: BudgetPrevisionnel): number {
  let total = 0;
  for (const key of AMORTIZABLE_KEYS) {
    const inv = b.besoins[key] as InvestissementAmortissable;
    if (inv.montant > 0 && inv.dureeAmortissement > 0) {
      total += inv.montant / inv.dureeAmortissement;
    }
  }
  return total;
}

function getTotalImmobilisationsAmortissables(b: BudgetPrevisionnel): number {
  let total = 0;
  for (const key of AMORTIZABLE_KEYS) {
    total += (b.besoins[key] as InvestissementAmortissable).montant;
  }
  return total;
}

export function getTotalBesoins(b: BudgetPrevisionnel): number {
  const bs = b.besoins;
  let total = 0;
  for (const key of AMORTIZABLE_KEYS) {
    total += (bs[key] as InvestissementAmortissable).montant;
  }
  total += bs.terrain + bs.fraisDossier + bs.fraisNotaireAvocat + bs.cautionDepotGarantie + bs.stockMatieresProduits + bs.tresorerieDépart;
  return total;
}

export function getTotalFinancement(b: BudgetPrevisionnel): number {
  const f = b.financement;
  return (
    f.apportPersonnel + f.apportsNature + (f.apportsComptesCourants?.[0] ?? 0) +
    f.prets.reduce((s, p) => s + p.montant, 0) +
    (f.subventionsInvestissement?.[0]?.montant ?? 0) + (f.subventionsInvestissement?.[1]?.montant ?? 0) +
    f.autreFinancement.montant
  );
}

// --- Amortissement des subventions d'investissement ---
function getRepriseSubventionsInvestAnnuelle(b: BudgetPrevisionnel): number {
  if (!b.financement.subventionsInvestissement) return 0;
  let total = 0;
  for (const sub of b.financement.subventionsInvestissement) {
    if (sub.montant > 0 && sub.dureeAmortissement > 0) {
      total += sub.montant / sub.dureeAmortissement;
    }
  }
  return total;
}

// --- Total subventions d'exploitation par an ---
function getSubventionsExploitationParAn(b: BudgetPrevisionnel): T3 {
  if (!b.financement.subventionsExploitation) return [0, 0, 0];
  const s1 = b.financement.subventionsExploitation[0].montants;
  const s2 = b.financement.subventionsExploitation[1].montants;
  return [s1[0] + s2[0], s1[1] + s2[1], s1[2] + s2[2]];
}

// --- Analyse des prêts (linéaire) ---
export function analysePret(pret: { montant: number; taux: number; dureeMois: number }): AnalysePret {
  if (pret.montant === 0 || pret.dureeMois === 0) {
    return {
      mensualite: 0, totalRembourse: 0, principalMensuel: 0,
      interetMensuel: 0, interetsTotaux: 0,
      interetsParAn: [0, 0, 0], principalParAn: [0, 0, 0],
    };
  }
  const principalMensuel = pret.montant / pret.dureeMois;
  const interetMensuel = (pret.montant * pret.taux) / 12;
  const mensualite = principalMensuel + interetMensuel;
  const totalRembourse = mensualite * pret.dureeMois;
  const interetsTotaux = interetMensuel * pret.dureeMois;

  const interetsParAn: T3 = [0, 0, 0];
  const principalParAn: T3 = [0, 0, 0];
  let moisRestants = pret.dureeMois;
  for (let an = 0; an < 3; an++) {
    const moisCetteAnnee = Math.min(moisRestants, 12);
    interetsParAn[an] = interetMensuel * moisCetteAnnee;
    principalParAn[an] = principalMensuel * moisCetteAnnee;
    moisRestants -= moisCetteAnnee;
  }

  return {
    mensualite, totalRembourse, principalMensuel,
    interetMensuel, interetsTotaux, interetsParAn, principalParAn,
  };
}

// --- Charges sociales ---
function getChargesSocialesEmployes(salairesNet: T3): T3 {
  // ~80% des salaires nets pour les charges patronales + salariales
  return salairesNet.map((s) => Math.round(s * 0.8)) as T3;
}

function getChargesSocialesDirigeant(
  b: BudgetPrevisionnel,
  remunerationNet: T3
): T3 {
  const statut = b.infos.statutJuridique;
  const acre = b.infos.acre;

  let taux: T3;
  if (statut === "Micro-entreprise") {
    const typeVente = b.infos.typeVente;
    const tauxBase = typeVente === "Services" ? 0.22 : typeVente === "Marchandises (y compris hébergement et restauration)" ? 0.128 : 0.22;
    if (acre) {
      taux = [tauxBase * 0.5, tauxBase * 0.75, tauxBase];
    } else {
      taux = [tauxBase, tauxBase, tauxBase];
    }
  } else if (statut === "SAS (IS)" || statut === "SASU (IS)") {
    // Assimilé salarié : ~80% charges
    if (acre) {
      taux = [0.40, 0.80, 0.80];
    } else {
      taux = [0.80, 0.80, 0.80];
    }
  } else {
    // TNS (EURL, SARL, EI) : ~45% charges
    if (acre) {
      taux = [0.23, 0.45, 0.45];
    } else {
      taux = [0.45, 0.45, 0.45];
    }
  }

  return remunerationNet.map((r, i) => Math.round(r * taux[i])) as T3;
}

// --- Total charges fixes (hors impôts/taxes) ---
function getTotalChargesFixes(cf: ChargesFixes): T3 {
  return sum3([
    cf.assurances, cf.telephoneInternet, cf.autresAbonnements,
    cf.carburantTransports, cf.fraisDeplacementHebergement,
    cf.eauElectriciteGaz, cf.mutuelle, cf.fournituresDiverses,
    cf.entretienMaterielVetements, cf.nettoyageLocaux,
    cf.budgetPubliciteCommunication, cf.loyerChargesLocatives,
    cf.expertComptableAvocats, cf.fraisBancairesTerminalCB,
    cf.autreCharge1.montants, cf.autreCharge2.montants,
    cf.autreCharge3.montants,
  ]);
}

// --- Total impôts et taxes ---
function getTotalImpotsTaxes(it: ImpotsTaxes): T3 {
  return sum3([
    it.cfe,
    it.autreTaxe1.montants, it.autreTaxe2.montants, it.autreTaxe3.montants,
  ]);
}

// --- Calcul principal ---
export function calculerPrevisionnel(b: BudgetPrevisionnel): ResultatsPrevisionnel {
  // CA année 1
  const caMarchAn1 = b.chiffreAffaires.marchandises.reduce(
    (sum, m) => sum + m.joursTravailes * m.caMoyenParJour, 0
  );
  const caServAn1 = b.chiffreAffaires.services.reduce(
    (sum, m) => sum + m.joursTravailes * m.caMoyenParJour, 0
  );

  const caMarhandisesParAn: T3 = [
    caMarchAn1,
    caMarchAn1 * (1 + b.chiffreAffaires.augmentationAn2Marchandises),
    caMarchAn1 * (1 + b.chiffreAffaires.augmentationAn2Marchandises) * (1 + b.chiffreAffaires.augmentationAn3Marchandises),
  ];
  const caServicesParAn: T3 = [
    caServAn1,
    caServAn1 * (1 + b.chiffreAffaires.augmentationAn2Services),
    caServAn1 * (1 + b.chiffreAffaires.augmentationAn2Services) * (1 + b.chiffreAffaires.augmentationAn3Services),
  ];
  const caTotalParAn: T3 = [
    caMarhandisesParAn[0] + caServicesParAn[0],
    caMarhandisesParAn[1] + caServicesParAn[1],
    caMarhandisesParAn[2] + caServicesParAn[2],
  ];

  // Achats consommés (charges variables sur marchandises)
  const achatsConsommesParAn: T3 = caMarhandisesParAn.map(
    (ca) => ca * b.chargesVariables.coutAchatMarchandisesPct
  ) as T3;

  // Marge brute
  const margeBruteParAn: T3 = caTotalParAn.map(
    (ca, i) => ca - achatsConsommesParAn[i]
  ) as T3;

  // Charges externes = charges fixes (hors taxes)
  const chargesExternesParAn: T3 = getTotalChargesFixes(b.chargesFixes);
  // Impôts et taxes (onglet séparé) — fallback pour anciens budgets
  const defaultIT: ImpotsTaxes = { tauxInflation: 0, cfe: [0,0,0], autreTaxe1: { nom: "", montants: [0,0,0] }, autreTaxe2: { nom: "", montants: [0,0,0] }, autreTaxe3: { nom: "", montants: [0,0,0] } };
  const impotsTaxesParAn: T3 = getTotalImpotsTaxes(b.impotsTaxes ?? defaultIT);

  // Valeur ajoutée
  const valeurAjouteeParAn: T3 = margeBruteParAn.map(
    (mb, i) => mb - chargesExternesParAn[i]
  ) as T3;

  // Salaires et charges sociales
  const salairesEmployesParAn: T3 = b.salaires.salairesEmployesNet;
  const chargesSocialesEmployesParAn = getChargesSocialesEmployes(salairesEmployesParAn);
  const remunerationDirigeantParAn: T3 = b.salaires.remunerationDirigeant;
  const chargesSocialesDirigeantParAn = getChargesSocialesDirigeant(b, remunerationDirigeantParAn);

  // EBE
  const ebeParAn: T3 = valeurAjouteeParAn.map(
    (va, i) =>
      va -
      impotsTaxesParAn[i] -
      salairesEmployesParAn[i] -
      chargesSocialesEmployesParAn[i] -
      remunerationDirigeantParAn[i] -
      chargesSocialesDirigeantParAn[i]
  ) as T3;

  // Amortissements
  const dotationAnnuelle = getDotationAmortissementAnnuelle(b);
  const dotationsAmortissementsParAn: T3 = [dotationAnnuelle, dotationAnnuelle, dotationAnnuelle];

  // Résultat d'exploitation
  const resultatExploitationParAn: T3 = ebeParAn.map(
    (ebe, i) => ebe - dotationsAmortissementsParAn[i]
  ) as T3;

  // Charges financières (intérêts des prêts)
  const analyses = b.financement.prets.map(analysePret);
  const chargesFinancieresParAn: T3 = [0, 1, 2].map((i) =>
    analyses.reduce((sum, a) => sum + a.interetsParAn[i], 0)
  ) as T3;

  // Subventions
  const repriseSubInvestAnnuelle = getRepriseSubventionsInvestAnnuelle(b);
  const repriseSubventionsInvestParAn: T3 = [repriseSubInvestAnnuelle, repriseSubInvestAnnuelle, repriseSubInvestAnnuelle];
  const subventionsExploitationParAn: T3 = getSubventionsExploitationParAn(b);

  // Résultat courant = Résultat d'exploitation - charges financières + reprises sub invest + sub exploitation
  const resultatCourantParAn: T3 = resultatExploitationParAn.map(
    (re, i) => re - chargesFinancieresParAn[i] + repriseSubventionsInvestParAn[i] + subventionsExploitationParAn[i]
  ) as T3;

  // Éléments divers impactant le résultat — fallback pour anciens budgets
  const divers = b.divers ?? { dividendes: [0,0,0], remboursementsComptesCourants: [0,0,0], cessionsImmobilisations: [0,0,0], indemnitesARecevoir: [0,0,0], indemnitesAPayer: [0,0,0] };
  const produitsDiversParAn: T3 = [0, 1, 2].map((i) =>
    (divers.cessionsImmobilisations[i] ?? 0) + (divers.indemnitesARecevoir[i] ?? 0)
  ) as T3;
  const chargesDiversesParAn: T3 = [...(divers.indemnitesAPayer ?? [0,0,0])] as T3;

  // Résultat net = résultat courant + produits divers - charges diverses
  const resultatNetParAn: T3 = resultatCourantParAn.map(
    (rc, i) => rc + produitsDiversParAn[i] - chargesDiversesParAn[i]
  ) as T3;

  // CAF = Résultat net + Dotations amortissements - Reprises subventions investissement
  // (les reprises sont un produit non-cash, on les neutralise)
  const capaciteAutofinancementParAn: T3 = resultatNetParAn.map(
    (rn, i) => rn + dotationsAmortissementsParAn[i] - repriseSubventionsInvestParAn[i]
  ) as T3;

  // Seuil de rentabilité
  const totalCoutsVariablesParAn = achatsConsommesParAn;
  const tauxMargeVariableParAn: T3 = caTotalParAn.map((ca, i) =>
    ca > 0 ? (ca - totalCoutsVariablesParAn[i]) / ca : 0
  ) as T3;

  const totalChargesFixesComplet: T3 = caTotalParAn.map((_, i) =>
    chargesExternesParAn[i] + impotsTaxesParAn[i] +
    salairesEmployesParAn[i] + chargesSocialesEmployesParAn[i] +
    remunerationDirigeantParAn[i] + chargesSocialesDirigeantParAn[i] +
    dotationsAmortissementsParAn[i] + chargesFinancieresParAn[i]
  ) as T3;

  const seuilRentabiliteParAn: T3 = tauxMargeVariableParAn.map((tmv, i) =>
    tmv > 0 ? totalChargesFixesComplet[i] / tmv : 0
  ) as T3;

  const pointMortJoursParAn: T3 = caTotalParAn.map((ca, i) =>
    ca > 0 ? Math.round((seuilRentabiliteParAn[i] / ca) * 365) : 0
  ) as T3;

  // BFR détaillé
  const creancesClientsParAn: T3 = caTotalParAn.map((ca) =>
    Math.round((ca / 365) * b.bfr.delaiClientsJours)
  ) as T3;
  const dettesFournisseursParAn: T3 = achatsConsommesParAn.map((achats) =>
    Math.round((achats / 365) * b.bfr.delaiFournisseursJours)
  ) as T3;
  const bfrParAn: T3 = creancesClientsParAn.map((c, i) =>
    c - dettesFournisseursParAn[i]
  ) as T3;
  const variationBfrParAn: T3 = [
    bfrParAn[0],
    bfrParAn[1] - bfrParAn[0],
    bfrParAn[2] - bfrParAn[1],
  ];

  // Plan de financement
  const totalBesoins = getTotalBesoins(b);
  const totalRessources = getTotalFinancement(b);
  const totalImmobilisationsAmortissables = getTotalImmobilisationsAmortissables(b);
  const remboursementsEmpruntParAn: T3 = [0, 1, 2].map((i) =>
    analyses.reduce((sum, a) => sum + a.principalParAn[i], 0)
  ) as T3;

  const div = divers;
  const cca = b.financement.apportsComptesCourants ?? [0, 0, 0];

  const variationTresorerieParAn: T3 = [
    totalRessources - totalBesoins - bfrParAn[0] + capaciteAutofinancementParAn[0]
      - remboursementsEmpruntParAn[0] - div.dividendes[0] - div.remboursementsComptesCourants[0],
    capaciteAutofinancementParAn[1] + cca[1]
      - remboursementsEmpruntParAn[1] - variationBfrParAn[1]
      - div.dividendes[1] - div.remboursementsComptesCourants[1],
    capaciteAutofinancementParAn[2] + cca[2]
      - remboursementsEmpruntParAn[2] - variationBfrParAn[2]
      - div.dividendes[2] - div.remboursementsComptesCourants[2],
  ];

  const excedentTresorerieParAn: T3 = [
    variationTresorerieParAn[0],
    variationTresorerieParAn[0] + variationTresorerieParAn[1],
    variationTresorerieParAn[0] + variationTresorerieParAn[1] + variationTresorerieParAn[2],
  ];

  // Trésorerie mensuelle année 1 (détaillée)
  const caMensuelMarch = b.chiffreAffaires.marchandises.map(
    (m) => m.joursTravailes * m.caMoyenParJour
  );
  const caMensuelServ = b.chiffreAffaires.services.map(
    (m) => m.joursTravailes * m.caMoyenParJour
  );
  const chargesMensuellesFixes = (chargesExternesParAn[0] + impotsTaxesParAn[0]) / 12;
  const salaireMensuelTotal =
    (salairesEmployesParAn[0] + chargesSocialesEmployesParAn[0] +
     remunerationDirigeantParAn[0] + chargesSocialesDirigeantParAn[0]) / 12;
  const remboursementMensuel = analyses.reduce((s, a) => s + a.mensualite, 0);

  const tresorerieMensuelle: number[] = [];
  const detailEncaissements: number[] = [];
  const detailAchats: number[] = [];
  const detailChargesFixes: number[] = [];
  const detailSalaires: number[] = [];
  const detailRemboursements: number[] = [];
  const detailSoldeMensuel: number[] = [];
  const detailTresorerieCumulee: number[] = [];

  let soldeCumul = b.besoins.tresorerieDépart;
  for (let m = 0; m < 12; m++) {
    const subExploitMensuel = subventionsExploitationParAn[0] / 12;
    const diversEncaissementsMensuel = (div.cessionsImmobilisations[0] + div.indemnitesARecevoir[0]) / 12;
    const encaissements = caMensuelMarch[m] + caMensuelServ[m] + subExploitMensuel + diversEncaissementsMensuel;
    const achats = caMensuelMarch[m] * b.chargesVariables.coutAchatMarchandisesPct;
    const diversDecaissementsMensuel = (div.indemnitesAPayer[0] + div.dividendes[0] + div.remboursementsComptesCourants[0]) / 12;
    const decaissements = achats + chargesMensuellesFixes + salaireMensuelTotal + remboursementMensuel + diversDecaissementsMensuel;
    const solde = encaissements - decaissements;
    soldeCumul += solde;

    detailEncaissements.push(Math.round(encaissements));
    detailAchats.push(Math.round(achats));
    detailChargesFixes.push(Math.round(chargesMensuellesFixes));
    detailSalaires.push(Math.round(salaireMensuelTotal));
    detailRemboursements.push(Math.round(remboursementMensuel));
    detailSoldeMensuel.push(Math.round(solde));
    detailTresorerieCumulee.push(Math.round(soldeCumul));
    tresorerieMensuelle.push(Math.round(soldeCumul));
  }

  // Contrôles
  const estRentable = resultatNetParAn[0] > 0;
  const tresorerieAdequate = tresorerieMensuelle.every((t) => t >= 0);

  return {
    caMarhandisesParAn, caServicesParAn, caTotalParAn,
    achatsConsommesParAn, margeBruteParAn,
    chargesExternesParAn, valeurAjouteeParAn, impotsTaxesParAn,
    salairesEmployesParAn, chargesSocialesEmployesParAn,
    remunerationDirigeantParAn, chargesSocialesDirigeantParAn,
    ebeParAn, dotationsAmortissementsParAn,
    resultatExploitationParAn, chargesFinancieresParAn,
    repriseSubventionsInvestParAn, subventionsExploitationParAn,
    resultatCourantParAn, produitsDiversParAn, chargesDiversesParAn,
    resultatNetParAn, capaciteAutofinancementParAn,
    seuilRentabiliteParAn, pointMortJoursParAn,
    creancesClientsParAn, dettesFournisseursParAn,
    bfrParAn, variationBfrParAn,
    totalBesoins, totalRessources, totalImmobilisationsAmortissables,
    remboursementsEmpruntParAn,
    variationTresorerieParAn, excedentTresorerieParAn,
    tresorerieMensuelle,
    tresorerieMensuelleDetail: {
      encaissements: detailEncaissements,
      achats: detailAchats,
      chargesFixes: detailChargesFixes,
      salaires: detailSalaires,
      remboursements: detailRemboursements,
      soldeMensuel: detailSoldeMensuel,
      tresorerieCumulee: detailTresorerieCumulee,
    },
    estRentable, tresorerieAdequate,
  };
}
