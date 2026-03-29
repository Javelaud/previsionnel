"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, Save, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, CalendarRange, ChevronRight, ChevronDown, Upload, X, Send, Link2, Copy, Check, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { BudgetPrevisionnel, BalanceNmoins1, LigneBalanceDetail } from "@/data/previsionnel/types";
import { parseFec } from "@/data/previsionnel/fec-parser";
import { parseBalanceXlsx } from "@/data/previsionnel/balance-parser";
import { getClient, getBudgetsForClient, createNewBudget, saveBudget } from "@/data/previsionnel/storage";
import {
  calculerPrevisionnel,
  getTotalBesoins,
  getTotalFinancement,
  analysePret,
} from "@/data/previsionnel/calculations";
import { exportToExcel } from "@/data/previsionnel/excel-export";
import { exportToWord } from "@/data/previsionnel/word-export";
import { SECTEURS_ACTIVITES, TOUTES_ACTIVITES } from "@/data/previsionnel/activites-ape";
import { RATIOS_SECTORIELS, getStatutRatio, type StatutRatio } from "@/data/previsionnel/ratios-sectoriels";
import { useEquilibre } from "@/contexts/equilibre-context";
import { upsertBudget, subscribeToBudget } from "@/lib/db";
import { supabase } from "@/lib/supabase";

// ---- Helpers ----

function eur(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + " %";
}

const MOIS_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// ---- NumberInput ----

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  step?: number;
}

function NumberInput({ value, onChange, className = "", placeholder = "0", min, step }: NumberInputProps) {
  const [local, setLocal] = useState(value === 0 ? "" : String(value));
  const focusRef = useRef(false);

  useEffect(() => {
    if (!focusRef.current) {
      setLocal(value === 0 ? "" : String(value));
    }
  }, [value]);

  return (
    <Input
      type="number"
      value={local}
      placeholder={placeholder}
      min={min}
      step={step}
      className={`text-right ${className}`}
      onFocus={() => { focusRef.current = true; }}
      onChange={(e) => {
        setLocal(e.target.value);
        const parsed = parseFloat(e.target.value);
        onChange(isNaN(parsed) ? 0 : parsed);
      }}
      onBlur={() => {
        focusRef.current = false;
        const parsed = parseFloat(local);
        const clean = isNaN(parsed) ? 0 : parsed;
        setLocal(clean === 0 ? "" : String(clean));
        onChange(clean);
      }}
    />
  );
}

// ---- Échéancier ----

interface EcheancierLigne {
  mois: number;
  mensualite: number;
  capital: number;
  interets: number;
  capitalRestant: number;
}

function genererEcheancier(montant: number, tauxAnnuel: number, dureeMois: number): EcheancierLigne[] {
  if (montant <= 0 || dureeMois <= 0) return [];
  const tauxMensuel = tauxAnnuel / 12;
  let mensualite: number;
  if (tauxMensuel === 0) {
    mensualite = montant / dureeMois;
  } else {
    mensualite = (montant * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -dureeMois));
  }
  const lignes: EcheancierLigne[] = [];
  let capitalRestant = montant;
  for (let m = 1; m <= dureeMois; m++) {
    const interets = capitalRestant * tauxMensuel;
    const capital = mensualite - interets;
    capitalRestant = Math.max(0, capitalRestant - capital);
    lignes.push({
      mois: m,
      mensualite: Math.round(mensualite * 100) / 100,
      capital: Math.round(capital * 100) / 100,
      interets: Math.round(interets * 100) / 100,
      capitalRestant: Math.round(capitalRestant * 100) / 100,
    });
  }
  return lignes;
}

function EcheancierDialog({ pret }: { pret: { nom: string; montant: number; taux: number; dureeMois: number } }) {
  const lignes = genererEcheancier(pret.montant, pret.taux, pret.dureeMois);
  const totalInterets = lignes.reduce((s, l) => s + l.interets, 0);
  const totalCapital = lignes.reduce((s, l) => s + l.capital, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={pret.montant <= 0 || pret.dureeMois <= 0}>
          <CalendarRange className="h-4 w-4" />
          Échéancier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Échéancier — {pret.nom}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {eur(pret.montant)} à {(pret.taux * 100).toFixed(2)}% sur {pret.dureeMois} mois
            — Mensualité : {eur(lignes[0]?.mensualite ?? 0)}
          </p>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-16">Mois</TableHead>
                <TableHead className="text-right">Mensualité</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Intérêts</TableHead>
                <TableHead className="text-right">Capital restant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => (
                <TableRow key={l.mois}>
                  <TableCell className="text-right font-medium">{l.mois}</TableCell>
                  <TableCell className="text-right">{eur(l.mensualite)}</TableCell>
                  <TableCell className="text-right">{eur(l.capital)}</TableCell>
                  <TableCell className="text-right">{eur(l.interets)}</TableCell>
                  <TableCell className="text-right">{eur(l.capitalRestant)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2">
                <TableCell className="text-right">Total</TableCell>
                <TableCell className="text-right">{eur(totalCapital + totalInterets)}</TableCell>
                <TableCell className="text-right">{eur(totalCapital)}</TableCell>
                <TableCell className="text-right">{eur(totalInterets)}</TableCell>
                <TableCell className="text-right">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Row helpers ----

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-center gap-3 py-1">
      <Label className="text-sm text-right pr-2 text-muted-foreground">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function ThreeYearRow({
  label,
  values,
  onChange,
}: {
  label: string;
  values: [number, number, number];
  onChange: (vals: [number, number, number]) => void;
}) {
  return (
    <tr className="border-b border-border/40">
      <td className="py-1.5 pr-3 text-sm text-muted-foreground">{label}</td>
      {[0, 1, 2].map((i) => (
        <td key={i} className="py-1 px-1">
          <NumberInput
            value={values[i]}
            onChange={(v) => {
              const next: [number, number, number] = [...values] as [number, number, number];
              next[i] = v;
              onChange(next);
            }}
            className="w-full text-right h-8"
          />
        </td>
      ))}
    </tr>
  );
}

function ResultRow({ label, values, bold }: { label: string; values: [number, number, number]; bold?: boolean }) {
  return (
    <tr className={`border-b border-border/30 ${bold ? "font-semibold bg-muted/20" : ""}`}>
      <td className="py-1.5 pr-3 text-sm">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>
          {eur(v)}
        </td>
      ))}
    </tr>
  );
}

// ---- Deep merge utility ----

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key in patch) {
    const pv = (patch as Record<string, unknown>)[key];
    const bv = (base as Record<string, unknown>)[key];
    if (pv !== null && typeof pv === "object" && !Array.isArray(pv) && typeof bv === "object" && bv !== null && !Array.isArray(bv)) {
      result[key] = deepMerge(bv as Record<string, unknown>, pv as Record<string, unknown>);
    } else {
      result[key] = pv;
    }
  }
  return result as T;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// ---- Page ----

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [budget, setBudget] = useState<BudgetPrevisionnel | null>(null);
  const [clientNom, setClientNom] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const { setData: setEquilibreData } = useEquilibre();
  const [expandInvestissements, setExpandInvestissements] = useState(false);
  const [expandFinancements, setExpandFinancements] = useState(false);
  const [expandEncaissements, setExpandEncaissements] = useState(false);
  const [expandDepenses, setExpandDepenses] = useState(false);
  const [expandChargesExternes, setExpandChargesExternes] = useState(false);
  const [expandN1CA, setExpandN1CA] = useState(false);
  const [expandN1Serv, setExpandN1Serv] = useState(false);
  const [expandN1Achats, setExpandN1Achats] = useState(false);
  const [expandN1Personnel, setExpandN1Personnel] = useState(false);
  const [expandN1Dotations, setExpandN1Dotations] = useState(false);
  const [expandN1Financieres, setExpandN1Financieres] = useState(false);
  const [expandN1AutresProduits, setExpandN1AutresProduits] = useState(false);
  const [expandN1AutresCharges, setExpandN1AutresCharges] = useState(false);
  const [expandImpotsTaxes, setExpandImpotsTaxes] = useState(false);
  const [fecImportStatus, setFecImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fecImportMessage, setFecImportMessage] = useState<string>("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "synced" | "syncing">("idle");
  const lastLocalSaveRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    const client = getClient(id);
    if (client) setClientNom(client.nom);
    const budgets = getBudgetsForClient(id);
    let activeBudget: BudgetPrevisionnel;
    if (budgets.length > 0) {
      activeBudget = budgets[0];
      setBudget(activeBudget);
    } else {
      activeBudget = createNewBudget(id);
      setBudget(activeBudget);
    }
    // Détecter le mode client (arrivé via un lien de partage)
    if (typeof window !== "undefined" && sessionStorage.getItem(`client_mode_${activeBudget.id}`)) {
      setIsClientMode(true);
    }

    // Synchronisation Supabase : upsert initial + récupération du share_token
    const budgetId = activeBudget.id;
    upsertBudget(activeBudget).then((token) => {
      if (token) setShareToken(token);
    });

    // Realtime : écouter les modifications faites par l'autre partie (client ↔ conseiller)
    const channel = subscribeToBudget(budgetId, (remoteBudget) => {
      // Ignorer si on vient de sauvegarder localement (évite la boucle)
      if (Date.now() - lastLocalSaveRef.current < 3000) return;
      setBudget(remoteBudget);
      saveBudget(remoteBudget);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 3000);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  const updateBudget = useCallback((patch: DeepPartial<BudgetPrevisionnel>) => {
    setBudget((prev) => {
      if (!prev) return prev;
      const updated = deepMerge(prev, patch);
      // Debounced save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(() => {
        saveBudget(updated);          // localStorage
        lastLocalSaveRef.current = Date.now();
        upsertBudget(updated);        // Supabase (fire & forget — l'autre partie verra les changements en temps réel)
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 500);
      return updated;
    });
  }, []);

  // Alimenter le widget équilibre dans le sidebar (doit être avant tout return conditionnel)
  const equilibreResultats = budget ? calculerPrevisionnel(budget) : null;
  const eqTotalEmplois = equilibreResultats && budget
    ? getTotalBesoins(budget) + equilibreResultats.variationBfrParAn[0] + equilibreResultats.remboursementsEmpruntParAn[0]
      + (budget.divers?.dividendes?.[0] ?? 0) + (budget.divers?.remboursementsComptesCourants?.[0] ?? 0)
    : 0;
  const eqTotalRessources = equilibreResultats && budget
    ? getTotalFinancement(budget) + equilibreResultats.capaciteAutofinancementParAn[0]
    : 0;
  const eqTresorerieAn1 = equilibreResultats?.excedentTresorerieParAn[0] ?? 0;
  useEffect(() => {
    if (budget) {
      setEquilibreData({ totalEmplois: eqTotalEmplois, totalRessources: eqTotalRessources, tresorerieAn1: eqTresorerieAn1 });
    }
    return () => setEquilibreData(null);
  }, [eqTotalEmplois, eqTotalRessources, eqTresorerieAn1, setEquilibreData, budget]);

  if (!mounted || !budget) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const resultats = calculerPrevisionnel(budget);

  const tresoChartData = resultats.tresorerieMensuelle.map((t, i) => ({
    mois: MOIS_LABELS[i].slice(0, 3),
    tresorerie: t,
  }));

  return (
    <>
    <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {!isClientMode && (
              <Link href="/previsionnel">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {isClientMode ? "Votre dossier prévisionnel" : (clientNom || "Client")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isClientMode
                  ? (budget.infos.prenomNom || budget.infos.intituleProjet || "")
                  : (budget.infos.intituleProjet || "Budget prévisionnel")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3 animate-pulse" /> Enregistrement...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Sauvegardé
              </span>
            )}
            {/* Indicateur de synchronisation — visible en mode client */}
            {isClientMode && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {syncStatus === "synced" ? "Réponses synchronisées ✓" : "Synchronisé avec votre conseiller"}
              </div>
            )}
            {!isClientMode && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportToExcel(budget, resultats)}
              >
                <Download className="h-4 w-4" />
                Exporter Excel
              </Button>
            )}
            {!isClientMode && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportToWord(budget, resultats)}
              >
                <Download className="h-4 w-4" />
                Exporter Word
              </Button>
            )}
            {/* Bouton déconnexion — admin */}
            {!isClientMode && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={() => router.push("/previsionnel")}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            )}
            {/* Bouton déconnexion — client */}
            {isClientMode && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  // Effacer le mode client
                  sessionStorage.removeItem("previsionnel_client_mode");
                  Object.keys(sessionStorage)
                    .filter((k) => k.startsWith("client_mode_"))
                    .forEach((k) => sessionStorage.removeItem(k));
                  router.push("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="informations">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="informations">Informations</TabsTrigger>
            <TabsTrigger value="investissements">Investissements</TabsTrigger>
            <TabsTrigger value="financement">Financement</TabsTrigger>
            <TabsTrigger value="charges-fixes">Charges fixes</TabsTrigger>
            <TabsTrigger value="impots-taxes">Impôts & Taxes</TabsTrigger>
            <TabsTrigger value="chiffre-affaires">Chiffre d&apos;affaires</TabsTrigger>
            <TabsTrigger value="salaires">Salaires</TabsTrigger>
            <TabsTrigger value="divers">Divers</TabsTrigger>
            <TabsTrigger value="resultats">Résultats</TabsTrigger>
          </TabsList>

          {/* ---- INFORMATIONS ---- */}
          <TabsContent value="informations">
            <Card>
              <CardHeader>
                <CardTitle>Section 1 — Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FieldRow label="Prénom Nom">
                  <Input
                    value={budget.infos.prenomNom}
                    onChange={(e) => updateBudget({ infos: { prenomNom: e.target.value } })}
                    placeholder="Jean Dupont"
                  />
                </FieldRow>
                <FieldRow label="Intitulé du projet">
                  <Input
                    value={budget.infos.intituleProjet}
                    onChange={(e) => updateBudget({ infos: { intituleProjet: e.target.value } })}
                    placeholder="Mon projet"
                  />
                </FieldRow>
                <FieldRow label="Activité">
                  <div className="space-y-1">
                    <select
                      value={budget.infos.activite || ""}
                      onChange={(e) => {
                        const selected = TOUTES_ACTIVITES.find((a) => a.label === e.target.value);
                        updateBudget({ infos: { activite: e.target.value, codeAPE: selected?.codeAPE ?? "" } });
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Sélectionner une activité —</option>
                      {SECTEURS_ACTIVITES.map((secteur) => (
                        <optgroup key={secteur.secteur} label={secteur.secteur}>
                          {secteur.activites.map((a) => (
                            <option key={a.label} value={a.label}>{a.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {budget.infos.codeAPE && (
                      <p className="text-xs text-muted-foreground">Code APE : <span className="font-mono font-medium">{budget.infos.codeAPE}</span></p>
                    )}
                  </div>
                </FieldRow>
                <FieldRow label="Statut juridique">
                  <select
                    value={budget.infos.statutJuridique}
                    onChange={(e) => updateBudget({ infos: { statutJuridique: e.target.value as BudgetPrevisionnel["infos"]["statutJuridique"] } })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Micro-entreprise</option>
                    <option>Entreprise individuelle au réel (IR)</option>
                    <option>EURL (IS)</option>
                    <option>SARL (IS)</option>
                    <option>SAS (IS)</option>
                    <option>SASU (IS)</option>
                  </select>
                </FieldRow>
                <FieldRow label="Téléphone">
                  <Input
                    value={budget.infos.telephone}
                    onChange={(e) => updateBudget({ infos: { telephone: e.target.value } })}
                    placeholder="06 00 00 00 00"
                  />
                </FieldRow>
                <FieldRow label="Email">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={budget.infos.email}
                      onChange={(e) => updateBudget({ infos: { email: e.target.value } })}
                      placeholder="contact@example.com"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950"
                      onClick={async () => {
                        // S'assurer que le budget est dans Supabase et récupérer le token
                        let token = shareToken;
                        if (!token) {
                          token = await upsertBudget(budget);
                          if (token) setShareToken(token);
                        }
                        const url = token
                          ? `${window.location.origin}/partage?token=${token}`
                          : `${window.location.origin}/partage?token=indisponible`;
                        setInviteUrl(url);
                        setInviteCopied(false);
                        setInviteDialogOpen(true);
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Inviter le client
                    </Button>
                  </div>
                </FieldRow>
                <FieldRow label="Ville">
                  <Input
                    value={budget.infos.ville}
                    onChange={(e) => updateBudget({ infos: { ville: e.target.value } })}
                    placeholder="Paris"
                  />
                </FieldRow>
                <FieldRow label="Type de vente">
                  <select
                    value={budget.infos.typeVente}
                    onChange={(e) => updateBudget({ infos: { typeVente: e.target.value as BudgetPrevisionnel["infos"]["typeVente"] } })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option>Marchandises (y compris hébergement et restauration)</option>
                    <option>Services</option>
                    <option>Mixte</option>
                  </select>
                </FieldRow>
                <FieldRow label="ACRE">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="acre"
                      checked={budget.infos.acre}
                      onChange={(e) => updateBudget({ infos: { acre: e.target.checked } })}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="acre" className="cursor-pointer">
                      Bénéficiaire de l&apos;ACRE (réduction de charges 1ère année)
                    </Label>
                  </div>
                </FieldRow>
                <div className="h-px bg-border my-4" />
                {/* Section Balance N-1 (société en activité) */}
                <p className="text-sm font-medium mb-2">Société en activité — Balance N-1</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Si votre entreprise est déjà en activité, importez votre balance comptable N-1
                  pour initialiser la trésorerie de départ, le BFR et afficher un compte de résultat N-1.
                </p>
                <div className="flex flex-col gap-2">
                  {budget.balanceNmoins1 ? (
                    <div className="flex items-center gap-3 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/20 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Balance N-1 importée{budget.balanceNmoins1.exercice ? ` (exercice ${budget.balanceNmoins1.exercice})` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CA : {budget.balanceNmoins1.compteResultat.caTotal.toLocaleString("fr-FR")} € •
                          Trésorerie : {budget.balanceNmoins1.tresorerie.toLocaleString("fr-FR")} €
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBudget({ balanceNmoins1: undefined })}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Supprimer la balance N-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-3 hover:bg-muted/20 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">
                          {fecImportStatus === "loading" ? "Import en cours…" : "Importer une balance (.xlsx)"}
                        </span>
                        <p className="text-xs text-muted-foreground">Format privilégié : balance comptable Excel (Sage, Cegid, EBP…)</p>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.txt,.csv,.fec"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setFecImportStatus("loading");
                          try {
                            let balance: BalanceNmoins1;
                            const isXlsx = file.name.match(/\.(xlsx|xls)$/i);
                            if (isXlsx) {
                              const buf = await file.arrayBuffer();
                              balance = await parseBalanceXlsx(buf);
                            } else {
                              const text = await file.text();
                              balance = parseFec(text);
                            }
                            updateBudget({ balanceNmoins1: balance });
                            setFecImportStatus("success");
                            setFecImportMessage("OK");
                          } catch (err) {
                            setFecImportStatus("error");
                            setFecImportMessage("Erreur lors de la lecture du fichier : " + String(err));
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {fecImportStatus === "error" && (
                    <p className="text-xs text-destructive">{fecImportMessage}</p>
                  )}
                </div>
                <div className="h-px bg-border my-4" />
                <p className="text-sm text-muted-foreground mb-3">Besoin en fonds de roulement (BFR)</p>
                <FieldRow label="Délai clients (jours)">
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={budget.bfr.delaiClientsJours}
                      onChange={(v) => updateBudget({ bfr: { delaiClientsJours: v } })}
                      className="w-24"
                      step={1}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">jours de crédit accordés aux clients</span>
                  </div>
                </FieldRow>
                <FieldRow label="Délai fournisseurs (jours)">
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={budget.bfr.delaiFournisseursJours}
                      onChange={(v) => updateBudget({ bfr: { delaiFournisseursJours: v } })}
                      className="w-24"
                      step={1}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">jours de crédit accordés par les fournisseurs</span>
                  </div>
                </FieldRow>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- INVESTISSEMENTS ---- */}
          <TabsContent value="investissements">
            <Card>
              <CardHeader>
                <CardTitle>Section 2 — Besoins de démarrage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">Investissements amortissables</p>
                  <div className="grid grid-cols-[1fr_8rem_5rem] gap-2 items-center mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Investissement</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Montant (€)</span>
                    <span className="text-xs font-medium text-muted-foreground text-right">Durée (ans)</span>
                  </div>
                  {[
                    { key: "fraisEtablissement", label: "Frais d'établissement" },
                    { key: "logicielsFormations", label: "Logiciels et formations" },
                    { key: "depotMarqueBrevet", label: "Dépôt de marque / brevet" },
                    { key: "droitsEntree", label: "Droits d'entrée (franchise)" },
                    { key: "achatFondsCommerce", label: "Achat fonds de commerce" },
                    { key: "droitAuBail", label: "Droit au bail" },
                    { key: "enseigneCommunication", label: "Enseigne et communication" },
                    { key: "achatImmobilier", label: "Achat immobilier" },
                    { key: "travauxAmenagements", label: "Travaux et aménagements" },
                    { key: "materiel", label: "Matériel et équipements" },
                    { key: "materielBureau", label: "Matériel de bureau / informatique" },
                  ].map(({ key, label }) => {
                    const inv = (budget.besoins as unknown as Record<string, { montant: number; dureeAmortissement: number }>)[key];
                    return (
                      <div key={key} className="grid grid-cols-[1fr_8rem_5rem] gap-2 items-center">
                        <Label className="text-sm">{label}</Label>
                        <NumberInput
                          value={inv.montant}
                          onChange={(v) => updateBudget({ besoins: { [key]: { ...inv, montant: v } } })}
                          className="w-full"
                        />
                        <NumberInput
                          value={inv.dureeAmortissement}
                          onChange={(v) => updateBudget({ besoins: { [key]: { ...inv, dureeAmortissement: Math.max(1, v) } } })}
                          className="w-full"
                          min={1}
                          step={1}
                        />
                      </div>
                    );
                  })}

                  <div className="h-px bg-border my-4" />
                  <p className="text-sm text-muted-foreground mb-3">Immobilisation non amortissable</p>
                  <FieldRow label="Terrain">
                    <NumberInput
                      value={budget.besoins.terrain}
                      onChange={(v) => updateBudget({ besoins: { terrain: v } })}
                      className="w-48"
                    />
                  </FieldRow>

                  <div className="h-px bg-border my-4" />
                  <p className="text-sm text-muted-foreground mb-3">Charges (non amortissables)</p>
                  {[
                    { key: "fraisDossier", label: "Frais de dossier" },
                    { key: "fraisNotaireAvocat", label: "Frais de notaire / avocat / expert comptable" },
                  ].map(({ key, label }) => (
                    <FieldRow key={key} label={label}>
                      <NumberInput
                        value={(budget.besoins as unknown as Record<string, number>)[key]}
                        onChange={(v) => updateBudget({ besoins: { [key]: v } })}
                        className="w-48"
                      />
                    </FieldRow>
                  ))}

                  <div className="h-px bg-border my-4" />
                  <p className="text-sm text-muted-foreground mb-3">Autres besoins (non amortissables)</p>
                  {[
                    { key: "cautionDepotGarantie", label: "Caution / dépôt de garantie" },
                    { key: "stockMatieresProduits", label: "Stock initial (matières / produits)" },
                    { key: "tresorerieDépart", label: "Trésorerie de départ" },
                  ].map(({ key, label }) => (
                    <FieldRow key={key} label={label}>
                      <NumberInput
                        value={(budget.besoins as unknown as Record<string, number>)[key]}
                        onChange={(v) => updateBudget({ besoins: { [key]: v } })}
                        className="w-48"
                      />
                    </FieldRow>
                  ))}

                  <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                    <span className="font-semibold">Total besoins de démarrage</span>
                    <span className="text-xl font-bold">{eur(getTotalBesoins(budget))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- FINANCEMENT ---- */}
          <TabsContent value="financement">
            <Card>
              <CardHeader>
                <CardTitle>Section 3 — Plan de financement initial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label="Apport personnel (€)">
                  <NumberInput
                    value={budget.financement.apportPersonnel}
                    onChange={(v) => updateBudget({ financement: { apportPersonnel: v } })}
                    className="w-48"
                  />
                </FieldRow>
                <FieldRow label="Apports en nature (€)">
                  <NumberInput
                    value={budget.financement.apportsNature}
                    onChange={(v) => updateBudget({ financement: { apportsNature: v } })}
                    className="w-48"
                  />
                </FieldRow>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Apports en compte courant d&apos;associés</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground text-center mb-1">Année {i + 1} (€)</p>
                        <NumberInput
                          value={budget.financement.apportsComptesCourants[i]}
                          onChange={(v) => {
                            const apportsComptesCourants = [...budget.financement.apportsComptesCourants] as [number, number, number];
                            apportsComptesCourants[i] = v;
                            updateBudget({ financement: { apportsComptesCourants } });
                          }}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Emprunts bancaires</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prets = [...budget.financement.prets, { nom: `Prêt n°${budget.financement.prets.length + 1}`, montant: 0, taux: 0, dureeMois: 0 }];
                        updateBudget({ financement: { prets } });
                      }}
                    >
                      + Ajouter un emprunt
                    </Button>
                  </div>
                  {budget.financement.prets.map((pret, idx) => (
                    <div key={idx} className="border rounded-lg p-4 mb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Emprunt {idx + 1}</span>
                        {budget.financement.prets.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                            onClick={() => {
                              const prets = budget.financement.prets.filter((_, i) => i !== idx);
                              updateBudget({ financement: { prets } });
                            }}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                      <FieldRow label="Nom du prêt">
                        <Input
                          value={pret.nom}
                          onChange={(e) => {
                            const prets = [...budget.financement.prets];
                            prets[idx] = { ...prets[idx], nom: e.target.value };
                            updateBudget({ financement: { prets } });
                          }}
                        />
                      </FieldRow>
                      <FieldRow label="Montant (€)">
                        <NumberInput
                          value={pret.montant}
                          onChange={(v) => {
                            const prets = [...budget.financement.prets];
                            prets[idx] = { ...prets[idx], montant: v };
                            updateBudget({ financement: { prets } });
                          }}
                          className="w-48"
                        />
                      </FieldRow>
                      <FieldRow label="Taux annuel (%)">
                        <NumberInput
                          value={pret.taux * 100}
                          onChange={(v) => {
                            const prets = [...budget.financement.prets];
                            prets[idx] = { ...prets[idx], taux: v / 100 };
                            updateBudget({ financement: { prets } });
                          }}
                          className="w-24"
                          step={0.1}
                        />
                      </FieldRow>
                      <FieldRow label="Durée (mois)">
                        <NumberInput
                          value={pret.dureeMois}
                          onChange={(v) => {
                            const prets = [...budget.financement.prets];
                            prets[idx] = { ...prets[idx], dureeMois: v };
                            updateBudget({ financement: { prets } });
                          }}
                          className="w-24"
                          step={1}
                        />
                      </FieldRow>
                      <div className="flex justify-end pt-2">
                        <EcheancierDialog pret={pret} />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Subventions d&apos;investissement</h3>
                  <p className="text-xs text-muted-foreground mb-2">Amorties sur la durée des immobilisations, intégrées au plan de financement</p>
                  {budget.financement.subventionsInvestissement.map((sub, idx) => (
                    <div key={idx} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex gap-3">
                        <Input
                          value={sub.nom}
                          onChange={(e) => {
                            const subventionsInvestissement = [...budget.financement.subventionsInvestissement] as BudgetPrevisionnel["financement"]["subventionsInvestissement"];
                            subventionsInvestissement[idx] = { ...subventionsInvestissement[idx], nom: e.target.value };
                            updateBudget({ financement: { subventionsInvestissement } });
                          }}
                          placeholder="Nom de la subvention"
                          className="flex-1"
                        />
                        <NumberInput
                          value={sub.montant}
                          onChange={(v) => {
                            const subventionsInvestissement = [...budget.financement.subventionsInvestissement] as BudgetPrevisionnel["financement"]["subventionsInvestissement"];
                            subventionsInvestissement[idx] = { ...subventionsInvestissement[idx], montant: v };
                            updateBudget({ financement: { subventionsInvestissement } });
                          }}
                          className="w-40"
                          placeholder="Montant (€)"
                        />
                        <NumberInput
                          value={sub.dureeAmortissement}
                          onChange={(v) => {
                            const subventionsInvestissement = [...budget.financement.subventionsInvestissement] as BudgetPrevisionnel["financement"]["subventionsInvestissement"];
                            subventionsInvestissement[idx] = { ...subventionsInvestissement[idx], dureeAmortissement: Math.max(1, v) };
                            updateBudget({ financement: { subventionsInvestissement } });
                          }}
                          className="w-24"
                          placeholder="Durée"
                          min={1}
                          step={1}
                        />
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex-1"></span>
                        <span className="w-40 text-right">Montant (€)</span>
                        <span className="w-24 text-right">Durée (ans)</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Subventions d&apos;exploitation</h3>
                  <p className="text-xs text-muted-foreground mb-2">Intégrées directement au résultat, par année</p>
                  {budget.financement.subventionsExploitation.map((sub, idx) => (
                    <div key={idx} className="border rounded-lg p-3 mb-2 space-y-2">
                      <FieldRow label="Nom">
                        <Input
                          value={sub.nom}
                          onChange={(e) => {
                            const subventionsExploitation = [...budget.financement.subventionsExploitation] as BudgetPrevisionnel["financement"]["subventionsExploitation"];
                            subventionsExploitation[idx] = { ...subventionsExploitation[idx], nom: e.target.value };
                            updateBudget({ financement: { subventionsExploitation } });
                          }}
                          placeholder="Nom de la subvention"
                        />
                      </FieldRow>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i}>
                            <p className="text-xs text-muted-foreground text-center mb-1">Année {i + 1} (€)</p>
                            <NumberInput
                              value={sub.montants[i]}
                              onChange={(v) => {
                                const subventionsExploitation = [...budget.financement.subventionsExploitation] as BudgetPrevisionnel["financement"]["subventionsExploitation"];
                                const montants = [...subventionsExploitation[idx].montants] as [number, number, number];
                                montants[i] = v;
                                subventionsExploitation[idx] = { ...subventionsExploitation[idx], montants };
                                updateBudget({ financement: { subventionsExploitation } });
                              }}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Autre financement</h3>
                  <div className="flex gap-3">
                    <Input
                      value={budget.financement.autreFinancement.nom}
                      onChange={(e) => updateBudget({ financement: { autreFinancement: { ...budget.financement.autreFinancement, nom: e.target.value } } })}
                      placeholder="Nom"
                      className="flex-1"
                    />
                    <NumberInput
                      value={budget.financement.autreFinancement.montant}
                      onChange={(v) => updateBudget({ financement: { autreFinancement: { ...budget.financement.autreFinancement, montant: v } } })}
                      className="w-40"
                      placeholder="Montant (€)"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- CHARGES FIXES ---- */}
          <TabsContent value="charges-fixes">
            <Card>
              <CardHeader>
                <CardTitle>Section 4 — Charges fixes annuelles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <FieldRow label="Taux d'inflation (%)">
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={(budget.chargesFixes.tauxInflation ?? 0) * 100}
                        onChange={(v) => updateBudget({ chargesFixes: { tauxInflation: v / 100 } })}
                        className="w-24"
                        step={0.5}
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">Les années 2 et 3 sont calculées automatiquement</span>
                    </div>
                  </FieldRow>
                </div>
                {(() => {
                  const inf = budget.chargesFixes.tauxInflation ?? 0;
                  const inflate = (v: number, year: number) => year === 0 ? v : Math.round(v * Math.pow(1 + inf, year));
                  return (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-sm font-semibold w-64">Poste de charge</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 1 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 2 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 3 (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "assurances", label: "Assurances" },
                      { key: "telephoneInternet", label: "Téléphone / Internet" },
                      { key: "autresAbonnements", label: "Autres abonnements" },
                      { key: "carburantTransports", label: "Carburant et transports" },
                      { key: "fraisDeplacementHebergement", label: "Frais déplacement / hébergement" },
                      { key: "eauElectriciteGaz", label: "Eau, électricité, gaz" },
                      { key: "mutuelle", label: "Mutuelle" },
                      { key: "fournituresDiverses", label: "Fournitures diverses" },
                      { key: "entretienMaterielVetements", label: "Entretien matériel / vêtements" },
                      { key: "nettoyageLocaux", label: "Nettoyage des locaux" },
                      { key: "budgetPubliciteCommunication", label: "Publicité / communication" },
                      { key: "loyerChargesLocatives", label: "Loyer et charges locatives" },
                      { key: "expertComptableAvocats", label: "Expert-comptable / avocats" },
                      { key: "fraisBancairesTerminalCB", label: "Frais bancaires / terminal CB" },
                    ].map(({ key, label }) => {
                      const vals = (budget.chargesFixes as unknown as Record<string, [number, number, number]>)[key];
                      return (
                        <tr key={key} className="border-b border-border/40">
                          <td className="py-1.5 pr-3 text-sm text-muted-foreground">{label}</td>
                          <td className="py-1 px-1">
                            <NumberInput
                              value={vals[0]}
                              onChange={(v) => {
                                const next: [number, number, number] = [v, inflate(v, 1), inflate(v, 2)];
                                updateBudget({ chargesFixes: { [key]: next } });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <NumberInput
                              value={vals[1]}
                              onChange={(v) => {
                                const next: [number, number, number] = [vals[0], v, vals[2]];
                                updateBudget({ chargesFixes: { [key]: next } });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                          <td className="py-1 px-1">
                            <NumberInput
                              value={vals[2]}
                              onChange={(v) => {
                                const next: [number, number, number] = [vals[0], vals[1], v];
                                updateBudget({ chargesFixes: { [key]: next } });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                        </tr>
                      );
                    })}

                    {/* Charges personnalisées */}
                    {(["autreCharge1", "autreCharge2", "autreCharge3"] as const).map((key) => (
                      <tr key={key} className="border-b border-border/40">
                        <td className="py-1.5 pr-2">
                          <Input
                            value={budget.chargesFixes[key].nom}
                            onChange={(e) =>
                              updateBudget({
                                chargesFixes: {
                                  [key]: { ...budget.chargesFixes[key], nom: e.target.value },
                                },
                              })
                            }
                            placeholder="Autre charge..."
                            className="h-8 text-sm"
                          />
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i} className="py-1 px-1">
                            <NumberInput
                              value={budget.chargesFixes[key].montants[i]}
                              onChange={(v) => {
                                const montants = [...budget.chargesFixes[key].montants] as [number, number, number];
                                if (i === 0) {
                                  montants[0] = v;
                                  montants[1] = inflate(v, 1);
                                  montants[2] = inflate(v, 2);
                                } else {
                                  montants[i] = v;
                                }
                                updateBudget({
                                  chargesFixes: {
                                    [key]: { ...budget.chargesFixes[key], montants },
                                  },
                                });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Total */}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-2 pr-3 text-sm">Total charges fixes</td>
                      {resultats.chargesExternesParAn.map((ce, i) => (
                        <td key={i} className="py-2 px-2 text-right text-sm tabular-nums">
                          {eur(ce)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- IMPÔTS & TAXES ---- */}
          <TabsContent value="impots-taxes">
            <Card>
              <CardHeader>
                <CardTitle>Impôts et taxes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <FieldRow label="Taux d'inflation (%)">
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={(budget.impotsTaxes.tauxInflation ?? 0) * 100}
                        onChange={(v) => updateBudget({ impotsTaxes: { tauxInflation: v / 100 } })}
                        className="w-24"
                        step={0.5}
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">Les années 2 et 3 sont pré-remplies automatiquement</span>
                    </div>
                  </FieldRow>
                </div>
                {(() => {
                  const inf = budget.impotsTaxes.tauxInflation ?? 0;
                  const inflate = (v: number, year: number) => year === 0 ? v : Math.round(v * Math.pow(1 + inf, year));
                  return (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-sm font-semibold w-64">Poste</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 1 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 2 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-32">Année 3 (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* CFE */}
                    <tr className="border-b border-border/40">
                      <td className="py-1.5 pr-3 text-sm text-muted-foreground">CFE (Cotisation Foncière des Entreprises)</td>
                      <td className="py-1 px-1">
                        <NumberInput
                          value={budget.impotsTaxes.cfe[0]}
                          onChange={(v) => {
                            const next: [number, number, number] = [v, inflate(v, 1), inflate(v, 2)];
                            updateBudget({ impotsTaxes: { cfe: next } });
                          }}
                          className="w-full text-right h-8"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumberInput
                          value={budget.impotsTaxes.cfe[1]}
                          onChange={(v) => {
                            const next: [number, number, number] = [budget.impotsTaxes.cfe[0], v, budget.impotsTaxes.cfe[2]];
                            updateBudget({ impotsTaxes: { cfe: next } });
                          }}
                          className="w-full text-right h-8"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumberInput
                          value={budget.impotsTaxes.cfe[2]}
                          onChange={(v) => {
                            const next: [number, number, number] = [budget.impotsTaxes.cfe[0], budget.impotsTaxes.cfe[1], v];
                            updateBudget({ impotsTaxes: { cfe: next } });
                          }}
                          className="w-full text-right h-8"
                        />
                      </td>
                    </tr>

                    {/* Lignes libres */}
                    {(["autreTaxe1", "autreTaxe2", "autreTaxe3"] as const).map((key) => (
                      <tr key={key} className="border-b border-border/40">
                        <td className="py-1.5 pr-2">
                          <Input
                            value={budget.impotsTaxes[key].nom}
                            onChange={(e) =>
                              updateBudget({
                                impotsTaxes: {
                                  [key]: { ...budget.impotsTaxes[key], nom: e.target.value },
                                },
                              })
                            }
                            placeholder="Autre taxe..."
                            className="h-8 text-sm"
                          />
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i} className="py-1 px-1">
                            <NumberInput
                              value={budget.impotsTaxes[key].montants[i]}
                              onChange={(v) => {
                                const montants = [...budget.impotsTaxes[key].montants] as [number, number, number];
                                if (i === 0) {
                                  montants[0] = v;
                                  montants[1] = inflate(v, 1);
                                  montants[2] = inflate(v, 2);
                                } else {
                                  montants[i] = v;
                                }
                                updateBudget({
                                  impotsTaxes: {
                                    [key]: { ...budget.impotsTaxes[key], montants },
                                  },
                                });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Total */}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-2 pr-3 text-sm">Total impôts et taxes</td>
                      {resultats.impotsTaxesParAn.map((v, i) => (
                        <td key={i} className="py-2 px-2 text-right text-sm tabular-nums">
                          {eur(v)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- CHIFFRE D'AFFAIRES ---- */}
          <TabsContent value="chiffre-affaires">
            <Card>
              <CardHeader>
                <CardTitle>Section 5 — Chiffre d&apos;affaires prévisionnel (Année 1)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 w-28">Mois</th>
                        <th className="text-center py-2 px-1" colSpan={2}>
                          Marchandises
                        </th>
                        <th className="text-center py-2 px-1 border-l" colSpan={2}>
                          Services
                        </th>
                        <th className="text-right py-2 pl-2">CA total</th>
                      </tr>
                      <tr className="border-b border-border/50">
                        <th></th>
                        <th className="text-center py-1 text-xs font-normal text-muted-foreground px-1">Jours</th>
                        <th className="text-center py-1 text-xs font-normal text-muted-foreground px-1">€/jour</th>
                        <th className="text-center py-1 text-xs font-normal text-muted-foreground px-1 border-l">Jours</th>
                        <th className="text-center py-1 text-xs font-normal text-muted-foreground px-1">€/jour</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOIS_LABELS.map((mois, i) => {
                        const march = budget.chiffreAffaires.marchandises[i];
                        const serv = budget.chiffreAffaires.services[i];
                        const total =
                          march.joursTravailes * march.caMoyenParJour +
                          serv.joursTravailes * serv.caMoyenParJour;
                        return (
                          <tr key={i} className="border-b border-border/30">
                            <td className="py-1 pr-2 text-muted-foreground">{mois}</td>
                            <td className="py-1 px-1">
                              <NumberInput
                                value={march.joursTravailes}
                                onChange={(v) => {
                                  const marchandises = [...budget.chiffreAffaires.marchandises];
                                  marchandises[i] = { ...marchandises[i], joursTravailes: v };
                                  updateBudget({ chiffreAffaires: { marchandises } });
                                }}
                                className="w-16 h-7 text-center"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <NumberInput
                                value={march.caMoyenParJour}
                                onChange={(v) => {
                                  const marchandises = [...budget.chiffreAffaires.marchandises];
                                  marchandises[i] = { ...marchandises[i], caMoyenParJour: v };
                                  for (let j = i + 1; j < 12; j++) {
                                    marchandises[j] = { ...marchandises[j], caMoyenParJour: v };
                                  }
                                  updateBudget({ chiffreAffaires: { marchandises } });
                                }}
                                className="w-24 h-7 text-right"
                              />
                            </td>
                            <td className="py-1 px-1 border-l">
                              <NumberInput
                                value={serv.joursTravailes}
                                onChange={(v) => {
                                  const services = [...budget.chiffreAffaires.services];
                                  services[i] = { ...services[i], joursTravailes: v };
                                  updateBudget({ chiffreAffaires: { services } });
                                }}
                                className="w-16 h-7 text-center"
                              />
                            </td>
                            <td className="py-1 px-1">
                              <NumberInput
                                value={serv.caMoyenParJour}
                                onChange={(v) => {
                                  const services = [...budget.chiffreAffaires.services];
                                  services[i] = { ...services[i], caMoyenParJour: v };
                                  for (let j = i + 1; j < 12; j++) {
                                    services[j] = { ...services[j], caMoyenParJour: v };
                                  }
                                  updateBudget({ chiffreAffaires: { services } });
                                }}
                                className="w-24 h-7 text-right"
                              />
                            </td>
                            <td className="py-1 pl-2 text-right tabular-nums font-medium">
                              {eur(total)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="py-2" colSpan={5}>Total Année 1</td>
                        <td className="py-2 text-right tabular-nums">{eur(resultats.caTotalParAn[0])}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Progression marchandises</h3>
                    <div className="space-y-2">
                      <FieldRow label="Augmentation An 2 (%)">
                        <NumberInput
                          value={budget.chiffreAffaires.augmentationAn2Marchandises * 100}
                          onChange={(v) => updateBudget({ chiffreAffaires: { augmentationAn2Marchandises: v / 100 } })}
                          className="w-24"
                          step={1}
                        />
                      </FieldRow>
                      <FieldRow label="Augmentation An 3 (%)">
                        <NumberInput
                          value={budget.chiffreAffaires.augmentationAn3Marchandises * 100}
                          onChange={(v) => updateBudget({ chiffreAffaires: { augmentationAn3Marchandises: v / 100 } })}
                          className="w-24"
                          step={1}
                        />
                      </FieldRow>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Progression services</h3>
                    <div className="space-y-2">
                      <FieldRow label="Augmentation An 2 (%)">
                        <NumberInput
                          value={budget.chiffreAffaires.augmentationAn2Services * 100}
                          onChange={(v) => updateBudget({ chiffreAffaires: { augmentationAn2Services: v / 100 } })}
                          className="w-24"
                          step={1}
                        />
                      </FieldRow>
                      <FieldRow label="Augmentation An 3 (%)">
                        <NumberInput
                          value={budget.chiffreAffaires.augmentationAn3Services * 100}
                          onChange={(v) => updateBudget({ chiffreAffaires: { augmentationAn3Services: v / 100 } })}
                          className="w-24"
                          step={1}
                        />
                      </FieldRow>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border my-4" />
                <p className="text-sm text-muted-foreground mb-3">Charges variables</p>
                <FieldRow label="Coût d'achat marchandises (%)">
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={budget.chargesVariables.coutAchatMarchandisesPct * 100}
                      onChange={(v) => updateBudget({ chargesVariables: { coutAchatMarchandisesPct: v / 100 } })}
                      className="w-24"
                      step={1}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">% du CA marchandises</span>
                  </div>
                </FieldRow>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground">Année {i + 1}</p>
                        <p className="text-lg font-bold">{eur(resultats.caTotalParAn[i])}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- SALAIRES ---- */}
          <TabsContent value="salaires">
            <Card>
              <CardHeader>
                <CardTitle>Section 8 — Salaires et rémunérations</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-sm font-semibold w-64">Poste</th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 1 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 2 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 3 (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ThreeYearRow
                      label="Salaires employés (net)"
                      values={budget.salaires.salairesEmployesNet}
                      onChange={(vals) => updateBudget({ salaires: { salairesEmployesNet: vals } })}
                    />
                    <tr className="border-b border-border/20">
                      <td className="py-1 pr-3 text-xs text-muted-foreground pl-4">
                        → Charges sociales employés (estimées à 80%)
                      </td>
                      {resultats.chargesSocialesEmployesParAn.map((v, i) => (
                        <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">
                          {eur(v)}
                        </td>
                      ))}
                    </tr>
                    <ThreeYearRow
                      label="Rémunération dirigeant (net)"
                      values={budget.salaires.remunerationDirigeant}
                      onChange={(vals) => updateBudget({ salaires: { remunerationDirigeant: vals } })}
                    />
                    <tr className="border-b border-border/20">
                      <td className="py-1 pr-3 text-xs text-muted-foreground pl-4">
                        → Charges sociales dirigeant (selon statut{budget.infos.acre ? " + ACRE" : ""})
                      </td>
                      {resultats.chargesSocialesDirigeantParAn.map((v, i) => (
                        <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">
                          {eur(v)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-2 pr-3 text-sm">Total masse salariale chargée</td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className="py-2 px-2 text-right text-sm tabular-nums">
                          {eur(
                            resultats.salairesEmployesParAn[i] +
                            resultats.chargesSocialesEmployesParAn[i] +
                            resultats.remunerationDirigeantParAn[i] +
                            resultats.chargesSocialesDirigeantParAn[i]
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 p-3 bg-muted/20 border rounded-lg text-sm">
                  <p className="font-medium mb-1">Statut : {budget.infos.statutJuridique}</p>
                  <p className="text-muted-foreground">
                    {budget.infos.acre
                      ? "ACRE active : taux de charges réduit la 1ère année."
                      : "Pas d'ACRE. Cochez la case dans les informations générales si applicable."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- DIVERS ---- */}
          <TabsContent value="divers">
            <Card>
              <CardHeader>
                <CardTitle>Divers</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-sm font-semibold w-64"></th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 1 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 2 (€)</th>
                      <th className="py-2 text-center text-sm font-semibold w-36">Année 3 (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: "dividendes" as const, label: "Distribution de dividendes", hint: "Plan de financement et trésorerie uniquement" },
                      { key: "remboursementsComptesCourants" as const, label: "Remboursements compte courant associés", hint: "Plan de financement et trésorerie uniquement" },
                      { key: "cessionsImmobilisations" as const, label: "Cessions d'immobilisations", hint: "Rentre dans le résultat" },
                      { key: "indemnitesARecevoir" as const, label: "Indemnités diverses à recevoir", hint: "Rentre dans le résultat" },
                      { key: "indemnitesAPayer" as const, label: "Indemnités diverses à payer", hint: "Rentre dans le résultat (en moins)" },
                    ]).map(({ key, label, hint }) => (
                      <tr key={key} className="border-b border-border/40">
                        <td className="py-1.5 pr-3">
                          <p className="text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        </td>
                        {[0, 1, 2].map((i) => (
                          <td key={i} className="py-1 px-1">
                            <NumberInput
                              value={budget.divers[key][i]}
                              onChange={(v) => {
                                const arr = [...budget.divers[key]] as [number, number, number];
                                arr[i] = v;
                                updateBudget({ divers: { [key]: arr } });
                              }}
                              className="w-full text-right h-8"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- RÉSULTATS ---- */}
          <TabsContent value="resultats">
            <div className="space-y-6">
              {/* Dashboard indicateurs + graphique trésorerie */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className={`border-2 ${resultats.estRentable ? "border-green-500" : "border-destructive"}`}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {resultats.estRentable ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">Rentabilité An 1</span>
                    </div>
                    <p className={`text-lg font-bold ${resultats.estRentable ? "text-green-600" : "text-destructive"}`}>
                      {resultats.estRentable ? "Rentable" : "Déficitaire"}
                    </p>
                    <p className="text-sm tabular-nums">{eur(resultats.resultatNetParAn[0])}</p>
                  </CardContent>
                </Card>

                <Card className={`border-2 ${resultats.tresorerieAdequate ? "border-green-500" : "border-orange-400"}`}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {resultats.tresorerieAdequate ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">Trésorerie An 1</span>
                    </div>
                    <p className={`text-lg font-bold ${resultats.tresorerieAdequate ? "text-green-600" : "text-orange-500"}`}>
                      {resultats.tresorerieAdequate ? "Positive" : "Risque"}
                    </p>
                    <p className="text-sm tabular-nums">
                      Min : {eur(Math.min(...resultats.tresorerieMensuelle))}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-1">CAF An 1</p>
                    <p className={`text-lg font-bold ${resultats.capaciteAutofinancementParAn[0] < 0 ? "text-destructive" : ""}`}>
                      {eur(resultats.capaciteAutofinancementParAn[0])}
                    </p>
                    <p className="text-sm text-muted-foreground">Capacité d&apos;autofinancement</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-1">BFR An 1</p>
                    <p className={`text-lg font-bold ${resultats.bfrParAn[0] > 0 ? "text-destructive" : "text-green-600"}`}>
                      {eur(resultats.bfrParAn[0])}
                    </p>
                    <p className="text-sm text-muted-foreground">Besoin en fonds de roulement</p>
                  </CardContent>
                </Card>
              </div>

              {/* Graphique trésorerie mensuelle (dashboard) */}
              <Card>
                <CardHeader>
                  <CardTitle>Trésorerie mensuelle — Année 1</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tresoChartData} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 0 }).format(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [eur(value), "Trésorerie cumulée"]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeWidth={2} />
                      <Bar
                        dataKey="tresorerie"
                        radius={[3, 3, 0, 0]}
                        fill="hsl(var(--primary))"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Ratios sectoriels — EN HAUT des résultats */}
              {(() => {
                const ca1 = resultats.caTotalParAn[0];
                if (ca1 <= 0) return null;
                const secteurTrouve = SECTEURS_ACTIVITES.find((s) =>
                  s.activites.some((a) => a.codeAPE === budget.infos.codeAPE)
                );
                const refRatios = secteurTrouve
                  ? RATIOS_SECTORIELS.find((r) => r.secteur === secteurTrouve.secteur) ?? null
                  : null;
                const margeBruteClient = (resultats.margeBruteParAn[0] / ca1) * 100;
                const margeNetteClient = (resultats.resultatNetParAn[0] / ca1) * 100;
                const chargesFixesClient = (resultats.chargesExternesParAn[0] / ca1) * 100;
                const statutColor: Record<StatutRatio, string> = {
                  bon: "text-green-600", attention: "text-orange-500",
                  alerte: "text-destructive", inconnu: "text-muted-foreground",
                };
                const statutBg: Record<StatutRatio, string> = {
                  bon: "bg-green-50 dark:bg-green-950/20", attention: "bg-orange-50 dark:bg-orange-950/20",
                  alerte: "bg-red-50 dark:bg-red-950/20", inconnu: "bg-muted/20",
                };
                const statutLabel: Record<StatutRatio, string> = {
                  bon: "Dans la norme", attention: "Légèrement hors norme",
                  alerte: "Hors norme", inconnu: "—",
                };
                const ratios = [
                  { label: "Taux de marge brute", description: "(CA − Achats) / CA", client: margeBruteClient, ref: refRatios?.margeBrute ?? null },
                  { label: "Taux de marge nette", description: "Résultat net / CA", client: margeNetteClient, ref: refRatios?.margeNette ?? null },
                  { label: "Taux de charges fixes", description: "Charges externes / CA", client: chargesFixesClient, ref: refRatios?.chargesFixes ?? null },
                ];
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Analyse sectorielle — comparaison An 1
                        {secteurTrouve && <span className="text-sm font-normal text-muted-foreground">({secteurTrouve.secteur})</span>}
                      </CardTitle>
                      {!secteurTrouve && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Renseignez un code APE dans l&apos;onglet Informations pour afficher la comparaison sectorielle.
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {ratios.map(({ label, description, client, ref }) => {
                          const statut: StatutRatio = ref ? getStatutRatio(client, ref) : "inconnu";
                          return (
                            <div key={label} className={`rounded-lg border p-4 ${ref ? statutBg[statut] : "bg-muted/10"}`}>
                              <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                              <p className="text-[10px] text-muted-foreground mb-2">{description}</p>
                              <p className={`text-2xl font-bold tabular-nums ${ref ? statutColor[statut] : ""}`}>{client.toFixed(1)} %</p>
                              {ref ? (
                                <>
                                  <p className="text-xs text-muted-foreground mt-1">Secteur : {ref.min} % – {ref.max} % <span className="ml-1">(médiane {ref.median} %)</span></p>
                                  <p className={`text-xs font-medium mt-1 ${statutColor[statut]}`}>{statutLabel[statut]}</p>
                                </>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">Aucune référence sectorielle disponible</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">
                        Sources : Banque de France – Ratios sectoriels PME • INSEE – Enquête sectorielle annuelle
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Compte de résultat */}
              <Card>
                <CardHeader>
                  <CardTitle>Compte de résultat prévisionnel</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const cr = budget.balanceNmoins1?.compteResultat;
                    const dl = budget.balanceNmoins1?.detailLignes;
                    // Listes de détail N-1 par catégorie
                    const caMarchDetail = dl?.ca?.filter(l => ['701','702','703','707'].some(p => l.compte.startsWith(p))) ?? [];
                    const caServDetail  = dl?.ca?.filter(l => ['704','705','706','708'].some(p => l.compte.startsWith(p))) ?? [];
                    const achatsDetail         = dl?.achats ?? [];
                    const impotsTaxesDetail    = dl?.impotsTaxes ?? [];
                    const chargesExternesDetail = dl?.chargesExternes ?? [];
                    const personnelDetail      = dl?.chargesPersonnel ?? [];
                    const dotationsDetail      = dl?.dotations ?? [];
                    const financieresDetail    = dl?.chargesFinancieres ?? [];
                    const autresProduitsDetail = dl?.autresProduits ?? [];
                    const autresChargesDetail  = dl?.autresCharges ?? [];
                    // Colonne N-1 optionnelle
                    const N1Cell = ({ value }: { value: number }) => cr ? (
                      <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground italic">
                        {value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </td>
                    ) : null;
                    return (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-sm font-semibold"></th>
                        {cr && <th className="py-2 text-right text-sm font-semibold text-muted-foreground italic">N-1</th>}
                        <th className="py-2 text-right text-sm font-semibold">Année 1</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 2</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* CA Marchandises */}
                      <tr
                        className={`border-b border-border/30${caMarchDetail.length ? " cursor-pointer hover:bg-muted/10" : ""}`}
                        onClick={() => { if (caMarchDetail.length) setExpandN1CA(!expandN1CA); }}
                      >
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {caMarchDetail.length > 0 && (expandN1CA ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
                          CA Marchandises
                        </td>
                        <N1Cell value={cr?.caMarchandises ?? 0} />
                        {resultats.caMarhandisesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>)}
                      </tr>
                      {expandN1CA && caMarchDetail.map(l => (
                        <tr key={l.compte} className="border-b border-border/10 bg-muted/5">
                          <td className="py-0.5 pl-8 pr-3 text-xs text-muted-foreground">{l.compte} — {l.intitule}</td>
                          {cr && <td className="py-0.5 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                            {l.montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                          </td>}
                          <td /><td /><td />
                        </tr>
                      ))}
                      {/* CA Services */}
                      <tr
                        className={`border-b border-border/30${caServDetail.length ? " cursor-pointer hover:bg-muted/10" : ""}`}
                        onClick={() => { if (caServDetail.length) setExpandN1Serv(!expandN1Serv); }}
                      >
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {caServDetail.length > 0 && (expandN1Serv ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
                          CA Services
                        </td>
                        <N1Cell value={cr?.caServices ?? 0} />
                        {resultats.caServicesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>)}
                      </tr>
                      {expandN1Serv && caServDetail.map(l => (
                        <tr key={l.compte} className="border-b border-border/10 bg-muted/5">
                          <td className="py-0.5 pl-8 pr-3 text-xs text-muted-foreground">{l.compte} — {l.intitule}</td>
                          {cr && <td className="py-0.5 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                            {l.montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                          </td>}
                          <td /><td /><td />
                        </tr>
                      ))}
                      {/* CA Total */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/10">
                        <td className="py-1.5 pr-3 text-sm">CA Total</td>
                        <N1Cell value={cr?.caTotal ?? 0} />
                        {resultats.caTotalParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>)}
                      </tr>
                      {/* Achats consommés */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Achats consommés</td>
                        <N1Cell value={cr?.achatsConsommes ?? 0} />
                        {resultats.achatsConsommesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>)}
                      </tr>
                      {/* Marge brute */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/10">
                        <td className="py-1.5 pr-3 text-sm">= Marge brute</td>
                        <N1Cell value={cr?.margeBrute ?? 0} />
                        {resultats.margeBruteParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>)}
                      </tr>
                      {/* Charges externes */}
                      <tr className="border-b border-border/30 cursor-pointer hover:bg-muted/10" onClick={() => setExpandChargesExternes(!expandChargesExternes)}>
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {expandChargesExternes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          — Charges externes
                        </td>
                        <N1Cell value={cr?.chargesExternes ?? 0} />
                        {resultats.chargesExternesParAn.map((v, i) => (
                          <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>
                        ))}
                      </tr>
                      {expandChargesExternes && (() => {
                        // Catégories du prévisionnel + prefixes PCG pour mapper les comptes N-1
                        const chargesKeys = [
                          { key: "loyerChargesLocatives",       label: "Loyer / Charges locatives",      n1p: ["613"] },
                          { key: "nettoyageLocaux",             label: "Nettoyage locaux",               n1p: ["614"] },
                          { key: "entretienMaterielVetements",  label: "Entretien / Vêtements",          n1p: ["615"] },
                          { key: "assurances",                  label: "Assurances",                     n1p: ["616"] },
                          { key: "autresAbonnements",           label: "Autres abonnements",             n1p: ["618", "628"] },
                          { key: "expertComptableAvocats",      label: "Expert-comptable / Avocats",     n1p: ["622"] },
                          { key: "budgetPubliciteCommunication",label: "Publicité / Communication",      n1p: ["623"] },
                          { key: "carburantTransports",         label: "Carburant / Transports",         n1p: ["624"] },
                          { key: "fraisDeplacementHebergement", label: "Déplacements / Hébergement",     n1p: ["625"] },
                          { key: "telephoneInternet",           label: "Téléphone / Internet",           n1p: ["626"] },
                          { key: "fraisBancairesTerminalCB",    label: "Frais bancaires / CB",           n1p: ["627"] },
                          { key: "eauElectriciteGaz",           label: "Eau / Électricité / Gaz",        n1p: ["606"] },
                          { key: "fournituresDiverses",         label: "Fournitures diverses",           n1p: [] },
                          { key: "mutuelle",                    label: "Mutuelle",                       n1p: ["647"] },
                        ];
                        // Mapper les comptes N-1 sur les catégories (chaque compte utilisé une seule fois)
                        const usedAccounts = new Set<string>();
                        const n1ByKey: Record<string, number> = {};
                        chargesKeys.forEach(({ key, n1p }) => {
                          let s = 0;
                          chargesExternesDetail.forEach(l => {
                            if (!usedAccounts.has(l.compte) && n1p.some(p => l.compte.startsWith(p))) {
                              s += Math.abs(l.montant);
                              usedAccounts.add(l.compte);
                            }
                          });
                          n1ByKey[key] = s;
                        });
                        // Résiduel N-1 non catégorisé
                        const n1Residuel = chargesExternesDetail.reduce(
                          (s, l) => s + (usedAccounts.has(l.compte) ? 0 : Math.abs(l.montant)), 0
                        );
                        const rows = chargesKeys.map(({ key, label }) => {
                          const vals = (budget.chargesFixes as unknown as Record<string, [number, number, number]>)[key];
                          const n1Val = n1ByKey[key] ?? 0;
                          if (vals[0] === 0 && vals[1] === 0 && vals[2] === 0 && n1Val === 0) return null;
                          return (
                            <tr key={key} className="border-b border-border/20">
                              <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground">{label}</td>
                              {cr && (
                                <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                                  {n1Val > 0 ? n1Val.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : ""}
                                </td>
                              )}
                              {vals.map((v, i) => (
                                <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">{eur(v)}</td>
                              ))}
                            </tr>
                          );
                        }).filter((r): r is React.ReactElement => r !== null);
                        const residuelRow: React.ReactElement[] = n1Residuel > 0 ? [
                          <tr key="n1-residuel" className="border-b border-border/20">
                            <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground italic">Autres charges ext. (N-1 uniquement)</td>
                            {cr && (
                              <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                                {n1Residuel.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                              </td>
                            )}
                            <td /><td /><td />
                          </tr>
                        ] : [];
                        return [...rows, ...residuelRow];
                      })()}
                      {/* Valeur ajoutée */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">= Valeur ajoutée</td>
                        <N1Cell value={cr?.valeurAjoutee ?? 0} />
                        {resultats.valeurAjouteeParAn.map((v, i) => <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>)}
                      </tr>
                      {/* Impôts et taxes */}
                      <tr
                        className={`border-b border-border/30${impotsTaxesDetail.length ? " cursor-pointer hover:bg-muted/10" : ""}`}
                        onClick={() => { if (impotsTaxesDetail.length) setExpandImpotsTaxes(!expandImpotsTaxes); }}
                      >
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {impotsTaxesDetail.length > 0 && (expandImpotsTaxes ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
                          — Impôts et taxes
                        </td>
                        <N1Cell value={cr?.impotsTaxes ?? 0} />
                        {resultats.impotsTaxesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {expandImpotsTaxes && (() => {
                        const it = budget.impotsTaxes ?? { cfe: [0,0,0] as [number,number,number], autreTaxe1: { nom: "", montants: [0,0,0] as [number,number,number] }, autreTaxe2: { nom: "", montants: [0,0,0] as [number,number,number] }, autreTaxe3: { nom: "", montants: [0,0,0] as [number,number,number] } };
                        const usedAccounts = new Set<string>();
                        // CFE = comptes 6311
                        const n1Cfe = impotsTaxesDetail.reduce((s, l) => {
                          if (!usedAccounts.has(l.compte) && l.compte.startsWith("6311")) { usedAccounts.add(l.compte); return s + Math.abs(l.montant); }
                          return s;
                        }, 0);
                        const n1Residuel = impotsTaxesDetail.reduce((s, l) => s + (usedAccounts.has(l.compte) ? 0 : Math.abs(l.montant)), 0);
                        const taxRows = [
                          { label: "CFE", values: it.cfe, n1: n1Cfe },
                          ...(it.autreTaxe1.montants.some(v => v > 0) ? [{ label: it.autreTaxe1.nom || "Autre taxe 1", values: it.autreTaxe1.montants, n1: 0 }] : []),
                          ...(it.autreTaxe2.montants.some(v => v > 0) ? [{ label: it.autreTaxe2.nom || "Autre taxe 2", values: it.autreTaxe2.montants, n1: 0 }] : []),
                          ...(it.autreTaxe3.montants.some(v => v > 0) ? [{ label: it.autreTaxe3.nom || "Autre taxe 3", values: it.autreTaxe3.montants, n1: 0 }] : []),
                        ].filter(r => r.values.some(v => v > 0) || r.n1 > 0);
                        return (
                          <>
                            {taxRows.map((r, idx) => (
                              <tr key={idx} className="border-b border-border/20">
                                <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground">{r.label}</td>
                                {cr && <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                                  {r.n1 > 0 ? r.n1.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : ""}
                                </td>}
                                {(r.values as [number,number,number]).map((v, i) => <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">{eur(v)}</td>)}
                              </tr>
                            ))}
                            {n1Residuel > 0 && (
                              <tr className="border-b border-border/20">
                                <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground italic">Autres taxes (N-1 uniquement)</td>
                                {cr && <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                                  {n1Residuel.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                                </td>}
                                <td /><td /><td />
                              </tr>
                            )}
                          </>
                        );
                      })()}
                      {/* Salaires et charges personnel */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Salaires et charges personnel</td>
                        <N1Cell value={cr?.chargesPersonnel ?? 0} />
                        {resultats.salairesEmployesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v + resultats.chargesSocialesEmployesParAn[i])}</td>)}
                      </tr>
                      <tr className="border-b border-border/20">
                        <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground">dont salaires employés (brut)</td>
                        {cr && <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                          {(() => {
                            const v = personnelDetail.filter(l => l.compte.startsWith("641")).reduce((s, l) => s + Math.abs(l.montant), 0);
                            return v > 0 ? v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "";
                          })()}
                        </td>}
                        {resultats.salairesEmployesParAn.map((v, i) => <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">{eur(v)}</td>)}
                      </tr>
                      <tr className="border-b border-border/20">
                        <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground">dont charges sociales employés</td>
                        {cr && <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                          {(() => {
                            const v = personnelDetail.filter(l => l.compte.startsWith("645")).reduce((s, l) => s + Math.abs(l.montant), 0);
                            return v > 0 ? v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "";
                          })()}
                        </td>}
                        {resultats.chargesSocialesEmployesParAn.map((v, i) => <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">{eur(v)}</td>)}
                      </tr>
                      {/* Rémunération dirigeant */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Rémunération dirigeant</td>
                        {cr && <td />}
                        {resultats.remunerationDirigeantParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Charges sociales dirigeant</td>
                        {cr && <td />}
                        {resultats.chargesSocialesDirigeantParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* EBE */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">= EBE</td>
                        <N1Cell value={cr?.ebe ?? 0} />
                        {resultats.ebeParAn.map((v, i) => <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>)}
                      </tr>
                      {/* Dotations amortissements */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Dotations amortissements</td>
                        <N1Cell value={cr?.dotationsAmortissements ?? 0} />
                        {resultats.dotationsAmortissementsParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* Résultat d'exploitation */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">= Résultat d&apos;exploitation</td>
                        <N1Cell value={cr?.resultatExploitation ?? 0} />
                        {resultats.resultatExploitationParAn.map((v, i) => <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>)}
                      </tr>
                      {/* Charges financières */}
                      {(() => {
                        const prets = budget.financement.prets.filter(p => p.montant > 0 && p.dureeMois > 0);
                        const hasDetail = prets.length > 0 || (cr?.chargesFinancieres ?? 0) > 0;
                        return (
                          <>
                            <tr
                              className={`border-b border-border/30${hasDetail ? " cursor-pointer hover:bg-muted/10" : ""}`}
                              onClick={() => { if (hasDetail) setExpandN1Financieres(!expandN1Financieres); }}
                            >
                              <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                                {hasDetail && (expandN1Financieres ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />)}
                                — Charges financières
                              </td>
                              <N1Cell value={cr?.chargesFinancieres ?? 0} />
                              {resultats.chargesFinancieresParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                            </tr>
                            {expandN1Financieres && (
                              <>
                                {prets.map((p, idx) => {
                                  const an = analysePret(p);
                                  return (
                                    <tr key={idx} className="border-b border-border/20">
                                      <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground">{p.nom || `Prêt ${idx + 1}`} — intérêts</td>
                                      {cr && <td />}
                                      {an.interetsParAn.map((v, i) => <td key={i} className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground">{eur(v)}</td>)}
                                    </tr>
                                  );
                                })}
                                {(cr?.chargesFinancieres ?? 0) > 0 && (
                                  <tr className="border-b border-border/20">
                                    <td className="py-1 pl-8 pr-3 text-xs text-muted-foreground italic">Total intérêts N-1 (balance)</td>
                                    {cr && <td className="py-1 px-2 text-right text-xs tabular-nums text-muted-foreground italic">
                                      {(cr.chargesFinancieres).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                                    </td>}
                                    <td /><td /><td />
                                  </tr>
                                )}
                              </>
                            )}
                          </>
                        );
                      })()}
                      {/* Quote-part subventions invest. */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">+ Quote-part subventions invest.</td>
                        {cr && <td />}
                        {resultats.repriseSubventionsInvestParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* Subventions exploitation */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">+ Subventions d&apos;exploitation</td>
                        {cr && <td />}
                        {resultats.subventionsExploitationParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* Résultat courant */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">= Résultat courant</td>
                        {cr && <td />}
                        {resultats.resultatCourantParAn.map((v, i) => <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>)}
                      </tr>
                      {/* Produits divers / Autres produits N-1 */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">+ Produits divers</td>
                        <N1Cell value={cr?.autresProduits ?? 0} />
                        {resultats.produitsDiversParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* Produits financiers N-1 (76x) */}
                      {(() => {
                        const prodFin = autresProduitsDetail.filter(l => l.compte.startsWith("76"));
                        if (!prodFin.length) return null;
                        const totalN1 = prodFin.reduce((s, l) => s + Math.abs(l.montant), 0);
                        return (
                          <tr className="border-b border-border/30">
                            <td className="py-1.5 pr-3 text-sm">+ Produits financiers</td>
                            {cr && <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground italic">
                              {totalN1.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                            </td>}
                            <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground">—</td>
                            <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground">—</td>
                            <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground">—</td>
                          </tr>
                        );
                      })()}
                      {/* Charges diverses / Autres charges N-1 */}
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">— Charges diverses</td>
                        <N1Cell value={cr?.autresCharges ?? 0} />
                        {resultats.chargesDiversesParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                      {/* Résultat net */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">= Résultat net</td>
                        <N1Cell value={cr?.resultatNet ?? 0} />
                        {resultats.resultatNetParAn.map((v, i) => <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>)}
                      </tr>
                      {/* CAF */}
                      <tr className="border-b border-border/30 font-semibold bg-muted/20">
                        <td className="py-1.5 pr-3 text-sm">Capacité d&apos;autofinancement (CAF)</td>
                        <N1Cell value={cr?.capaciteAutofinancement ?? 0} />
                        {resultats.capaciteAutofinancementParAn.map((v, i) => <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{eur(v)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Plan de financement détaillé */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan de financement</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-sm font-semibold"></th>
                        <th className="py-2 text-right text-sm font-semibold">Année 1</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 2</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* EMPLOIS */}
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="py-2 px-2 text-sm font-bold">EMPLOIS</td>
                      </tr>
                      <tr className="border-b border-border/30 cursor-pointer hover:bg-muted/10" onClick={() => setExpandInvestissements(!expandInvestissements)}>
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {expandInvestissements ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Investissements
                        </td>
                        {[resultats.totalBesoins, 0, 0].map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v > 0 ? eur(v) : ""}</td>
                        ))}
                      </tr>
                      {expandInvestissements && (
                        <>
                          <ResultRow label="    Immobilisations amortissables" values={[resultats.totalImmobilisationsAmortissables, 0, 0]} />
                          {budget.besoins.terrain > 0 && <ResultRow label="    Terrain" values={[budget.besoins.terrain, 0, 0]} />}
                          {budget.besoins.fraisDossier > 0 && <ResultRow label="    Frais de dossier" values={[budget.besoins.fraisDossier, 0, 0]} />}
                          {budget.besoins.fraisNotaireAvocat > 0 && <ResultRow label="    Frais notaire / avocat" values={[budget.besoins.fraisNotaireAvocat, 0, 0]} />}
                          {budget.besoins.cautionDepotGarantie > 0 && <ResultRow label="    Caution / dépôt de garantie" values={[budget.besoins.cautionDepotGarantie, 0, 0]} />}
                          {budget.besoins.stockMatieresProduits > 0 && <ResultRow label="    Stock initial" values={[budget.besoins.stockMatieresProduits, 0, 0]} />}
                          {budget.besoins.tresorerieDépart > 0 && <ResultRow label="    Trésorerie de départ" values={[budget.besoins.tresorerieDépart, 0, 0]} />}
                        </>
                      )}
                      <ResultRow label="Variation BFR" values={resultats.variationBfrParAn} />
                      <ResultRow label="Remboursements emprunts" values={resultats.remboursementsEmpruntParAn} />
                      <ResultRow label="Dividendes" values={budget.divers.dividendes} />
                      <ResultRow label="Remboursements compte courant" values={budget.divers.remboursementsComptesCourants} />
                      <ResultRow label="Total emplois" values={[
                        resultats.totalBesoins + resultats.variationBfrParAn[0] + resultats.remboursementsEmpruntParAn[0]
                          + budget.divers.dividendes[0] + budget.divers.remboursementsComptesCourants[0],
                        resultats.variationBfrParAn[1] + resultats.remboursementsEmpruntParAn[1]
                          + budget.divers.dividendes[1] + budget.divers.remboursementsComptesCourants[1],
                        resultats.variationBfrParAn[2] + resultats.remboursementsEmpruntParAn[2]
                          + budget.divers.dividendes[2] + budget.divers.remboursementsComptesCourants[2],
                      ]} bold />

                      {/* RESSOURCES */}
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="py-2 px-2 text-sm font-bold">RESSOURCES</td>
                      </tr>
                      <tr className="border-b border-border/30 cursor-pointer hover:bg-muted/10" onClick={() => setExpandFinancements(!expandFinancements)}>
                        <td className="py-1.5 pr-3 text-sm flex items-center gap-1">
                          {expandFinancements ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          Financements
                        </td>
                        {[resultats.totalRessources, 0, 0].map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v > 0 ? eur(v) : ""}</td>
                        ))}
                      </tr>
                      {expandFinancements && (
                        <>
                          {budget.financement.apportPersonnel > 0 && <ResultRow label="    Apport personnel" values={[budget.financement.apportPersonnel, 0, 0]} />}
                          {budget.financement.apportsNature > 0 && <ResultRow label="    Apports en nature" values={[budget.financement.apportsNature, 0, 0]} />}
                          {budget.financement.prets.map((p, i) =>
                            p.montant > 0 ? (
                              <ResultRow key={i} label={`    ${p.nom || `Prêt ${i + 1}`}`} values={[p.montant, 0, 0]} />
                            ) : null
                          )}
                          {budget.financement.subventionsInvestissement.map((sub, i) =>
                            sub.montant > 0 ? (
                              <ResultRow key={`si${i}`} label={`    ${sub.nom}`} values={[sub.montant, 0, 0]} />
                            ) : null
                          )}
                          {budget.financement.autreFinancement.montant > 0 && (
                            <ResultRow label={`    ${budget.financement.autreFinancement.nom}`} values={[budget.financement.autreFinancement.montant, 0, 0]} />
                          )}
                        </>
                      )}
                      <ResultRow label="Apports compte courant" values={budget.financement.apportsComptesCourants} />
                      <ResultRow label="CAF" values={resultats.capaciteAutofinancementParAn} />
                      <ResultRow label="Total ressources" values={[
                        resultats.totalRessources + resultats.capaciteAutofinancementParAn[0],
                        resultats.capaciteAutofinancementParAn[1] + budget.financement.apportsComptesCourants[1],
                        resultats.capaciteAutofinancementParAn[2] + budget.financement.apportsComptesCourants[2],
                      ]} bold />

                      {/* SOLDE */}
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="py-2 px-2 text-sm font-bold">SOLDE</td>
                      </tr>
                      <ResultRow label="Variation de trésorerie" values={resultats.variationTresorerieParAn} />
                      <ResultRow label="Trésorerie cumulée" values={resultats.excedentTresorerieParAn} bold />
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* BFR détaillé */}
              <Card>
                <CardHeader>
                  <CardTitle>Besoin en fonds de roulement (BFR)</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-sm font-semibold"></th>
                        <th className="py-2 text-right text-sm font-semibold">Année 1</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 2</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ResultRow label="CA Total" values={resultats.caTotalParAn} />
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm text-muted-foreground">Délai clients</td>
                        <td colSpan={3} className="py-1.5 px-2 text-right text-sm">{budget.bfr.delaiClientsJours} jours</td>
                      </tr>
                      <ResultRow label="Créances clients" values={resultats.creancesClientsParAn} />
                      <ResultRow label="Achats consommés" values={resultats.achatsConsommesParAn} />
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm text-muted-foreground">Délai fournisseurs</td>
                        <td colSpan={3} className="py-1.5 px-2 text-right text-sm">{budget.bfr.delaiFournisseursJours} jours</td>
                      </tr>
                      <ResultRow label="Dettes fournisseurs" values={resultats.dettesFournisseursParAn} />
                      <ResultRow label="BFR (créances − dettes)" values={resultats.bfrParAn} bold />
                      <ResultRow label="Variation du BFR" values={resultats.variationBfrParAn} bold />
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Bilan simplifié */}
              <Card>
                <CardHeader>
                  <CardTitle>Bilan simplifié (grandes masses)</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const bn = budget.balanceNmoins1;
                    // Total actif N-1 (toutes les grandes masses)
                    const actifN1Total = bn
                      ? bn.immobilisationsNettes + bn.stocks + bn.creancesClients + (bn.autresCreances ?? 0) + bn.tresorerie
                      : 0;
                    // Total passif N-1 (CP + provisions + dettes LT + dettes fourn + autres CT)
                    const passifN1Total = bn
                      ? bn.capitauxPropres + (bn.provisions ?? 0) + bn.dettesFinancieresLT + bn.dettesFournisseurs + bn.autresDettesCT
                      : 0;
                    // Helper cellule N-1
                    const N1 = (v: number) => bn ? (
                      <td className="py-1.5 px-2 text-right text-sm tabular-nums text-muted-foreground italic">
                        {v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </td>
                    ) : null;
                    // Helper ligne de bilan
                    const BR = ({ label, n1, values, bold, sub, n1only }: {
                      label: string; n1: number; values?: [number, number, number]; bold?: boolean; sub?: boolean; n1only?: boolean;
                    }) => (
                      <tr className={`border-b border-border/30 ${bold ? "font-semibold bg-muted/20" : ""}`}>
                        <td className={`py-1.5 pr-3 text-sm ${sub ? "pl-5 text-xs text-muted-foreground" : ""}`}>{label}</td>
                        {N1(n1)}
                        {n1only ? (
                          <td colSpan={3} className="py-1.5 px-2 text-xs text-muted-foreground italic text-center">—</td>
                        ) : values ? values.map((v, i) => (
                          <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${sub ? "text-xs text-muted-foreground" : ""} ${v < 0 ? "text-destructive" : ""}`}>
                            {v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                          </td>
                        )) : null}
                      </tr>
                    );
                    const headers = (
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground"></th>
                        {bn && <th className="py-1.5 text-right text-xs font-semibold text-muted-foreground italic">N-1</th>}
                        <th className="py-1.5 text-right text-xs font-semibold">An 1</th>
                        <th className="py-1.5 text-right text-xs font-semibold">An 2</th>
                        <th className="py-1.5 text-right text-xs font-semibold">An 3</th>
                      </tr>
                    );
                    return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ACTIF */}
                    <div>
                      <p className="text-sm font-bold mb-2 text-blue-700 dark:text-blue-400">ACTIF</p>
                      <table className="w-full">
                        <thead>{headers}</thead>
                        <tbody>
                          <BR label="Immobilisations nettes (2x)"
                            n1={bn?.immobilisationsNettes ?? 0}
                            values={resultats.bilanActifImmobilisationsNettes} />
                          <BR label="Stocks (3x)"
                            n1={bn?.stocks ?? 0}
                            values={resultats.bilanActifStocks} />
                          <BR label="Créances clients (41x)"
                            n1={bn?.creancesClients ?? 0}
                            values={resultats.bilanActifCreances} />
                          {bn && (bn.autresCreances ?? 0) > 0 && (
                            <BR label="Autres créances (avances, TVA déd., CCA…)"
                              n1={bn.autresCreances ?? 0}
                              n1only />
                          )}
                          <BR label="Trésorerie (5x)"
                            n1={bn?.tresorerie ?? 0}
                            values={resultats.bilanActifTresorerie} />
                          <BR label="Total Actif"
                            n1={actifN1Total}
                            values={resultats.bilanActifTotal} bold />
                        </tbody>
                      </table>
                    </div>
                    {/* PASSIF */}
                    <div>
                      <p className="text-sm font-bold mb-2 text-purple-700 dark:text-purple-400">PASSIF</p>
                      <table className="w-full">
                        <thead>{headers}</thead>
                        <tbody>
                          <BR label="Capitaux propres (10x-14x)"
                            n1={bn?.capitauxPropres ?? 0}
                            values={resultats.bilanPassifCapitauxPropres} bold />
                          <BR label="dont Capital & Réserves (début)"
                            n1={bn?.capitauxPropres ?? 0}
                            values={resultats.bilanPassifCapitauxPropresBase} sub />
                          <BR label="dont Résultat de l'exercice"
                            n1={bn?.compteResultat.resultatNet ?? 0}
                            values={resultats.resultatNetParAn} sub />
                          {bn && (bn.provisions ?? 0) > 0 && (
                            <BR label="Provisions pour risques (15x)"
                              n1={bn.provisions ?? 0}
                              n1only />
                          )}
                          <BR label="Dettes financières LT (16x)"
                            n1={bn?.dettesFinancieresLT ?? 0}
                            values={resultats.bilanPassifDettesLT} />
                          <BR label="Dettes fournisseurs (40x)"
                            n1={bn?.dettesFournisseurs ?? 0}
                            values={resultats.bilanPassifDettesFournisseurs} />
                          <BR label="Autres dettes CT (social, fiscal, associés…)"
                            n1={bn?.autresDettesCT ?? 0}
                            values={resultats.bilanPassifAutresDettesCT} />
                          <BR label="Total Passif"
                            n1={passifN1Total}
                            values={resultats.bilanPassifTotal} bold />
                        </tbody>
                      </table>
                    </div>
                  </div>
                    );
                  })()}
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Bilan N-1 issu de la balance importée (PCG : 2x immob., 3x stocks, 41x créances clients, 4x autres créances, 5x trésorerie / 10-14x CP, 15x provisions, 16x dettes LT, 40x fourn., 42-49x autres dettes CT). Les colonnes An 1-3 sont les projections prévisionnelles.
                  </p>
                </CardContent>
              </Card>

              {/* Trésorerie mensuelle détaillée */}
              <Card>
                <CardHeader>
                  <CardTitle>Trésorerie mensuelle détaillée — Année 1</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1 pr-2 font-semibold min-w-[160px]"></th>
                          {MOIS_LABELS.map((m) => (
                            <th key={m} className="py-1 text-right text-xs font-medium min-w-[70px]">
                              {m.slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Encaissements dépliable */}
                        <tr className="border-b border-border/30 bg-green-50 dark:bg-green-950/20 cursor-pointer" onClick={() => setExpandEncaissements(!expandEncaissements)}>
                          <td className="py-1 pr-2 font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                            {expandEncaissements ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Encaissements (CA)
                          </td>
                          {resultats.tresorerieMensuelleDetail.encaissements.map((v, i) => (
                            <td key={i} className="py-1 text-right tabular-nums text-xs font-medium text-green-700 dark:text-green-400">{eur(v)}</td>
                          ))}
                        </tr>
                        {expandEncaissements && (
                          <>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">CA Marchandises</td>
                              {budget.chiffreAffaires.marchandises.map((m, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(m.joursTravailes * m.caMoyenParJour)}</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">CA Services</td>
                              {budget.chiffreAffaires.services.map((s, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(s.joursTravailes * s.caMoyenParJour)}</td>
                              ))}
                            </tr>
                          </>
                        )}

                        {/* Total Dépenses dépliable */}
                        <tr className="border-b border-border/30 bg-red-50 dark:bg-red-950/20 cursor-pointer" onClick={() => setExpandDepenses(!expandDepenses)}>
                          <td className="py-1 pr-2 font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                            {expandDepenses ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Total Dépenses
                          </td>
                          {resultats.tresorerieMensuelleDetail.achats.map((_, i) => {
                            const total = resultats.tresorerieMensuelleDetail.achats[i]
                              + resultats.tresorerieMensuelleDetail.chargesFixes[i]
                              + resultats.tresorerieMensuelleDetail.salaires[i]
                              + resultats.tresorerieMensuelleDetail.remboursements[i];
                            return <td key={i} className="py-1 text-right tabular-nums text-xs font-medium text-red-700 dark:text-red-400">{eur(total)}</td>;
                          })}
                        </tr>
                        {expandDepenses && (
                          <>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">Achats consommés</td>
                              {resultats.tresorerieMensuelleDetail.achats.map((v, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(v)}</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">Charges fixes</td>
                              {resultats.tresorerieMensuelleDetail.chargesFixes.map((v, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(v)}</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">Salaires et charges</td>
                              {resultats.tresorerieMensuelleDetail.salaires.map((v, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(v)}</td>
                              ))}
                            </tr>
                            <tr className="border-b border-border/20">
                              <td className="py-0.5 pl-6 pr-2 text-xs text-muted-foreground">Remboursements emprunts</td>
                              {resultats.tresorerieMensuelleDetail.remboursements.map((v, i) => (
                                <td key={i} className="py-0.5 text-right tabular-nums text-xs text-muted-foreground">{eur(v)}</td>
                              ))}
                            </tr>
                          </>
                        )}

                        <tr className="border-b border-border/40 font-medium">
                          <td className="py-1 pr-2">Solde du mois</td>
                          {resultats.tresorerieMensuelleDetail.soldeMensuel.map((v, i) => (
                            <td key={i} className={`py-1 text-right tabular-nums text-xs ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>
                          ))}
                        </tr>
                        <tr className="font-bold bg-muted/30">
                          <td className="py-1.5 pr-2">Trésorerie cumulée</td>
                          {resultats.tresorerieMensuelleDetail.tresorerieCumulee.map((v, i) => (
                            <td key={i} className={`py-1.5 text-right tabular-nums text-xs ${v < 0 ? "text-destructive" : ""}`}>{eur(v)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Seuil de rentabilité (à la fin) */}
              <Card>
                <CardHeader>
                  <CardTitle>Seuil de rentabilité</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-sm font-semibold"></th>
                        <th className="py-2 text-right text-sm font-semibold">Année 1</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 2</th>
                        <th className="py-2 text-right text-sm font-semibold">Année 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ResultRow label="Seuil de rentabilité (€)" values={resultats.seuilRentabiliteParAn} bold />
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">Point mort (jours)</td>
                        {resultats.pointMortJoursParAn.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-right text-sm tabular-nums">{v} j</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-1.5 pr-3 text-sm">CA réalisé</td>
                        {resultats.caTotalParAn.map((v, i) => (
                          <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums ${v >= resultats.seuilRentabiliteParAn[i] ? "text-green-600" : "text-destructive"}`}>
                            {eur(v)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-3 text-sm">Marge de sécurité</td>
                        {resultats.caTotalParAn.map((v, i) => {
                          const marge = v - resultats.seuilRentabiliteParAn[i];
                          return (
                            <td key={i} className={`py-1.5 px-2 text-right text-sm tabular-nums font-medium ${marge >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {eur(marge)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>

    {/* Dialog — Inviter un client */}
    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-600" />
            Inviter {clientNom || "le client"} à compléter son dossier
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            Partagez ce lien avec votre client. Il pourra ouvrir le dossier sur son propre
            appareil, le compléter, puis vous renvoyer ses réponses en un clic.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={inviteUrl}
              className="text-xs font-mono bg-muted"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 3000);
              }}
            >
              {inviteCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {inviteCopied ? "Copié !" : "Copier"}
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground flex flex-col gap-1">
            <p>📋 <strong>Étape 1 :</strong> Copiez et envoyez ce lien à votre client (email, WhatsApp…)</p>
            <p>✏️ <strong>Étape 2 :</strong> Le client remplit son dossier sur son appareil</p>
            <p>🔄 <strong>Étape 3 :</strong> Ses modifications apparaissent <strong>en temps réel</strong> dans votre tableau — ici même !</p>
          </div>
          {budget.infos.email && (
            <Button
              className="gap-2 w-full"
              onClick={() => {
                const subject = encodeURIComponent(`Votre dossier prévisionnel — ${budget.infos.intituleProjet || budget.infos.prenomNom}`);
                const body = encodeURIComponent(
                  `Bonjour,\n\nJe vous invite à compléter votre dossier prévisionnel en cliquant sur le lien ci-dessous :\n\n${inviteUrl}\n\nVos modifications seront synchronisées automatiquement.\n\nCordialement`
                );
                window.open(`mailto:${budget.infos.email}?subject=${subject}&body=${body}`);
              }}
            >
              <Send className="h-4 w-4" />
              Ouvrir dans ma messagerie
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Supprimé : dialog "Envoyer mes réponses" — remplacé par sync temps réel Supabase */}
  </>
  );
}
