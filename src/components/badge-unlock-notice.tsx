"use client"

import { useEffect, useState } from "react"
import { badgeById, isBadgeId, type BadgeId } from "@/lib/kitchen/badges"
import { subscribeBadges } from "@/lib/kitchen/badges-client"
import { Button } from "@/components/ui/button"

export function BadgeUnlockNotice() {
  const [queue, setQueue] = useState<BadgeId[]>([])
  const current = queue[0] && isBadgeId(queue[0]) ? badgeById(queue[0]) : null

  useEffect(() => {
    return subscribeBadges((update) => {
      if (update.type !== "grant" || !isBadgeId(update.id)) return
      setQueue((items) => (items.includes(update.id) ? items : [...items, update.id]))
    })
  }, [])

  useEffect(() => {
    if (!current) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setQueue((items) => items.slice(1))
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [current])

  if (!current) return null

  function dismiss() {
    setQueue((items) => items.slice(1))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Zavřít" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">ODZNAK</p>
        <img src={current.src} alt="" className="mx-auto mt-4 size-24 rounded-full object-cover" />
        <h2 className="mt-4 font-heading text-2xl">{current.title}</h2>
        <p className="mt-2 text-base text-muted-foreground">{current.description}</p>
        <Button type="button" className="mt-6 w-full" onClick={dismiss}>
          Beru
        </Button>
      </div>
    </div>
  )
}
