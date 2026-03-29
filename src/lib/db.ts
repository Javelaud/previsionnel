/**
 * Supabase DB utilities — synchronisation des budgets prévisionnels
 *
 * Table `budgets` :
 *   id           text PRIMARY KEY
 *   client_id    text NOT NULL
 *   data         jsonb NOT NULL   (budget complet)
 *   share_token  text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
 *   updated_at   timestamptz DEFAULT now()
 */

import { supabase, supabaseConfigured } from "./supabase";
import type { BudgetPrevisionnel } from "@/data/previsionnel/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

/**
 * Enregistre (ou met à jour) un budget dans Supabase.
 * Retourne le share_token généré automatiquement lors de la première insertion.
 */
export async function upsertBudget(
  budget: BudgetPrevisionnel
): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        id: budget.id,
        client_id: budget.clientId,
        data: budget,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("share_token")
    .single();

  if (error) {
    console.error("[Supabase] upsert error:", error.message);
    return null;
  }
  return data?.share_token ?? null;
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

/** Charge un budget depuis Supabase par son ID. */
export async function fetchBudgetById(
  budgetId: string
): Promise<BudgetPrevisionnel | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("budgets")
    .select("data")
    .eq("id", budgetId)
    .single();

  if (error || !data) return null;
  return data.data as BudgetPrevisionnel;
}

/**
 * Charge un budget depuis Supabase via son share_token.
 * Utilisé par le client qui ouvre le lien d'invitation.
 */
export async function fetchBudgetByToken(token: string): Promise<{
  budget: BudgetPrevisionnel;
  clientId: string;
  shareToken: string;
} | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from("budgets")
    .select("data, client_id, share_token")
    .eq("share_token", token)
    .single();

  if (error || !data) return null;
  return {
    budget: data.data as BudgetPrevisionnel,
    clientId: data.client_id as string,
    shareToken: data.share_token as string,
  };
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * S'abonne aux modifications d'un budget.
 * Appelle `onUpdate` chaque fois que le budget est modifié par quelqu'un d'autre.
 * Retourne le channel Supabase (pour se désabonner via supabase.removeChannel()).
 */
export function subscribeToBudget(
  budgetId: string,
  onUpdate: (budget: BudgetPrevisionnel) => void
): RealtimeChannel | null {
  if (!supabaseConfigured) return null;
  return supabase
    .channel(`budget_${budgetId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "budgets",
        filter: `id=eq.${budgetId}`,
      },
      (payload) => {
        const newData = (payload.new as { data: BudgetPrevisionnel }).data;
        if (newData) onUpdate(newData);
      }
    )
    .subscribe();
}
