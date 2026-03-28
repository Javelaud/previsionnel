import type { BudgetPrevisionnel, ResultatsPrevisionnel } from "./types";

const MOIS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + " %";
}

function row(label: string, ...values: (string | number)[]): (string | number)[] {
  return [label, ...values];
}

function header(...cells: string[]): string[] {
  return cells;
}

function blank(): string[] {
  return [];
}

function title(label: string): string[] {
  return [label];
}

// ---------------------------------------------------------------------------
// Sheet 1 – Données saisies
// ---------------------------------------------------------------------------

function buildSheet1(b: BudgetPrevisionnel): (string | number)[][] {
  const { infos, besoins, financement, chargesFixes, chiffreAffaires, chargesVariables, bfr, salaires } = b;

  const data: (string | number)[][] = [];

  // Informations générales
  data.push(title("INFORMATIONS GÉNÉRALES"));
  data.push(blank());
  data.push(row("Prénom / Nom", infos.prenomNom));
  data.push(row("Intitulé du projet", infos.intituleProjet));
  data.push(row("Statut juridique", infos.statutJuridique));
  data.push(row("Téléphone", infos.telephone));
  data.push(row("Email", infos.email));
  data.push(row("Ville", infos.ville));
  data.push(row("Type de vente", infos.typeVente));
  data.push(row("Régime fiscal", infos.regimeFiscal));
  data.push(row("ACRE", infos.acre ? "Oui" : "Non"));
  data.push(blank());

  // Besoins de démarrage
  data.push(title("BESOINS DE DÉMARRAGE"));
  data.push(blank());
  data.push(header("Investissement amortissable", "Montant", "Durée (ans)"));
  data.push(row("Frais d'établissement", eur(besoins.fraisEtablissement.montant), besoins.fraisEtablissement.dureeAmortissement));
  data.push(row("Logiciels / Formations", eur(besoins.logicielsFormations.montant), besoins.logicielsFormations.dureeAmortissement));
  data.push(row("Dépôt marque / Brevet", eur(besoins.depotMarqueBrevet.montant), besoins.depotMarqueBrevet.dureeAmortissement));
  data.push(row("Droits d'entrée", eur(besoins.droitsEntree.montant), besoins.droitsEntree.dureeAmortissement));
  data.push(row("Achat fonds de commerce", eur(besoins.achatFondsCommerce.montant), besoins.achatFondsCommerce.dureeAmortissement));
  data.push(row("Droit au bail", eur(besoins.droitAuBail.montant), besoins.droitAuBail.dureeAmortissement));
  data.push(row("Enseigne / Communication", eur(besoins.enseigneCommunication.montant), besoins.enseigneCommunication.dureeAmortissement));
  data.push(row("Achat immobilier", eur(besoins.achatImmobilier.montant), besoins.achatImmobilier.dureeAmortissement));
  data.push(row("Travaux / Aménagements", eur(besoins.travauxAmenagements.montant), besoins.travauxAmenagements.dureeAmortissement));
  data.push(row("Matériel", eur(besoins.materiel.montant), besoins.materiel.dureeAmortissement));
  data.push(row("Matériel de bureau", eur(besoins.materielBureau.montant), besoins.materielBureau.dureeAmortissement));
  data.push(blank());
  data.push(header("Immobilisation non amortissable", "Montant"));
  data.push(row("Terrain", eur(besoins.terrain)));
  data.push(blank());
  data.push(header("Charges (non amortissables)", "Montant"));
  data.push(row("Frais de dossier", eur(besoins.fraisDossier)));
  data.push(row("Frais notaire / Avocat / Expert comptable", eur(besoins.fraisNotaireAvocat)));
  data.push(blank());
  data.push(header("Autres besoins", "Montant"));
  data.push(row("Caution / Dépôt de garantie", eur(besoins.cautionDepotGarantie)));
  data.push(row("Stock matières / Produits", eur(besoins.stockMatieresProduits)));
  data.push(row("Trésorerie de départ", eur(besoins.tresorerieDépart)));
  data.push(blank());

  // Financement
  data.push(title("FINANCEMENT"));
  data.push(blank());
  data.push(row("Apport personnel", eur(financement.apportPersonnel)));
  data.push(row("Apports en nature", eur(financement.apportsNature)));
  financement.prets.forEach((p, i) => {
    if (p.montant > 0) {
      data.push(row(
        `Prêt ${i + 1} – ${p.nom}`,
        eur(p.montant),
        `${(p.taux * 100).toFixed(2)} %`,
        `${p.dureeMois} mois`,
      ));
    }
  });
  financement.subventionsInvestissement.forEach((sub) => {
    if (sub.montant > 0)
      data.push(row(`Sub. investissement – ${sub.nom}`, eur(sub.montant), `${sub.dureeAmortissement} ans`));
  });
  financement.subventionsExploitation.forEach((sub) => {
    if (sub.montants[0] > 0 || sub.montants[1] > 0 || sub.montants[2] > 0)
      data.push(row(`Sub. exploitation – ${sub.nom}`, eur(sub.montants[0]), eur(sub.montants[1]), eur(sub.montants[2])));
  });
  if (financement.autreFinancement.montant > 0)
    data.push(row(`Autre – ${financement.autreFinancement.nom}`, eur(financement.autreFinancement.montant)));
  data.push(blank());

  // Charges fixes
  data.push(title("CHARGES FIXES (annuelles)"));
  data.push(blank());
  data.push(header("Poste", "Année 1", "Année 2", "Année 3"));

  const cfRows: [string, [number, number, number]][] = [
    ["Assurances", chargesFixes.assurances],
    ["Téléphone / Internet", chargesFixes.telephoneInternet],
    ["Autres abonnements", chargesFixes.autresAbonnements],
    ["Carburant / Transports", chargesFixes.carburantTransports],
    ["Frais déplacement / Hébergement", chargesFixes.fraisDeplacementHebergement],
    ["Eau / Électricité / Gaz", chargesFixes.eauElectriciteGaz],
    ["Mutuelle", chargesFixes.mutuelle],
    ["Fournitures diverses", chargesFixes.fournituresDiverses],
    ["Entretien matériel / Vêtements", chargesFixes.entretienMaterielVetements],
    ["Nettoyage des locaux", chargesFixes.nettoyageLocaux],
    ["Budget publicité / Communication", chargesFixes.budgetPubliciteCommunication],
    ["Loyer / Charges locatives", chargesFixes.loyerChargesLocatives],
    ["Expert-comptable / Avocats", chargesFixes.expertComptableAvocats],
    ["Frais bancaires / Terminal CB", chargesFixes.fraisBancairesTerminalCB],
  ];
  cfRows.forEach(([label, vals]) => {
    data.push(row(label, eur(vals[0]), eur(vals[1]), eur(vals[2])));
  });
  if (chargesFixes.autreCharge1.nom)
    data.push(row(
      chargesFixes.autreCharge1.nom,
      eur(chargesFixes.autreCharge1.montants[0]),
      eur(chargesFixes.autreCharge1.montants[1]),
      eur(chargesFixes.autreCharge1.montants[2]),
    ));
  if (chargesFixes.autreCharge2.nom)
    data.push(row(
      chargesFixes.autreCharge2.nom,
      eur(chargesFixes.autreCharge2.montants[0]),
      eur(chargesFixes.autreCharge2.montants[1]),
      eur(chargesFixes.autreCharge2.montants[2]),
    ));
  if (chargesFixes.autreCharge3.nom)
    data.push(row(
      chargesFixes.autreCharge3.nom,
      eur(chargesFixes.autreCharge3.montants[0]),
      eur(chargesFixes.autreCharge3.montants[1]),
      eur(chargesFixes.autreCharge3.montants[2]),
    ));
  data.push(blank());

  // Impôts et taxes
  const impotsTaxes = b.impotsTaxes;
  data.push(title("IMPÔTS ET TAXES"));
  data.push(blank());
  data.push(header("Poste", "Année 1", "Année 2", "Année 3"));
  data.push(row("CFE", eur(impotsTaxes.cfe[0]), eur(impotsTaxes.cfe[1]), eur(impotsTaxes.cfe[2])));
  if (impotsTaxes.autreTaxe1.nom)
    data.push(row(impotsTaxes.autreTaxe1.nom, eur(impotsTaxes.autreTaxe1.montants[0]), eur(impotsTaxes.autreTaxe1.montants[1]), eur(impotsTaxes.autreTaxe1.montants[2])));
  if (impotsTaxes.autreTaxe2.nom)
    data.push(row(impotsTaxes.autreTaxe2.nom, eur(impotsTaxes.autreTaxe2.montants[0]), eur(impotsTaxes.autreTaxe2.montants[1]), eur(impotsTaxes.autreTaxe2.montants[2])));
  if (impotsTaxes.autreTaxe3.nom)
    data.push(row(impotsTaxes.autreTaxe3.nom, eur(impotsTaxes.autreTaxe3.montants[0]), eur(impotsTaxes.autreTaxe3.montants[1]), eur(impotsTaxes.autreTaxe3.montants[2])));
  data.push(blank());

  // CA mois par mois
  data.push(title("CHIFFRE D'AFFAIRES – ANNÉE 1 (mois par mois)"));
  data.push(blank());
  data.push(header(
    "Mois",
    "Jours trav. Marchandises", "CA/jour Marchandises", "CA Marchandises",
    "Jours trav. Services", "CA/jour Services", "CA Services",
    "CA Total",
  ));
  chiffreAffaires.marchandises.forEach((m, i) => {
    const s = chiffreAffaires.services[i] ?? { joursTravailes: 0, caMoyenParJour: 0 };
    const caM = m.joursTravailes * m.caMoyenParJour;
    const caS = s.joursTravailes * s.caMoyenParJour;
    data.push([
      MOIS[i],
      m.joursTravailes,
      eur(m.caMoyenParJour),
      eur(caM),
      s.joursTravailes,
      eur(s.caMoyenParJour),
      eur(caS),
      eur(caM + caS),
    ]);
  });
  data.push(row(
    "Augmentation An 2",
    pct(chiffreAffaires.augmentationAn2Marchandises),
    "", "", "",
    pct(chiffreAffaires.augmentationAn2Services),
  ));
  data.push(row(
    "Augmentation An 3",
    pct(chiffreAffaires.augmentationAn3Marchandises),
    "", "", "",
    pct(chiffreAffaires.augmentationAn3Services),
  ));
  data.push(blank());

  // Charges variables
  data.push(title("CHARGES VARIABLES"));
  data.push(blank());
  data.push(row("Coût d'achat marchandises (% du CA)", pct(chargesVariables.coutAchatMarchandisesPct)));
  data.push(blank());

  // BFR
  data.push(title("BESOIN EN FONDS DE ROULEMENT"));
  data.push(blank());
  data.push(row("Délai clients (jours)", bfr.delaiClientsJours));
  data.push(row("Délai fournisseurs (jours)", bfr.delaiFournisseursJours));
  data.push(blank());

  // Salaires
  data.push(title("SALAIRES"));
  data.push(blank());
  data.push(header("Poste", "Année 1", "Année 2", "Année 3"));
  data.push(row(
    "Salaires employés (net)",
    eur(salaires.salairesEmployesNet[0]),
    eur(salaires.salairesEmployesNet[1]),
    eur(salaires.salairesEmployesNet[2]),
  ));
  data.push(row(
    "Rémunération dirigeant",
    eur(salaires.remunerationDirigeant[0]),
    eur(salaires.remunerationDirigeant[1]),
    eur(salaires.remunerationDirigeant[2]),
  ));

  return data;
}

// ---------------------------------------------------------------------------
// Sheet 2 – Plan financier
// ---------------------------------------------------------------------------

function buildSheet2(r: ResultatsPrevisionnel): (string | number)[][] {
  const data: (string | number)[][] = [];

  // Compte de résultat
  data.push(title("COMPTE DE RÉSULTAT PRÉVISIONNEL"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));

  const cr: [string, [number, number, number]][] = [
    ["CA Marchandises", r.caMarhandisesParAn],
    ["CA Services", r.caServicesParAn],
    ["CA Total", r.caTotalParAn],
    ["Achats consommés", r.achatsConsommesParAn],
    ["Marge brute", r.margeBruteParAn],
    ["Charges externes", r.chargesExternesParAn],
    ["Valeur ajoutée", r.valeurAjouteeParAn],
    ["Impôts et taxes", r.impotsTaxesParAn],
    ["Salaires employés", r.salairesEmployesParAn],
    ["Charges sociales employés", r.chargesSocialesEmployesParAn],
    ["Rémunération dirigeant", r.remunerationDirigeantParAn],
    ["Charges sociales dirigeant", r.chargesSocialesDirigeantParAn],
    ["EBE", r.ebeParAn],
    ["Dotations amortissements", r.dotationsAmortissementsParAn],
    ["Résultat d'exploitation", r.resultatExploitationParAn],
    ["Charges financières", r.chargesFinancieresParAn],
    ["Quote-part sub. invest. virée au résultat", r.repriseSubventionsInvestParAn],
    ["Subventions d'exploitation", r.subventionsExploitationParAn],
    ["Résultat courant", r.resultatCourantParAn],
    ["Produits divers (cessions, indemnités)", r.produitsDiversParAn],
    ["Charges diverses (indemnités à payer)", r.chargesDiversesParAn],
    ["Résultat net", r.resultatNetParAn],
    ["Capacité d'autofinancement", r.capaciteAutofinancementParAn],
  ];
  cr.forEach(([label, vals]) => {
    data.push(row(label, eur(vals[0]), eur(vals[1]), eur(vals[2])));
  });
  data.push(blank());

  // Soldes intermédiaires de gestion
  data.push(title("SOLDES INTERMÉDIAIRES DE GESTION"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));
  data.push(row("Marge brute", eur(r.margeBruteParAn[0]), eur(r.margeBruteParAn[1]), eur(r.margeBruteParAn[2])));
  data.push(row("Valeur ajoutée", eur(r.valeurAjouteeParAn[0]), eur(r.valeurAjouteeParAn[1]), eur(r.valeurAjouteeParAn[2])));
  data.push(row("EBE", eur(r.ebeParAn[0]), eur(r.ebeParAn[1]), eur(r.ebeParAn[2])));
  data.push(row("Résultat d'exploitation", eur(r.resultatExploitationParAn[0]), eur(r.resultatExploitationParAn[1]), eur(r.resultatExploitationParAn[2])));
  data.push(row("Résultat courant", eur(r.resultatCourantParAn[0]), eur(r.resultatCourantParAn[1]), eur(r.resultatCourantParAn[2])));
  data.push(row("Résultat net", eur(r.resultatNetParAn[0]), eur(r.resultatNetParAn[1]), eur(r.resultatNetParAn[2])));
  data.push(blank());

  // Seuil de rentabilité
  data.push(title("SEUIL DE RENTABILITÉ"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));
  data.push(row(
    "Seuil de rentabilité",
    eur(r.seuilRentabiliteParAn[0]),
    eur(r.seuilRentabiliteParAn[1]),
    eur(r.seuilRentabiliteParAn[2]),
  ));
  data.push(row(
    "Point mort (jours)",
    r.pointMortJoursParAn[0],
    r.pointMortJoursParAn[1],
    r.pointMortJoursParAn[2],
  ));
  data.push(blank());

  // BFR
  data.push(title("BESOIN EN FONDS DE ROULEMENT"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));
  data.push(row(
    "BFR",
    eur(r.bfrParAn[0]),
    eur(r.bfrParAn[1]),
    eur(r.bfrParAn[2]),
  ));
  data.push(blank());

  // BFR détaillé
  data.push(title("BESOIN EN FONDS DE ROULEMENT (BFR)"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));
  data.push(row("Créances clients", eur(r.creancesClientsParAn[0]), eur(r.creancesClientsParAn[1]), eur(r.creancesClientsParAn[2])));
  data.push(row("Dettes fournisseurs", eur(r.dettesFournisseursParAn[0]), eur(r.dettesFournisseursParAn[1]), eur(r.dettesFournisseursParAn[2])));
  data.push(row("BFR", eur(r.bfrParAn[0]), eur(r.bfrParAn[1]), eur(r.bfrParAn[2])));
  data.push(row("Variation BFR", eur(r.variationBfrParAn[0]), eur(r.variationBfrParAn[1]), eur(r.variationBfrParAn[2])));
  data.push(blank());

  // Plan de financement détaillé
  data.push(title("PLAN DE FINANCEMENT"));
  data.push(blank());
  data.push(header("", "Année 1", "Année 2", "Année 3"));
  data.push(row("EMPLOIS", "", "", ""));
  data.push(row("Immobilisations amortissables", eur(r.totalImmobilisationsAmortissables), eur(0), eur(0)));
  data.push(row("Variation BFR", eur(r.variationBfrParAn[0]), eur(r.variationBfrParAn[1]), eur(r.variationBfrParAn[2])));
  data.push(row("Remboursements emprunts", eur(r.remboursementsEmpruntParAn[0]), eur(r.remboursementsEmpruntParAn[1]), eur(r.remboursementsEmpruntParAn[2])));
  data.push(row("Total besoins", eur(r.totalBesoins), "", ""));
  data.push(blank());
  data.push(row("RESSOURCES", "", "", ""));
  data.push(row("Total ressources initiales", eur(r.totalRessources), "", ""));
  data.push(row("CAF", eur(r.capaciteAutofinancementParAn[0]), eur(r.capaciteAutofinancementParAn[1]), eur(r.capaciteAutofinancementParAn[2])));
  data.push(blank());
  data.push(row("Variation de trésorerie", eur(r.variationTresorerieParAn[0]), eur(r.variationTresorerieParAn[1]), eur(r.variationTresorerieParAn[2])));
  data.push(row("Trésorerie cumulée", eur(r.excedentTresorerieParAn[0]), eur(r.excedentTresorerieParAn[1]), eur(r.excedentTresorerieParAn[2])));
  data.push(blank());

  // Trésorerie mensuelle
  data.push(title("TRÉSORERIE MENSUELLE – ANNÉE 1"));
  data.push(blank());
  data.push(header("Mois", "Trésorerie cumulée"));
  r.tresorerieMensuelle.forEach((val, i) => {
    data.push(row(MOIS[i] ?? `Mois ${i + 1}`, eur(val)));
  });
  data.push(blank());

  // Indicateurs clés
  data.push(title("INDICATEURS CLÉS"));
  data.push(blank());
  data.push(row("Rentable", r.estRentable ? "Oui" : "Non"));
  data.push(row("Trésorerie adéquate", r.tresorerieAdequate ? "Oui" : "Non"));

  return data;
}

// ---------------------------------------------------------------------------
// Column widths helper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function autoColWidths(XLSX: any, ws: any): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const colWidths: number[] = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const len = cell ? String(cell.v).length : 0;
      colWidths[C] = Math.max(colWidths[C] ?? 10, len);
    }
  }
  ws["!cols"] = colWidths.map((w: number) => ({ wch: Math.min(w + 2, 60) }));
}

// ---------------------------------------------------------------------------
// Public export function
// ---------------------------------------------------------------------------

export async function exportToExcel(
  budget: BudgetPrevisionnel,
  resultats: ResultatsPrevisionnel,
): Promise<void> {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(buildSheet1(budget));
  autoColWidths(XLSX, ws1);
  XLSX.utils.book_append_sheet(wb, ws1, "Données saisies");

  const ws2 = XLSX.utils.aoa_to_sheet(buildSheet2(resultats));
  autoColWidths(XLSX, ws2);
  XLSX.utils.book_append_sheet(wb, ws2, "Plan financier");

  const wbout: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const projet = budget.infos.intituleProjet.replace(/[^a-zA-Z0-9_\-]/g, "_") || "projet";
  const filename = `Previsionnel_${projet}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
