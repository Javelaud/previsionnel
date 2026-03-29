"use client";

/**
 * Page /importer — import des réponses client par le conseiller
 *
 * Flow :
 * 1. Le client clique "Envoyer mes réponses" → lien /importer?d=[encoded]
 * 2. Le conseiller ouvre ce lien → cette page décode et affiche un aperçu
 * 3. Le conseiller confirme → le budget est importé dans son localStorage
 * 4. Redirection vers le prévisionnel mis à jour
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeBudget } from "@/lib/share";
import { saveClient, saveBudget, getClient } from "@/data/previsionnel/storage";
import type { BudgetPrevisionnel, Client } from "@/data/previsionnel/types";

function ImporterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "imported">("loading");
  const [budget, setBudget] = useState<BudgetPrevisionnel | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const d = searchParams.get("d");
    if (!d) { setStatus("error"); return; }
    const b = decodeBudget(d);
    if (!b) { setStatus("error"); return; }
    setBudget(b);
    setToken(d);
    setStatus("ready");
  }, [searchParams]);

  function handleImporter() {
    if (!budget || !token) return;
    const b = decodeBudget(token);
    if (!b) return;

    // Créer ou mettre à jour le client
    if (!getClient(b.clientId)) {
      const client: Client = {
        id: b.clientId,
        nom: b.infos.prenomNom || b.infos.intituleProjet || "Client",
        email: b.infos.email || "",
        telephone: b.infos.telephone || "",
        dateCreation: new Date().toISOString(),
      };
      saveClient(client);
    }

    // Sauvegarder le budget mis à jour
    saveBudget(b);

    setStatus("imported");
    setTimeout(() => router.push(`/previsionnel/${b.clientId}`), 1500);
  }

  const eur = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement en cours…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
          <p className="text-muted-foreground text-sm">
            Ce lien de réponses semble invalide ou corrompu.
          </p>
        </div>
      </div>
    );
  }

  if (status === "imported") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">Réponses importées !</h1>
          <p className="text-muted-foreground text-sm">Redirection vers le dossier…</p>
        </div>
      </div>
    );
  }

  const cr = budget?.compteResultat;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6">
      <div className="max-w-lg w-full">
        <div className="bg-card rounded-2xl shadow-xl border p-8 flex flex-col gap-6">
          <div className="text-center">
            <div className="text-5xl mb-3">📥</div>
            <h1 className="text-2xl font-bold tracking-tight">Réponses client reçues</h1>
            <p className="text-muted-foreground text-sm mt-2">
              <span className="font-medium text-foreground">
                {budget?.infos.prenomNom || budget?.infos.intituleProjet || "Client"}
              </span>{" "}
              a complété son dossier prévisionnel.
            </p>
          </div>

          {/* Aperçu synthétique */}
          {budget && (
            <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Aperçu</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Statut juridique</p>
                  <p className="font-medium">{budget.infos.statutJuridique}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Activité</p>
                  <p className="font-medium">{budget.infos.activite || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{budget.infos.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ville</p>
                  <p className="font-medium">{budget.infos.ville || "—"}</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-1">
                <p className="text-xs text-muted-foreground mb-1">CA An 1 (estimé)</p>
                <p className="font-semibold text-base">
                  {/* Calcul rapide CA = somme des 12 mois */}
                  {eur(
                    [...budget.chiffreAffaires.marchandises, ...budget.chiffreAffaires.services]
                      .reduce((s, m) => s + m.joursTravailes * m.caMoyenParJour, 0)
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ Cette action remplacera le dossier existant pour ce client dans votre espace.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleImporter}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              Importer les réponses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImporterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    }>
      <ImporterContent />
    </Suspense>
  );
}
