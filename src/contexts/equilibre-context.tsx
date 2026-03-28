"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface EquilibreData {
  totalEmplois: number
  totalRessources: number
  tresorerieAn1: number
}

const EquilibreContext = createContext<{
  data: EquilibreData | null
  setData: (d: EquilibreData | null) => void
}>({ data: null, setData: () => {} })

export function EquilibreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EquilibreData | null>(null)
  return (
    <EquilibreContext.Provider value={{ data, setData }}>
      {children}
    </EquilibreContext.Provider>
  )
}

export function useEquilibre() {
  return useContext(EquilibreContext)
}
