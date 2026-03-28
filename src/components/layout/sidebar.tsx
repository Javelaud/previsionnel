"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calculator, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useState } from "react"
import { useEquilibre } from "@/contexts/equilibre-context"

function eur(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

function EquilibreWidget() {
  const { data } = useEquilibre()
  if (!data) return null
  return (
    <div className="p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[10px] font-bold text-sidebar-foreground/60 uppercase tracking-widest">Financement An 1</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sidebar-foreground/50 text-xs">Emplois</span>
          <span className="font-semibold tabular-nums text-xs text-sidebar-foreground">{eur(data.totalEmplois)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sidebar-foreground/50 text-xs">Ressources</span>
          <span className="font-semibold tabular-nums text-xs text-sidebar-foreground">{eur(data.totalRessources)}</span>
        </div>
        <div className="h-px bg-sidebar-border" />
        <div className={cn(
          "flex justify-between items-center font-bold text-sm",
          data.tresorerieAn1 < 0 ? "text-red-400" : "text-emerald-400"
        )}>
          <span>Trésorerie</span>
          <span className="tabular-nums">{eur(data.tresorerieAn1)}</span>
        </div>
      </div>
    </div>
  )
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/previsionnel", label: "Prévisionnel", icon: Calculator },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4.5 w-4.5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-[260px] flex-col bg-sidebar sticky top-0">
      {/* Logo */}
      <div className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">FinPrévi</h1>
            <p className="text-[11px] text-sidebar-foreground/40">Gestion prévisionnelle</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <p className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest mb-3 px-3.5">Menu</p>
        <NavLinks />
      </div>

      {/* Widget */}
      <div className="p-4 space-y-4">
        <EquilibreWidget />
        <p className="text-[10px] text-sidebar-foreground/25 text-center font-medium">FinPrévi v1.0</p>
      </div>
    </aside>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
        <div className="p-5 pb-6">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-sidebar-foreground">FinPrévi</span>
              <p className="text-[11px] text-sidebar-foreground/40 font-normal">Gestion prévisionnelle</p>
            </div>
          </SheetTitle>
        </div>
        <div className="px-4">
          <p className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest mb-3 px-3.5">Menu</p>
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
