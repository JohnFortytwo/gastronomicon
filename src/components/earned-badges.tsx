"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { earnedBadgeIds, HEADER_BADGE_LIMIT, sampleBadges, type BadgeId } from "@/lib/kitchen/badges"
import { loadUserBadges, subscribeBadges } from "@/lib/kitchen/badges-client"

export function EarnedBadges() {
  const [owned, setOwned] = useState<BadgeId[]>([])
  const [featured, setFeatured] = useState<BadgeId | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadUserBadges().then((loaded) => {
      if (!cancelled) setOwned(earnedBadgeIds(loaded))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return subscribeBadges((update) => {
      if (update.type === "reset") {
        setOwned([])
        setFeatured(null)
        return
      }
      if (update.type === "sync") {
        setFeatured(null)
        setOwned(earnedBadgeIds(update.earned))
        return
      }
      setFeatured(update.id)
      setOwned((current) => (current.includes(update.id) ? current : [...current, update.id]))
    })
  }, [])

  const visible = useMemo(() => sampleBadges(owned, HEADER_BADGE_LIMIT, featured), [owned, featured])

  if (visible.length === 0) return null

  return (
    <div className="flex items-center justify-end gap-2">
      {visible.map((badge) => (
        <Link
          key={badge.id}
          href="/odznaky"
          title={badge.title}
          aria-label={badge.title}
          className="group relative inline-flex size-11 items-center justify-center rounded-full"
        >
          <img src={badge.src} alt="" className="size-9 rounded-full object-cover" />
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full right-0 z-30 mt-2 hidden whitespace-nowrap rounded-lg border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg group-hover:block group-focus-within:block"
          >
            {badge.title}
          </span>
        </Link>
      ))}
    </div>
  )
}
