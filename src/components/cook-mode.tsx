"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type CookModeValue = {
  cookMode: boolean
  setCookMode: (value: boolean) => void
}

const CookModeContext = createContext<CookModeValue | null>(null)

export function CookModeProvider({ children }: { children: ReactNode }) {
  const [cookMode, setCookMode] = useState(false)
  const value = useMemo(() => ({ cookMode, setCookMode }), [cookMode])
  return <CookModeContext.Provider value={value}>{children}</CookModeContext.Provider>
}

export function useCookMode() {
  const value = useContext(CookModeContext)
  if (!value) {
    throw new Error("Režim vaření je dostupný jen uvnitř kuchyňského rámu.")
  }
  return value
}
