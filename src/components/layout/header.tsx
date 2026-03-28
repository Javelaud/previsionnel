"use client"

import { MobileSidebar } from "./sidebar"

export function Header({ title, description }: { title: string; description?: string }) {
  return (
    <header className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl border-b">
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <div>
            <h1 className="text-xl font-bold md:text-2xl tracking-tight">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
