/**
 * Utilitaires de partage de dossier prévisionnel par lien URL.
 *
 * Le budget est sérialisé en JSON, compressé, puis encodé en base64url.
 * Les détails de lignes de balance (balanceNmoins1.detailLignes) sont exclus
 * pour alléger l'URL.
 */

import type { BudgetPrevisionnel } from "@/data/previsionnel/types";

function toBase64url(str: string): string {
  if (typeof btoa === "undefined") return "";
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const s = pad ? padded + "=".repeat(4 - pad) : padded;
  return decodeURIComponent(escape(atob(s)));
}

/**
 * Encode un budget en token URL-safe.
 * Exclut les détails de lignes de la balance (trop volumineux).
 */
export function encodeBudget(budget: BudgetPrevisionnel): string {
  const slim: BudgetPrevisionnel = {
    ...budget,
    balanceNmoins1: budget.balanceNmoins1
      ? { ...budget.balanceNmoins1, detailLignes: undefined }
      : undefined,
  };
  return toBase64url(JSON.stringify(slim));
}

/**
 * Décode un token URL en budget. Retourne null si invalide.
 */
export function decodeBudget(token: string): BudgetPrevisionnel | null {
  try {
    return JSON.parse(fromBase64url(token)) as BudgetPrevisionnel;
  } catch {
    return null;
  }
}

/**
 * Construit le lien d'invitation client (page /partage).
 */
export function buildInviteUrl(budget: BudgetPrevisionnel, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/partage?d=${encodeBudget(budget)}`;
}

/**
 * Construit le lien de renvoi des réponses client (page /importer).
 */
export function buildReponseUrl(budget: BudgetPrevisionnel, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/importer?d=${encodeBudget(budget)}`;
}
