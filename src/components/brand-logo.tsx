"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function BrandLogo() {
  const { resolvedTheme } = useTheme()
  const hydrated = useHydrated()
  const dark = hydrated && resolvedTheme === "dark"
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className="font-heading text-xl leading-none">Gastronomicon</span>
  }

  return (
    <img
      src={dark ? "/LOGO-dark.jpg" : "/LOGO-light.jpg"}
      alt="Gastronomicon"
      className="h-10 w-auto max-w-[46vw] object-contain object-left"
      onError={() => setFailed(true)}
    />
  )
}
