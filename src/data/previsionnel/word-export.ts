/**
 * Export du dossier prévisionnel au format Word (.docx)
 * Utilise la bibliothèque docx (compatible navigateur + Node.js)
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  PageNumber,
  PageBreak,
  HeadingLevel,
} from "docx";
import type { BudgetPrevisionnel, ResultatsPrevisionnel } from "./types";
import { getTotalBesoins, getTotalFinancement } from "./calculations";

// ---------------------------------------------------------------------------
// Constantes couleurs & mesures
// ---------------------------------------------------------------------------
const BLEU_FONCE = "1B3A6B";   // Bleu marine couverture
const BLEU_MOYEN = "2563EB";   // Bleu accent
const BLEU_CLAIR = "DBEAFE";   // Fond entête tableau
const GRIS_LIGNE = "F1F5F9";   // Fond ligne alternée
const GRIS_BORD  = "CBD5E1";   // Couleur des bordures

// Largeurs page A4, marges 18mm → zone utile ≈ 15 200 DXA
const PAGE_W   = 11906;
const PAGE_H   = 16838;
const MARGE    = 1080; // ~19mm
const CONTENT_W = PAGE_W - 2 * MARGE; // ≈ 9 746 DXA

// ---------------------------------------------------------------------------
// Helpers formatage
// ---------------------------------------------------------------------------
const EUR_FMT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
function eur(n: number): string { return EUR_FMT.format(n); }
function pct(n: number): string { return (n * 100).toFixed(1) + " %"; }

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

// ---------------------------------------------------------------------------
// Helpers construction docx
// ---------------------------------------------------------------------------
function txt(text: string, opts?: {
  bold?: boolean; size?: number; color?: string; font?: string; italics?: boolean;
}): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    size: opts?.size ?? 20,        // 10 pt par défaut
    color: opts?.color,
    font: opts?.font ?? "Arial",
    italics: opts?.italics,
  });
}

function spacer(space = 80): Paragraph {
  return new Paragraph({ spacing: { before: space, after: 0 }, children: [] });
}

const borderNone = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borderCell = { style: BorderStyle.SINGLE, size: 4, color: GRIS_BORD };

function cellBorders(opts?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }) {
  return {
    top:    opts?.top    === false ? borderNone : borderCell,
    bottom: opts?.bottom === false ? borderNone : borderCell,
    left:   opts?.left   === false ? borderNone : borderCell,
    right:  opts?.right  === false ? borderNone : borderCell,
  };
}

/** Cellule tableau standard */
function cell(
  content: string,
  widthDxa: number,
  opts?: {
    bold?: boolean;
    size?: number;
    align?: string;
    shade?: string;
    color?: string;
    vAlign?: string;
    italic?: boolean;
    span?: number;
    borders?: ReturnType<typeof cellBorders>;
  }
): TableCell {
  return new TableCell({
    width:    { size: widthDxa, type: WidthType.DXA },
    shading:  opts?.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    borders:  opts?.borders ?? cellBorders(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verticalAlign: (opts?.vAlign ?? VerticalAlign.CENTER) as any,
    columnSpan: opts?.span,
    margins:  { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alignment: (opts?.align ?? AlignmentType.LEFT) as any,
        children: [txt(content, { bold: opts?.bold, size: opts?.size ?? 18, color: opts?.color, italics: opts?.italic })],
      }),
    ],
  });
}

/** Ligne d'en-tête de tableau (fond bleu, texte blanc) */
function headerRow(labels: string[], widths: number[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: labels.map((label, i) =>
      cell(label, widths[i], {
        bold: true,
        shade: BLEU_FONCE,
        color: "FFFFFF",
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
        size: 18,
      })
    ),
  });
}

/** Ligne de données (avec alternance de couleur) */
function dataRow(cells: string[], widths: number[], even: boolean, opts?: {
  bold?: boolean; shadeFirst?: boolean; totalRow?: boolean;
}): TableRow {
  const shade = opts?.totalRow ? BLEU_CLAIR : (even ? GRIS_LIGNE : "FFFFFF");
  return new TableRow({
    children: cells.map((c, i) =>
      cell(c, widths[i], {
        shade,
        bold: opts?.bold || opts?.totalRow,
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
        size: 18,
      })
    ),
  });
}

/** Titre de section (H2 dans le document) */
function sectionTitle(label: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLEU_MOYEN, space: 4 } },
    children: [txt(label, { bold: true, size: 26, color: BLEU_FONCE })],
  });
}

// ---------------------------------------------------------------------------
// PAGE 1 — Couverture / Informations générales
// ---------------------------------------------------------------------------
function buildCoverPage(b: BudgetPrevisionnel, r: ResultatsPrevisionnel): (Paragraph | Table)[] {
  const { infos } = b;
  const anneeDebut = new Date().getFullYear();

  const paragraphs: (Paragraph | Table)[] = [];

  // Bloc titre principal (fond bleu simulé via un tableau pleine largeur)
  paragraphs.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [],
  }));

  // Grand titre
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 120 },
    children: [
      txt("DOSSIER PRÉVISIONNEL FINANCIER", {
        bold: true, size: 48, color: BLEU_FONCE,
      }),
    ],
  }));

  // Sous-titre
  paragraphs.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 480 },
    children: [
      txt(`Années ${anneeDebut} · ${anneeDebut + 1} · ${anneeDebut + 2}`, {
        size: 24, color: "64748B", italics: true,
      }),
    ],
  }));

  // Tableau récapitulatif des infos générales
  const infoTableW = CONTENT_W;
  const col1 = Math.round(infoTableW * 0.38);
  const col2 = infoTableW - col1;

  const infoRows: [string, string][] = [
    ["Porteur(se) de projet",   infos.prenomNom      || "—"],
    ["Intitulé du projet",      infos.intituleProjet || "—"],
    ["Activité",                infos.activite       || "—"],
    ["Statut juridique",        infos.statutJuridique],
    ["Ville",                   infos.ville          || "—"],
    ["Email",                   infos.email          || "—"],
    ["Téléphone",               infos.telephone      || "—"],
    ["Régime fiscal",           infos.regimeFiscal   || "—"],
    ["ACRE",                    infos.acre ? "Bénéficiaire" : "Non"],
    ["Type de vente",           infos.typeVente],
  ];

  paragraphs.push(
    new Table({
      width: { size: infoTableW, type: WidthType.DXA },
      columnWidths: [col1, col2],
      rows: [
        new TableRow({
          children: [
            cell("Informations générales", infoTableW, {
              bold: true, shade: BLEU_FONCE, color: "FFFFFF", size: 22,
              borders: cellBorders(),
            }),
            // On utilise colspan=2 → on crée une cellule qui prend toute la largeur
          ],
        }),
        ...infoRows.map(([label, value], i) =>
          new TableRow({
            children: [
              cell(label,  col1, { bold: true, shade: i % 2 === 0 ? BLEU_CLAIR : "FFFFFF", size: 18 }),
              cell(value,  col2, { shade: i % 2 === 0 ? BLEU_CLAIR : "FFFFFF", size: 18 }),
            ],
          })
        ),
      ],
    })
  );

  paragraphs.push(spacer(240));

  // Tableau synthèse financière
  const synth: [string, string][] = [
    ["Total investissements",     eur(getTotalBesoins(b))],
    ["Total financement",         eur(getTotalFinancement(b))],
    ["CA prévisionnel An 1",      eur(r.caTotalParAn[0])],
    ["Résultat net An 1",         eur(r.resultatNetParAn[0])],
    ["Seuil de rentabilité An 1", eur(r.seuilRentabiliteParAn[0])],
    ["Trésorerie fin An 1",       eur(r.bilanActifTresorerie[0])],
  ];

  const s1 = Math.round(infoTableW * 0.55);
  const s2 = infoTableW - s1;
  paragraphs.push(
    new Table({
      width: { size: infoTableW, type: WidthType.DXA },
      columnWidths: [s1, s2],
      rows: [
        new TableRow({
          children: [
            cell("Synthèse financière", infoTableW, {
              bold: true, shade: BLEU_MOYEN, color: "FFFFFF", size: 22,
            }),
          ],
        }),
        ...synth.map(([label, value], i) =>
          new TableRow({
            children: [
              cell(label, s1, { bold: false, shade: i % 2 === 0 ? GRIS_LIGNE : "FFFFFF", size: 18 }),
              cell(value, s2, { bold: true, shade: i % 2 === 0 ? GRIS_LIGNE : "FFFFFF", size: 18, align: AlignmentType.RIGHT }),
            ],
          })
        ),
      ],
    })
  );

  // Saut de page final
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  return paragraphs;
}

// ---------------------------------------------------------------------------
// PAGE 2 — Compte de résultat sur 3 ans
// ---------------------------------------------------------------------------
function buildCompteResultat(r: ResultatsPrevisionnel): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [sectionTitle("Compte de résultat prévisionnel")];

  const W  = CONTENT_W;
  const c0 = Math.round(W * 0.44);
  const cx = Math.round((W - c0) / 3);
  const cx3 = W - c0 - 2 * cx;
  const widths = [c0, cx, cx, cx3];
  const an = ["An 1", "An 2", "An 3"];

  type Row = { label: string; vals: [number, number, number]; bold?: boolean; pctCA?: boolean; total?: boolean; };

  const rows: Row[] = [
    { label: "Chiffre d'affaires total",            vals: r.caTotalParAn,                    bold: true, total: true },
    { label: "  dont Marchandises",                 vals: r.caMarhandisesParAn },
    { label: "  dont Services",                     vals: r.caServicesParAn },
    { label: "Achats consommés",                    vals: r.achatsConsommesParAn },
    { label: "Marge brute",                         vals: r.margeBruteParAn,                  bold: true, pctCA: true },
    { label: "Charges externes",                    vals: r.chargesExternesParAn },
    { label: "Valeur ajoutée",                      vals: r.valeurAjouteeParAn,               bold: true },
    { label: "Impôts & taxes",                      vals: r.impotsTaxesParAn },
    { label: "Salaires employés",                   vals: r.salairesEmployesParAn },
    { label: "Charges sociales employés",           vals: r.chargesSocialesEmployesParAn },
    { label: "Rémunération dirigeant",              vals: r.remunerationDirigeantParAn },
    { label: "Charges sociales dirigeant",          vals: r.chargesSocialesDirigeantParAn },
    { label: "EBE (Excédent Brut d'Exploitation)", vals: r.ebeParAn,                         bold: true, total: true },
    { label: "Dotations aux amortissements",        vals: r.dotationsAmortissementsParAn },
    { label: "Résultat d'exploitation",             vals: r.resultatExploitationParAn,        bold: true },
    { label: "Charges financières",                 vals: r.chargesFinancieresParAn },
    { label: "Résultat courant avant impôt",        vals: r.resultatCourantParAn,             bold: true },
    { label: "Résultat net",                        vals: r.resultatNetParAn,                 bold: true, total: true },
    { label: "Capacité d'autofinancement (CAF)",    vals: r.capaciteAutofinancementParAn,     bold: true },
  ];

  const tableRows: TableRow[] = [
    headerRow(["Libellé", ...an], widths),
    ...rows.map((row, i) => {
      const cells = [row.label, ...row.vals.map((v, j) => {
        const s = eur(v);
        if (row.pctCA && r.caTotalParAn[j] > 0) return `${s}  (${pct(v / r.caTotalParAn[j])})`;
        return s;
      })];
      return dataRow(cells, widths, i % 2 === 0, { bold: row.bold, totalRow: row.total });
    }),
  ];

  paragraphs.push(
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: tableRows })
  );

  // Seuil de rentabilité
  paragraphs.push(spacer(240));
  paragraphs.push(sectionTitle("Seuil de rentabilité"));

  const srW = [c0, cx, cx, cx3];
  paragraphs.push(
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: srW,
      rows: [
        headerRow(["Indicateur", ...an], srW),
        dataRow(["Seuil de rentabilité", ...r.seuilRentabiliteParAn.map(eur)], srW, false, { bold: true }),
        dataRow(["Point mort (jours)", ...r.pointMortJoursParAn.map(v => `${Math.round(v)} jours`)], srW, true),
      ],
    })
  );

  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  return paragraphs;
}

// ---------------------------------------------------------------------------
// PAGE 3 — Plan de financement
// ---------------------------------------------------------------------------
function buildPlanFinancement(b: BudgetPrevisionnel): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [sectionTitle("Plan de financement initial")];
  const W = CONTENT_W;

  const { besoins, financement } = b;

  const besoinRows: [string, number][] = [
    ["Frais d'établissement",           besoins.fraisEtablissement.montant],
    ["Logiciels / Formations",          besoins.logicielsFormations.montant],
    ["Dépôt marque / Brevet",           besoins.depotMarqueBrevet.montant],
    ["Droits d'entrée",                 besoins.droitsEntree.montant],
    ["Achat fonds de commerce",         besoins.achatFondsCommerce.montant],
    ["Droit au bail",                   besoins.droitAuBail.montant],
    ["Enseigne / Communication",        besoins.enseigneCommunication.montant],
    ["Travaux / Aménagements",          besoins.travauxAmenagements.montant],
    ["Matériel",                        besoins.materiel.montant],
    ["Matériel de bureau",              besoins.materielBureau.montant],
    ["Achat immobilier",                besoins.achatImmobilier.montant],
    ["Terrain",                         besoins.terrain],
    ["Frais de dossier",                besoins.fraisDossier],
    ["Frais notaire / Avocat",          besoins.fraisNotaireAvocat],
    ["Caution / Dépôt de garantie",     besoins.cautionDepotGarantie],
    ["Stock initial",                   besoins.stockMatieresProduits],
    ["Trésorerie de départ",            besoins.tresorerieDepart],
  ].filter(([, v]) => v > 0) as [string, number][];

  const ressourceRows: [string, number][] = [
    ["Apport personnel",                financement.apportPersonnel],
    ["Capital social",                  financement.capitalSocial],
    ["Compte courant associés",         financement.compteCourantAssocies],
    ["Subventions / Aides",             financement.subventions],
    ...financement.emprunts.filter(e => e.montant > 0).map(e =>
      [`Emprunt bancaire (${e.duree} ans à ${e.taux}%)`, e.montant] as [string, number]
    ),
  ].filter(([, v]) => v > 0) as [string, number][];

  // Tableau bicolonne Besoins | Ressources
  const lhW = Math.round(W / 2) - 20;
  const rhW = W - lhW;

  // Build side by side
  const maxLen = Math.max(besoinRows.length, ressourceRows.length);

  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell("EMPLOIS (Besoins)", lhW, { bold: true, shade: BLEU_FONCE, color: "FFFFFF", size: 20 }),
        cell("RESSOURCES (Financement)", rhW, { bold: true, shade: BLEU_MOYEN, color: "FFFFFF", size: 20 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Libellé / Montant", lhW, { bold: true, shade: BLEU_CLAIR, size: 16 }),
        cell("Libellé / Montant", rhW, { bold: true, shade: BLEU_CLAIR, size: 16 }),
      ],
    }),
    ...Array.from({ length: maxLen }).map((_, i) => {
      const [bL, bV] = besoinRows[i]    ?? ["", 0];
      const [rL, rV] = ressourceRows[i] ?? ["", 0];
      const shade = i % 2 === 0 ? GRIS_LIGNE : "FFFFFF";
      return new TableRow({
        children: [
          new TableCell({
            width: { size: lhW, type: WidthType.DXA },
            shading: { fill: shade, type: ShadingType.CLEAR },
            borders: cellBorders(),
            margins: { top: 50, bottom: 50, left: 100, right: 60 },
            children: [new Paragraph({
              children: [
                txt(bL ? `${bL}` : "", { size: 17 }),
                bV > 0 ? txt(`   ${eur(bV)}`, { size: 17, bold: true }) : txt(""),
              ],
            })],
          }),
          new TableCell({
            width: { size: rhW, type: WidthType.DXA },
            shading: { fill: shade, type: ShadingType.CLEAR },
            borders: cellBorders(),
            margins: { top: 50, bottom: 50, left: 100, right: 60 },
            children: [new Paragraph({
              children: [
                txt(rL ? `${rL}` : "", { size: 17 }),
                rV > 0 ? txt(`   ${eur(rV)}`, { size: 17, bold: true }) : txt(""),
              ],
            })],
          }),
        ],
      });
    }),
    // Ligne totaux
    new TableRow({
      children: [
        cell(`TOTAL BESOINS : ${eur(getTotalBesoins(b))}`, lhW, { bold: true, shade: BLEU_CLAIR, align: AlignmentType.RIGHT }),
        cell(`TOTAL RESSOURCES : ${eur(getTotalFinancement(b))}`, rhW, { bold: true, shade: BLEU_CLAIR, align: AlignmentType.RIGHT }),
      ],
    }),
  ];

  paragraphs.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [lhW, rhW], rows }));
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  return paragraphs;
}

// ---------------------------------------------------------------------------
// PAGE 4 — Bilan prévisionnel sur 3 ans
// ---------------------------------------------------------------------------
function buildBilan(r: ResultatsPrevisionnel): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [sectionTitle("Bilan prévisionnel")];
  const W = CONTENT_W;
  const c0 = Math.round(W * 0.42);
  const cx = Math.round((W - c0) / 3);
  const cx3 = W - c0 - 2 * cx;
  const widths = [c0, cx, cx, cx3];
  const an = ["An 1", "An 2", "An 3"];

  type BilanRow = { label: string; actif?: [number,number,number]; passif?: [number,number,number]; bold?: boolean; total?: boolean; };

  // ACTIF
  const actifRows: BilanRow[] = [
    { label: "Immobilisations nettes",  actif: r.bilanActifImmobilisationsNettes },
    { label: "Stocks",                  actif: r.bilanActifStocks },
    { label: "Créances clients",        actif: r.bilanActifCreances },
    { label: "Trésorerie active",       actif: r.bilanActifTresorerie },
    { label: "TOTAL ACTIF",             actif: r.bilanActifTotal, bold: true, total: true },
  ];

  // PASSIF
  const passifRows: BilanRow[] = [
    { label: "Capitaux propres",        passif: r.bilanPassifCapitauxPropres },
    { label: "Dettes financières LT",   passif: r.bilanPassifDettesLT },
    { label: "Dettes fournisseurs",     passif: r.bilanPassifDettesFournisseurs },
    { label: "Autres dettes CT",        passif: r.bilanPassifAutresDettesCT },
    { label: "TOTAL PASSIF",            passif: r.bilanPassifTotal, bold: true, total: true },
  ];

  // Tableau ACTIF
  paragraphs.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [txt("ACTIF", { bold: true, size: 22, color: BLEU_FONCE })],
  }));
  paragraphs.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      headerRow(["Poste", ...an], widths),
      ...actifRows.map((row, i) =>
        dataRow([row.label, ...row.actif!.map(eur)], widths, i % 2 === 0, { bold: row.bold, totalRow: row.total })
      ),
    ],
  }));

  paragraphs.push(spacer(160));

  // Tableau PASSIF
  paragraphs.push(new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [txt("PASSIF", { bold: true, size: 22, color: BLEU_FONCE })],
  }));
  paragraphs.push(new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      headerRow(["Poste", ...an], widths),
      ...passifRows.map((row, i) =>
        dataRow([row.label, ...row.passif!.map(eur)], widths, i % 2 === 0, { bold: row.bold, totalRow: row.total })
      ),
    ],
  }));

  paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  return paragraphs;
}

// ---------------------------------------------------------------------------
// PAGE 5 — Trésorerie mensuelle An 1
// ---------------------------------------------------------------------------
function buildTresorerie(r: ResultatsPrevisionnel): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [sectionTitle("Plan de trésorerie mensuel — Année 1")];

  const W = CONTENT_W;
  const labelW = Math.round(W * 0.22);
  const colW = Math.round((W - labelW) / 12);
  const colW12 = W - labelW - 11 * colW;
  const widths = [labelW, ...Array(11).fill(colW), colW12];

  const { tresorerieMensuelleDetail: d } = r;

  const makeRow = (label: string, values: number[], even: boolean, opts?: { bold?: boolean; total?: boolean }) => {
    const cells = [label, ...values.map(v => {
      if (Math.abs(v) < 0.5) return "—";
      return v >= 0 ? eur(v) : `(${eur(Math.abs(v))})`;
    })];
    return dataRow(cells, widths, even, opts);
  };

  const tableRows: TableRow[] = [
    headerRow(["Libellé", ...MOIS], widths),
    makeRow("Encaissements",         d.encaissements,     false, { bold: true }),
    makeRow("Achats",                d.achats.map(v=>-v), true),
    makeRow("Charges fixes",         d.chargesFixes.map(v=>-v), false),
    makeRow("Salaires & charges",    d.salaires.map(v=>-v), true),
    makeRow("Remboursements",        d.remboursements.map(v=>-v), false),
    makeRow("Solde mensuel",         d.soldeMensuel,      true,  { bold: true, total: true }),
    makeRow("Trésorerie cumulée",    d.tresorerieCumulee, false, { bold: true, total: true }),
  ];

  paragraphs.push(
    new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: tableRows })
  );

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Assemblage final et export
// ---------------------------------------------------------------------------
export async function exportToWord(
  budget: BudgetPrevisionnel,
  resultats: ResultatsPrevisionnel
): Promise<void> {
  const allChildren = [
    ...buildCoverPage(budget, resultats),
    ...buildCompteResultat(resultats),
    ...buildPlanFinancement(budget),
    ...buildBilan(resultats),
    ...buildTresorerie(resultats),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 20 } },
      },
      paragraphStyles: [
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: BLEU_FONCE },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGE, right: MARGE, bottom: MARGE, left: MARGE },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLEU_MOYEN, space: 2 } },
                children: [
                  txt("FinPrévi — Dossier prévisionnel financier", { size: 16, color: "94A3B8" }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRIS_BORD, space: 2 } },
                children: [
                  txt(`${budget.infos.prenomNom || budget.infos.intituleProjet || "Dossier"} · `, { size: 16, color: "94A3B8" }),
                  txt("Page ", { size: 16, color: "94A3B8" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "94A3B8", font: "Arial" }),
                  txt(" / ", { size: 16, color: "94A3B8" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "94A3B8", font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children: allChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nom = budget.infos.prenomNom || budget.infos.intituleProjet || "previsionnel";
  a.download = `${nom.replace(/\s+/g, "_")}_previsionnel.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
