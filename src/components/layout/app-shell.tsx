"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Toaster } from "@/components/ui/sonner"
import { EquilibreProvider } from "@/contexts/equilibre-context"

// Routes sur lesquelles la sidebar ne doit jamais apparaître (pages publiques / client)
const NO_SIDEBAR_PREFIXES = ["/partage", "/importer"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    // Masquer sur les routes publiques
    const isPublicRoute = NO_SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p))

    // Masquer si le visiteur est en mode client (flag posé par la page /partage)
    const isClientMode =
      typeof window !== "undefined" &&
      sessionStorage.getItem("previsionnel_client_mode") === "1"

    setShowSidebar(!isPublicRoute && !isClientMode)
  }, [pathname])

  return (
    <EquilibreProvider>
      <div className="flex h-screen overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </div>
    </EquilibreProvider>
  )
}
