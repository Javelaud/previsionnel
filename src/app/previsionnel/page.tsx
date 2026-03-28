"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, FolderOpen, Users } from "lucide-react";
import {
  getClients,
  saveClient,
  deleteClient,
  getBudgetsForClient,
} from "@/data/previsionnel/storage";
import { Client } from "@/data/previsionnel/types";
import { motion } from "framer-motion"

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PrevisionnelPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [budgetCounts, setBudgetCounts] = useState<Record<string, number>>({});

  const [form, setForm] = useState({ nom: "", email: "", telephone: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setMounted(true);
    const loaded = getClients();
    setClients(loaded);
    const counts: Record<string, number> = {};
    for (const client of loaded) {
      counts[client.id] = getBudgetsForClient(client.id).length;
    }
    setBudgetCounts(counts);
  }, []);

  const filteredClients = clients.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  function handleOpenDialog() {
    setForm({ nom: "", email: "", telephone: "" });
    setFormError("");
    setDialogOpen(true);
  }

  function handleCreateClient() {
    if (!form.nom.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    const newClient: Client = {
      id: generateId(),
      nom: form.nom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      dateCreation: new Date().toISOString(),
    };
    saveClient(newClient);
    const updated = getClients();
    setClients(updated);
    setBudgetCounts((prev) => ({ ...prev, [newClient.id]: 0 }));
    setDialogOpen(false);
  }

  function handleDelete(clientId: string) {
    deleteClient(clientId);
    const updated = getClients();
    setClients(updated);
    setBudgetCounts((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
    setDeleteConfirmId(null);
  }

  return (
    <>
      <motion.div
        className="flex flex-col gap-6 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Budget Prévisionnel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les prévisionnels financiers de vos clients
            </p>
          </div>
          <Button onClick={handleOpenDialog} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 text-white border-0">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm hover:shadow-lg shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 border">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total clients</p>
              <div className="rounded-xl p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{clients.length}</p>
            <p className="text-xs text-muted-foreground mt-1.5">clients enregistrés</p>
          </div>
        </div>

        {/* Search + Table */}
        <Card className="shadow-sm rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Liste des clients</CardTitle>
            <CardDescription>
              {filteredClients.length} client
              {filteredClients.length !== 1 ? "s" : ""} affiché
              {filteredClients.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-center">Budgets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        Aucun client trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          {client.nom}
                        </TableCell>
                        <TableCell>{client.email || "—"}</TableCell>
                        <TableCell>{client.telephone || "—"}</TableCell>
                        <TableCell>{formatDate(client.dateCreation)}</TableCell>
                        <TableCell className="text-center">
                          {budgetCounts[client.id] ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/previsionnel/${client.id}`)
                              }
                            >
                              <FolderOpen className="mr-1 h-3.5 w-3.5" />
                              Ouvrir
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteConfirmId(client.id)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialog — nouveau client */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nom">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nom"
                placeholder="Nom du client"
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.fr"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                placeholder="06 00 00 00 00"
                value={form.telephone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telephone: e.target.value }))
                }
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateClient}>Créer le client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — confirmation suppression */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Cette action supprimera définitivement le client et tous ses
            budgets prévisionnels associés. Cette opération est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
