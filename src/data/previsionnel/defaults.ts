import { BudgetPrevisionnel, MoisCA } from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function defaultMoisCA(): MoisCA[] {
  return Array.from({ length: 12 }, () => ({ joursTravailes: 20, caMoyenParJour: 0 }));
}

export function createDefaultBudget(clientId: string): BudgetPrevisionnel {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    clientId,
    dateCreation: now,
    dateMiseAJour: now,
    infos: {
      prenomNom: "",
      intituleProjet: "",
      activite: "",
      codeAPE: "",
      statutJuridique: "Micro-entreprise",
      telephone: "",
      email: "",
      ville: "",
      typeVente: "Services",
      regimeFiscal: "Impôt sur le revenu",
      acre: false,
    },
    besoins: {
      fraisEtablissement: { montant: 0, dureeAmortissement: 5 },
      logicielsFormations: { montant: 0, dureeAmortissement: 3 },
      depotMarqueBrevet: { montant: 0, dureeAmortissement: 10 },
      droitsEntree: { montant: 0, dureeAmortissement: 5 },
      achatFondsCommerce: { montant: 0, dureeAmortissement: 5 },
      droitAuBail: { montant: 0, dureeAmortissement: 5 },
      enseigneCommunication: { montant: 0, dureeAmortissement: 5 },
      achatImmobilier: { montant: 0, dureeAmortissement: 20 },
      travauxAmenagements: { montant: 0, dureeAmortissement: 10 },
      materiel: { montant: 0, dureeAmortissement: 5 },
      materielBureau: { montant: 0, dureeAmortissement: 3 },
      terrain: 0,
      fraisDossier: 0,
      fraisNotaireAvocat: 0,
      cautionDepotGarantie: 0,
      stockMatieresProduits: 0,
      tresorerieDépart: 0,
    },
    financement: {
      apportPersonnel: 0,
      apportsNature: 0,
      apportsComptesCourants: [0, 0, 0],
      prets: [
        { nom: "Prêt n°1", montant: 0, taux: 0, dureeMois: 0 },
      ],
      subventionsInvestissement: [
        { nom: "Subvention invest. n°1", montant: 0, dureeAmortissement: 5 },
        { nom: "Subvention invest. n°2", montant: 0, dureeAmortissement: 5 },
      ],
      subventionsExploitation: [
        { nom: "Subvention exploit. n°1", montants: [0, 0, 0] },
        { nom: "Subvention exploit. n°2", montants: [0, 0, 0] },
      ],
      autreFinancement: { nom: "Autre financement", montant: 0 },
    },
    chargesFixes: {
      tauxInflation: 0,
      assurances: [0, 0, 0],
      telephoneInternet: [0, 0, 0],
      autresAbonnements: [0, 0, 0],
      carburantTransports: [0, 0, 0],
      fraisDeplacementHebergement: [0, 0, 0],
      eauElectriciteGaz: [0, 0, 0],
      mutuelle: [0, 0, 0],
      fournituresDiverses: [0, 0, 0],
      entretienMaterielVetements: [0, 0, 0],
      nettoyageLocaux: [0, 0, 0],
      budgetPubliciteCommunication: [0, 0, 0],
      loyerChargesLocatives: [0, 0, 0],
      expertComptableAvocats: [0, 0, 0],
      fraisBancairesTerminalCB: [0, 0, 0],
      autreCharge1: { nom: "", montants: [0, 0, 0] },
      autreCharge2: { nom: "", montants: [0, 0, 0] },
      autreCharge3: { nom: "", montants: [0, 0, 0] },
    },
    impotsTaxes: {
      tauxInflation: 0,
      cfe: [0, 0, 0],
      autreTaxe1: { nom: "", montants: [0, 0, 0] },
      autreTaxe2: { nom: "", montants: [0, 0, 0] },
      autreTaxe3: { nom: "", montants: [0, 0, 0] },
    },
    divers: {
      dividendes: [0, 0, 0],
      remboursementsComptesCourants: [0, 0, 0],
      cessionsImmobilisations: [0, 0, 0],
      indemnitesARecevoir: [0, 0, 0],
      indemnitesAPayer: [0, 0, 0],
    },
    chiffreAffaires: {
      marchandises: defaultMoisCA(),
      services: defaultMoisCA(),
      augmentationAn2Marchandises: 0.2,
      augmentationAn3Marchandises: 0.2,
      augmentationAn2Services: 0.2,
      augmentationAn3Services: 0.2,
    },
    chargesVariables: {
      coutAchatMarchandisesPct: 0.5,
    },
    bfr: {
      delaiClientsJours: 30,
      delaiFournisseursJours: 30,
    },
    salaires: {
      salairesEmployesNet: [0, 0, 0],
      remunerationDirigeant: [0, 0, 0],
    },
  };
}
