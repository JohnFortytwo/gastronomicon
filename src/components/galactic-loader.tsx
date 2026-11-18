"use client"

import { useEffect, useState } from "react"
import { LOADING_MESSAGES } from "@/lib/kitchen/constants"

export function GalacticLoader() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % LOADING_MESSAGES.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 py-10 text-center" role="status">
      <span className="font-mono text-xs tracking-[0.35em] text-primary">42</span>
      <p className="max-w-xs text-base text-muted-foreground">{LOADING_MESSAGES[index]}</p>
    </div>
  )
}
