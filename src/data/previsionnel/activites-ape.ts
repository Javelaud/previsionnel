export interface ActiviteAPE {
  label: string;
  codeAPE: string;
}

export interface SecteurActivites {
  secteur: string;
  activites: ActiviteAPE[];
}

export const SECTEURS_ACTIVITES: SecteurActivites[] = [
  {
    secteur: "Commerce de détail",
    activites: [
      { label: "Commerce de détail alimentaire", codeAPE: "47.11B" },
      { label: "Supérette / Épicerie", codeAPE: "47.11C" },
      { label: "Boulangerie-pâtisserie", codeAPE: "10.71C" },
      { label: "Boucherie / Charcuterie", codeAPE: "47.22Z" },
      { label: "Poissonnerie", codeAPE: "47.23Z" },
      { label: "Commerce de fruits et légumes", codeAPE: "47.21Z" },
      { label: "Commerce de boissons", codeAPE: "47.25Z" },
      { label: "Commerce de vêtements", codeAPE: "47.71Z" },
      { label: "Commerce de chaussures", codeAPE: "47.72A" },
      { label: "Commerce d'articles de sport", codeAPE: "47.64Z" },
      { label: "Commerce de meubles", codeAPE: "47.59A" },
      { label: "Commerce d'électroménager", codeAPE: "47.54Z" },
      { label: "Commerce de fleurs", codeAPE: "47.76Z" },
      { label: "Commerce d'optique", codeAPE: "47.78A" },
      { label: "Pharmacie", codeAPE: "47.73Z" },
      { label: "Librairie / Papeterie", codeAPE: "47.61Z" },
      { label: "Commerce de jouets", codeAPE: "47.65Z" },
      { label: "Commerce de bijoux", codeAPE: "47.77Z" },
      { label: "Quincaillerie / Bricolage", codeAPE: "47.52B" },
      { label: "Commerce de matériaux de construction", codeAPE: "47.52A" },
      { label: "Vente à distance / E-commerce", codeAPE: "47.91A" },
    ],
  },
  {
    secteur: "Commerce de gros",
    activites: [
      { label: "Commerce de gros alimentaire", codeAPE: "46.39A" },
      { label: "Commerce de gros de boissons", codeAPE: "46.34Z" },
      { label: "Commerce de gros de textiles", codeAPE: "46.41Z" },
      { label: "Commerce de gros de matériel électrique", codeAPE: "46.47Z" },
      { label: "Commerce de gros de quincaillerie", codeAPE: "46.74A" },
      { label: "Commerce de gros non spécialisé", codeAPE: "46.90Z" },
    ],
  },
  {
    secteur: "Restauration / Hôtellerie",
    activites: [
      { label: "Restaurant traditionnel", codeAPE: "56.10A" },
      { label: "Restauration rapide", codeAPE: "56.10C" },
      { label: "Café / Bar", codeAPE: "56.30Z" },
      { label: "Traiteur", codeAPE: "56.21Z" },
      { label: "Hôtel", codeAPE: "55.10Z" },
      { label: "Hôtel-restaurant", codeAPE: "55.10Z" },
      { label: "Chambre d'hôtes / Gîte", codeAPE: "55.20Z" },
      { label: "Camping", codeAPE: "55.30Z" },
      { label: "Restauration collective", codeAPE: "56.29A" },
      { label: "Salon de thé", codeAPE: "56.10C" },
      { label: "Food truck", codeAPE: "56.10C" },
    ],
  },
  {
    secteur: "BTP / Construction",
    activites: [
      { label: "Construction de maisons individuelles", codeAPE: "41.20A" },
      { label: "Construction de bâtiments", codeAPE: "41.20B" },
      { label: "Travaux de maçonnerie", codeAPE: "43.99A" },
      { label: "Travaux d'installation électrique", codeAPE: "43.21A" },
      { label: "Plomberie / Chauffage", codeAPE: "43.22A" },
      { label: "Menuiserie", codeAPE: "43.32A" },
      { label: "Peinture / Revêtements", codeAPE: "43.34Z" },
      { label: "Couverture / Charpente", codeAPE: "43.91A" },
      { label: "Carrelage", codeAPE: "43.33Z" },
      { label: "Terrassement", codeAPE: "43.12A" },
      { label: "Travaux d'isolation", codeAPE: "43.29A" },
      { label: "Serrurerie / Métallerie", codeAPE: "43.32B" },
    ],
  },
  {
    secteur: "Services aux entreprises",
    activites: [
      { label: "Conseil en gestion / Management", codeAPE: "70.22Z" },
      { label: "Expertise comptable", codeAPE: "69.20Z" },
      { label: "Activités juridiques / Avocat", codeAPE: "69.10Z" },
      { label: "Conseil en informatique", codeAPE: "62.02A" },
      { label: "Développement / Programmation", codeAPE: "62.01Z" },
      { label: "Agence de communication / Publicité", codeAPE: "73.11Z" },
      { label: "Design graphique", codeAPE: "74.10Z" },
      { label: "Agence web", codeAPE: "63.12Z" },
      { label: "Formation professionnelle", codeAPE: "85.59A" },
      { label: "Traduction / Interprétation", codeAPE: "74.30Z" },
      { label: "Nettoyage de bâtiments", codeAPE: "81.21Z" },
      { label: "Sécurité privée", codeAPE: "80.10Z" },
      { label: "Intérim / Travail temporaire", codeAPE: "78.20Z" },
      { label: "Location de véhicules", codeAPE: "77.11A" },
      { label: "Architecte", codeAPE: "71.11Z" },
      { label: "Géomètre-expert", codeAPE: "71.12A" },
      { label: "Bureau d'études techniques", codeAPE: "71.12B" },
    ],
  },
  {
    secteur: "Services aux particuliers",
    activites: [
      { label: "Coiffure", codeAPE: "96.02A" },
      { label: "Institut de beauté / Esthétique", codeAPE: "96.02B" },
      { label: "Auto-école", codeAPE: "85.53Z" },
      { label: "Pressing / Blanchisserie", codeAPE: "96.01A" },
      { label: "Pompes funèbres", codeAPE: "96.03Z" },
      { label: "Services à la personne", codeAPE: "88.10A" },
      { label: "Garde d'enfants", codeAPE: "88.91A" },
      { label: "Aide à domicile", codeAPE: "88.10A" },
      { label: "Coach sportif", codeAPE: "93.13Z" },
      { label: "Photographe", codeAPE: "74.20Z" },
    ],
  },
  {
    secteur: "Santé / Bien-être",
    activites: [
      { label: "Médecin généraliste", codeAPE: "86.21Z" },
      { label: "Médecin spécialiste", codeAPE: "86.22C" },
      { label: "Dentiste", codeAPE: "86.23Z" },
      { label: "Infirmier(e)", codeAPE: "86.90C" },
      { label: "Kinésithérapeute", codeAPE: "86.90D" },
      { label: "Ostéopathe", codeAPE: "86.90F" },
      { label: "Psychologue", codeAPE: "86.90F" },
      { label: "Laboratoire d'analyses", codeAPE: "86.90B" },
      { label: "Vétérinaire", codeAPE: "75.00Z" },
    ],
  },
  {
    secteur: "Transport / Logistique",
    activites: [
      { label: "Transport routier de marchandises", codeAPE: "49.41A" },
      { label: "Transport de voyageurs (taxi/VTC)", codeAPE: "49.32Z" },
      { label: "Déménagement", codeAPE: "49.42Z" },
      { label: "Coursier / Livraison", codeAPE: "53.20Z" },
      { label: "Entreposage / Stockage", codeAPE: "52.10B" },
      { label: "Ambulance", codeAPE: "86.90A" },
    ],
  },
  {
    secteur: "Industrie / Fabrication",
    activites: [
      { label: "Fabrication de produits alimentaires", codeAPE: "10.89Z" },
      { label: "Fabrication de meubles", codeAPE: "31.09B" },
      { label: "Fabrication de vêtements", codeAPE: "14.13Z" },
      { label: "Imprimerie", codeAPE: "18.12Z" },
      { label: "Fabrication de produits métalliques", codeAPE: "25.62B" },
      { label: "Fabrication de machines", codeAPE: "28.29B" },
    ],
  },
  {
    secteur: "Immobilier",
    activites: [
      { label: "Agence immobilière", codeAPE: "68.31Z" },
      { label: "Gestion de biens immobiliers", codeAPE: "68.32A" },
      { label: "Promotion immobilière", codeAPE: "41.10A" },
      { label: "Marchand de biens", codeAPE: "68.10Z" },
    ],
  },
  {
    secteur: "Agriculture / Élevage",
    activites: [
      { label: "Culture de céréales", codeAPE: "01.11Z" },
      { label: "Maraîchage", codeAPE: "01.13Z" },
      { label: "Viticulture", codeAPE: "01.21Z" },
      { label: "Élevage de bovins", codeAPE: "01.41Z" },
      { label: "Élevage de volailles", codeAPE: "01.47Z" },
      { label: "Paysagiste / Entretien espaces verts", codeAPE: "81.30Z" },
      { label: "Exploitation forestière", codeAPE: "02.20Z" },
    ],
  },
  {
    secteur: "Loisirs / Culture / Sport",
    activites: [
      { label: "Salle de sport / Fitness", codeAPE: "93.13Z" },
      { label: "Club sportif", codeAPE: "93.12Z" },
      { label: "Activités récréatives / Loisirs", codeAPE: "93.29Z" },
      { label: "Spectacle vivant", codeAPE: "90.01Z" },
      { label: "Production audiovisuelle", codeAPE: "59.11A" },
      { label: "Édition de logiciels", codeAPE: "58.21Z" },
      { label: "Jeux vidéo", codeAPE: "58.21Z" },
    ],
  },
];

// Liste plate pour recherche rapide
export const TOUTES_ACTIVITES: ActiviteAPE[] = SECTEURS_ACTIVITES.flatMap((s) => s.activites);
