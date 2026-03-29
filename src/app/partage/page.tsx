"use client";

/**
 * Page /partage — landing client
 *
 * Flow :
 * 1. Le conseiller génère un lien "Inviter un client" → URL contenant le dossier encodé (?d=...)
 * 2. Le client ouvre ce lien → cette page décode les données
 * 3. Les données sont sauvegardées dans le localStorage du client
 * 4. Le client est redirigé vers le prévisionnel normal (/previsionnel/[clientId])
 * 5. Dans le prévisionnel, un bouton "Envoyer mes réponses" génère un lien de retour
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeBudget } from "@/lib/share";
import { saveClient, saveBudget, getClient } from "@/data/previsionnel/storage";
import type { Client } from "@/data/previsionnel/types";

function PartageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nomClient, setNomClient] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const d = searchParams.get("d");
    if (!d) { setStatus("error"); return; }
    const budget = decodeBudget(d);
    if (!budget) { setStatus("error"); return; }
    setNomClient(budget.infos.prenomNom || budget.infos.intituleProjet || "votre dossier");
    setToken(d);
    setStatus("ready");
  }, [searchParams]);

  function handleCommencer() {
    if (!token) return;
    const budget = decodeBudget(token);
    if (!budget) return;

    // Créer le client dans le localStorage si absent
    if (!getClient(budget.clientId)) {
      const client: Client = {
        id: budget.clientId,
        nom: budget.infos.prenomNom || budget.infos.intituleProjet || "Client",
        email: budget.infos.email || "",
        telephone: budget.infos.telephone || "",
        dateCreation: new Date().toISOString(),
      };
      saveClient(client);
    }

    // Sauvegarder le budget dans le localStorage du client
    saveBudget(budget);

    // Marquer comme "mode client" pour afficher le bouton "Envoyer mes réponses"
    sessionStorage.setItem(`client_mode_${budget.id}`, "1");

    // Rediriger vers le prévisionnel
    router.push(`/previsionnel/${budget.clientId}`);
  }

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
            Ce lien semble invalide ou expiré. Demandez un nouveau lien à votre conseiller.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6">
      <div className="max-w-lg w-full">
        <div className="bg-card rounded-2xl shadow-xl border p-8 flex flex-col gap-6">
          <div className="text-center">
            <div className="text-5xl mb-3">📋</div>
            <h1 className="text-2xl font-bold tracking-tight">Votre dossier prévisionnel</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Votre conseiller vous invite à compléter{" "}
              <span className="font-medium text-foreground">{nomClient}</span>.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 flex flex-col gap-2 text-sm text-muted-foreground">
            <p>✅ Votre dossier sera chargé sur <strong>cet appareil</strong>.</p>
            <p>✅ Vous pouvez remplir le formulaire à votre rythme.</p>
            <p>✅ Une fois terminé, envoyez vos réponses à votre conseiller en un clic.</p>
            <p className="text-xs mt-1 border-t pt-2">
              ⚠️ Les données sont stockées localement. N&apos;effacez pas votre historique
              de navigation avant d&apos;avoir envoyé vos réponses.
            </p>
          </div>

          <button
            onClick={handleCommencer}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Commencer à remplir mon dossier →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PartagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    }>
      <PartageContent />
    </Suspense>
  );
}
