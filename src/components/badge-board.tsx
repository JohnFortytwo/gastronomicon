"use client"

import { useEffect, useState } from "react"
import { BADGES, formatEarnedAt, type EarnedBadges } from "@/lib/kitchen/badges"
import { loadUserBadges, subscribeBadges } from "@/lib/kitchen/badges-client"

export function BadgeBoard() {
  const [owned, setOwned] = useState<EarnedBadges | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadUserBadges().then((loaded) => {
      if (!cancelled) setOwned(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeBadges((update) => {
      if (update.type === "reset") {
        setOwned({})
        return
      }
      if (update.type === "sync") {
        setOwned(update.earned)
        return
      }
      setOwned((current) => {
        const earned = current ?? {}
        if (earned[update.id]) return earned
        return { ...earned, [update.id]: update.earnedAt }
      })
    })
  }, [])

  const earned = owned ? BADGES.filter((badge) => owned[badge.id]) : []

  if (owned === null) {
    return <p className="text-base text-muted-foreground">Načítám odznaky…</p>
  }

  if (BADGES.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-base leading-7">
          Odznaky kuchyně zatím nemají pravidla. Až je doplníme, nasbírané se ukážou tady a také vpravo nahoře pod jménem.
        </p>
      </div>
    )
  }

  if (earned.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-base leading-7">Zatím žádný odznak.</p>
        <p className="mt-2 text-sm text-muted-foreground">Ve hře je {BADGES.length} odznaků.</p>
      </div>
    )
  }

  return (
    <ul className="grid gap-3">
      {earned.map((badge) => (
        <li key={badge.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <img src={badge.src} alt="" className="size-16 rounded-full object-cover" />
          <div>
            <p className="font-heading text-xl">{badge.title}</p>
            <p className="mt-1 text-base text-muted-foreground">{badge.description}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatEarnedAt(owned?.[badge.id] ?? "")}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
