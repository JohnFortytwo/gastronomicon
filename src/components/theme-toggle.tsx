"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const dark = hydrated && resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={dark ? "Přepnout na denní vaření" : "Přepnout na večerní plánování"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
