// Types pour le budget prévisionnel sur 3 ans

export type StatutJuridique =
  | "Micro-entreprise"
  | "Entreprise individuelle au réel (IR)"
  | "EURL (IS)"
  | "SARL (IS)"
  | "SAS (IS)"
  | "SASU (IS)";

export type TypeVente = "Marchandises (y compris hébergement et restauration)" | "Services" | "Mixte";
export type RegimeFiscal = "Impôt sur le revenu" | "Impôt sur les sociétés";

export interface InfosGenerales {
  prenomNom: string;
  intituleProjet: string;
  activite: string; // label de l'activité choisie
  codeAPE: string;  // code APE correspondant
  statutJuridique: StatutJuridique;
  telephone: string;
  email: string;
  ville: string;
  typeVente: TypeVente;
  regimeFiscal: RegimeFiscal;
  acre: boolean;
}

export interface InvestissementAmortissable {
  montant: number;
  dureeAmortissement: number; // en années (défaut selon type)
}

export interface BesoinsDemarrage {
  // Investissements amortissables
  fraisEtablissement: InvestissementAmortissable;
  logicielsFormations: InvestissementAmortissable;
  depotMarqueBrevet: InvestissementAmortissable;
  droitsEntree: InvestissementAmortissable;
  achatFondsCommerce: InvestissementAmortissable;
  droitAuBail: InvestissementAmortissable;
  enseigneCommunication: InvestissementAmortissable;
  achatImmobilier: InvestissementAmortissable;
  travauxAmenagements: InvestissementAmortissable;
  materiel: InvestissementAmortissable;
  materielBureau: InvestissementAmortissable;
  // Immobilisation non amortissable
  terrain: number;
  // Charges (non amortissables)
  fraisDossier: number;
  fraisNotaireAvocat: number;
  // Autres besoins (non amortissables)
  cautionDepotGarantie: number;
  stockMatieresProduits: number;
  tresorerieDépart: number;
}

export interface Pret {
  nom: string;
  montant: number;
  taux: number;       // en décimal (ex: 0.03 = 3%)
  dureeMois: number;
}

export interface SubventionInvestissement {
  nom: string;
  montant: number;
  dureeAmortissement: number; // en années
}

export interface SubventionExploitation {
  nom: string;
  montants: [number, number, number]; // par année
}

export interface Financement {
  apportPersonnel: number;
  apportsNature: number;
  apportsComptesCourants: [number, number, number]; // par année
  prets: Pret[];
  subventionsInvestissement: [SubventionInvestissement, SubventionInvestissement];
  subventionsExploitation: [SubventionExploitation, SubventionExploitation];
  autreFinancement: { nom: string; montant: number };
}

export interface Divers {
  dividendes: [number, number, number];
  remboursementsComptesCourants: [number, number, number];
  cessionsImmobilisations: [number, number, number];
  indemnitesARecevoir: [number, number, number];
  indemnitesAPayer: [number, number, number];
}

export interface ChargesFixes {
  tauxInflation: number; // ex: 0.02 = 2%
  assurances: [number, number, number];
  telephoneInternet: [number, number, number];
  autresAbonnements: [number, number, number];
  carburantTransports: [number, number, number];
  fraisDeplacementHebergement: [number, number, number];
  eauElectriciteGaz: [number, number, number];
  mutuelle: [number, number, number];
  fournituresDiverses: [number, number, number];
  entretienMaterielVetements: [number, number, number];
  nettoyageLocaux: [number, number, number];
  budgetPubliciteCommunication: [number, number, number];
  loyerChargesLocatives: [number, number, number];
  expertComptableAvocats: [number, number, number];
  fraisBancairesTerminalCB: [number, number, number];
  autreCharge1: { nom: string; montants: [number, number, number] };
  autreCharge2: { nom: string; montants: [number, number, number] };
  autreCharge3: { nom: string; montants: [number, number, number] };
}

export interface ImpotsTaxes {
  tauxInflation: number; // ex: 0.02 = 2%
  cfe: [number, number, number];
  autreTaxe1: { nom: string; montants: [number, number, number] };
  autreTaxe2: { nom: string; montants: [number, number, number] };
  autreTaxe3: { nom: string; montants: [number, number, number] };
}

export interface MoisCA {
  joursTravailes: number;
  caMoyenParJour: number;
}

export interface ChiffreAffaires {
  marchandises: MoisCA[];  // 12 mois
  services: MoisCA[];      // 12 mois
  augmentationAn2Marchandises: number; // ex: 0.2 = 20%
  augmentationAn3Marchandises: number;
  augmentationAn2Services: number;
  augmentationAn3Services: number;
}

export interface ChargesVariables {
  coutAchatMarchandisesPct: number; // ex: 0.5 = 50%
}

export interface BesoinFondsRoulement {
  delaiClientsJours: number;
  delaiFournisseursJours: number;
}

export interface Salaires {
  salairesEmployesNet: [number, number, number]; // année 1, 2, 3
  remunerationDirigeant: [number, number, number];
}

// --- Balance N-1 (import FEC) ---

export interface CompteResultatNmoins1 {
  caMarchandises: number;
  caServices: number;
  caTotal: number;
  achatsConsommes: number;
  margeBrute: number;
  chargesExternes: number;
  valeurAjoutee: number;
  impotsTaxes: number;
  chargesPersonnel: number;
  ebe: number;
  dotationsAmortissements: number;
  resultatExploitation: number;
  chargesFinancieres: number;
  resultatNet: number;
  capaciteAutofinancement: number;
}

export interface BalanceNmoins1 {
  // Bilan grandes masses N-1
  immobilisationsNettes: number;
  stocks: number;
  creancesClients: number;
  tresorerie: number;
  capitauxPropres: number;
  dettesFinancieresLT: number;
  dettesFournisseurs: number;
  autresDettesCT: number;
  // Compte de résultat N-1
  compteResultat: CompteResultatNmoins1;
  // Métadonnées
  exercice?: string; // ex: "2024"
}

export interface BudgetPrevisionnel {
  id: string;
  clientId: string;
  dateCreation: string;
  dateMiseAJour: string;
  infos: InfosGenerales;
  besoins: BesoinsDemarrage;
  financement: Financement;
  chargesFixes: ChargesFixes;
  impotsTaxes: ImpotsTaxes;
  divers: Divers;
  chiffreAffaires: ChiffreAffaires;
  chargesVariables: ChargesVariables;
  bfr: BesoinFondsRoulement;
  salaires: Salaires;
  balanceNmoins1?: BalanceNmoins1;
}

export interface Client {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  dateCreation: string;
}

// --- Résultats calculés ---

export interface AmortissementAnnuel {
  annee: number;
  montant: number;
}

export interface AnalysePret {
  mensualite: number;
  totalRembourse: number;
  principalMensuel: number;
  interetMensuel: number;
  interetsTotaux: number;
  interetsParAn: [number, number, number];
  principalParAn: [number, number, number];
}

export interface ResultatsPrevisionnel {
  // Compte de résultat
  caMarhandisesParAn: [number, number, number];
  caServicesParAn: [number, number, number];
  caTotalParAn: [number, number, number];
  achatsConsommesParAn: [number, number, number];
  margeBruteParAn: [number, number, number];
  chargesExternesParAn: [number, number, number];
  valeurAjouteeParAn: [number, number, number];
  impotsTaxesParAn: [number, number, number];
  salairesEmployesParAn: [number, number, number];
  chargesSocialesEmployesParAn: [number, number, number];
  remunerationDirigeantParAn: [number, number, number];
  chargesSocialesDirigeantParAn: [number, number, number];
  ebeParAn: [number, number, number]; // Excédent brut d'exploitation
  dotationsAmortissementsParAn: [number, number, number];
  resultatExploitationParAn: [number, number, number];
  chargesFinancieresParAn: [number, number, number];
  repriseSubventionsInvestParAn: [number, number, number]; // quote-part virée au résultat
  subventionsExploitationParAn: [number, number, number];
  resultatCourantParAn: [number, number, number];
  produitsDiversParAn: [number, number, number]; // cessions immo + indemnités à recevoir
  chargesDiversesParAn: [number, number, number]; // indemnités à payer
  resultatNetParAn: [number, number, number];
  capaciteAutofinancementParAn: [number, number, number];

  // Seuil de rentabilité
  seuilRentabiliteParAn: [number, number, number];
  pointMortJoursParAn: [number, number, number];

  // BFR détaillé
  creancesClientsParAn: [number, number, number];
  dettesFournisseursParAn: [number, number, number];
  bfrParAn: [number, number, number];
  variationBfrParAn: [number, number, number];

  // Plan de financement
  totalBesoins: number;
  totalRessources: number;
  totalImmobilisationsAmortissables: number;
  remboursementsEmpruntParAn: [number, number, number];
  variationTresorerieParAn: [number, number, number];
  excedentTresorerieParAn: [number, number, number];

  // Trésorerie mensuelle année 1 détaillée
  tresorerieMensuelle: number[];
  tresorerieMensuelleDetail: {
    encaissements: number[];
    achats: number[];
    chargesFixes: number[];
    salaires: number[];
    remboursements: number[];
    soldeMensuel: number[];
    tresorerieCumulee: number[];
  };

  // Bilan simplifié par an
  bilanActifImmobilisationsNettes: [number, number, number];
  bilanActifStocks: [number, number, number];
  bilanActifCreances: [number, number, number];
  bilanActifTresorerie: [number, number, number];
  bilanActifTotal: [number, number, number];
  bilanPassifCapitauxPropres: [number, number, number];
  bilanPassifDettesLT: [number, number, number];
  bilanPassifDettesFournisseurs: [number, number, number];
  bilanPassifTotal: [number, number, number];

  // Contrôles
  estRentable: boolean;
  tresorerieAdequate: boolean;
}
