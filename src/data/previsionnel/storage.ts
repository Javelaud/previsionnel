import { BudgetPrevisionnel, Client } from "./types";
import { createDefaultBudget } from "./defaults";

const CLIENTS_KEY = "previsionnel_clients";
const BUDGETS_KEY = "previsionnel_budgets";

// Nettoyage des anciennes données incompatibles
const SCHEMA_VERSION_KEY = "previsionnel_schema_v";
const CURRENT_SCHEMA = "4";
if (typeof window !== "undefined" && localStorage.getItem(SCHEMA_VERSION_KEY) !== CURRENT_SCHEMA) {
  localStorage.removeItem(CLIENTS_KEY);
  localStorage.removeItem(BUDGETS_KEY);
  localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA);
}

// --- Clients ---

export function getClients(): Client[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CLIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function saveClient(client: Client): void {
  const clients = getClients();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    clients[idx] = client;
  } else {
    clients.push(client);
  }
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function deleteClient(id: string): void {
  const clients = getClients().filter((c) => c.id !== id);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  // Supprimer aussi les budgets associés
  const budgets = getAllBudgets().filter((b) => b.clientId !== id);
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

// --- Budgets ---

export function getAllBudgets(): BudgetPrevisionnel[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(BUDGETS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getBudgetsForClient(clientId: string): BudgetPrevisionnel[] {
  return getAllBudgets().filter((b) => b.clientId === clientId);
}

export function getBudget(id: string): BudgetPrevisionnel | undefined {
  return getAllBudgets().find((b) => b.id === id);
}

export function saveBudget(budget: BudgetPrevisionnel): void {
  const budgets = getAllBudgets();
  const idx = budgets.findIndex((b) => b.id === budget.id);
  budget.dateMiseAJour = new Date().toISOString();
  if (idx >= 0) {
    budgets[idx] = budget;
  } else {
    budgets.push(budget);
  }
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function deleteBudget(id: string): void {
  const budgets = getAllBudgets().filter((b) => b.id !== id);
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

export function createNewBudget(clientId: string): BudgetPrevisionnel {
  const budget = createDefaultBudget(clientId);
  saveBudget(budget);
  return budget;
}
