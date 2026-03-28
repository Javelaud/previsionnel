"use client"

import { Sidebar } from "./sidebar"
import { Toaster } from "@/components/ui/sonner"
import { EquilibreProvider } from "@/contexts/equilibre-context"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <EquilibreProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </div>
    </EquilibreProvider>
  )
}
