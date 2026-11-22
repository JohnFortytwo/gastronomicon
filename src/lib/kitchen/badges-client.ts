"use client"

import { createClient } from "@/lib/supabase/client"
import {
  badgeStorageShape,
  earnedBadgeIds,
  isBadgeId,
  parseEarnedBadges,
  serializeEarnedBadges,
  type BadgeId,
  type BadgeStorageShape,
  type EarnedBadges,
} from "@/lib/kitchen/badges"

type BadgeUpdate =
  | { type: "grant"; id: BadgeId; earnedAt: string }
  | { type: "reset" }
  | { type: "sync"; earned: EarnedBadges }

const listeners = new Set<(update: BadgeUpdate) => void>()
const pendingGrants = new Map<BadgeId, string>()

let known: EarnedBadges | null = null
let resetEpoch = 0

function remember(earned: EarnedBadges) {
  known = { ...earned }
}

function snapshotKnown(): EarnedBadges {
  return { ...(known ?? {}) }
}

export function subscribeBadges(listener: (update: BadgeUpdate) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function announceBadge(id: BadgeId, earnedAt: string) {
  const at = Number.isNaN(Date.parse(earnedAt)) ? new Date().toISOString() : new Date(earnedAt).toISOString()
  const already = Boolean(known?.[id])
  pendingGrants.set(id, at)
  if (!known) known = {}
  if (!known[id]) known[id] = at
  if (already) return
  listeners.forEach((listener) => listener({ type: "grant", id, earnedAt: at }))
}

export async function loadUserBadges(): Promise<EarnedBadges> {
  const epoch = resetEpoch
  const supabase = createClient()
  const { data, error: userError } = await supabase.auth.getUser()

  if (userError || !data.user || epoch !== resetEpoch) {
    return snapshotKnown()
  }

  const { data: profile, error } = await supabase
    .from("kitchen_profiles")
    .select("badges")
    .eq("id", data.user.id)
    .maybeSingle()

  if (epoch !== resetEpoch) return snapshotKnown()
  if (error) return snapshotKnown()

  const loaded = parseEarnedBadges(profile?.badges)
  for (const [id, earnedAt] of pendingGrants) {
    if (!loaded[id]) loaded[id] = earnedAt
  }
  pendingGrants.clear()
  remember(loaded)
  return loaded
}

export async function grantOwnBadge(id: BadgeId) {
  if (!isBadgeId(id) || known?.[id]) {
    return { ok: true as const, granted: false }
  }

  const supabase = createClient()
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError || !data.user) {
    return { ok: false as const, error: "Pro odznak se musíte přihlásit." }
  }

  const { data: profile, error: readError } = await supabase
    .from("kitchen_profiles")
    .select("badges")
    .eq("id", data.user.id)
    .maybeSingle()

  if (readError || !profile) {
    return { ok: false as const, error: "Odznak se nepodařilo uložit." }
  }

  const owned = parseEarnedBadges(profile.badges)
  if (owned[id]) {
    remember(owned)
    return { ok: true as const, granted: false }
  }

  const earnedAt = new Date().toISOString()
  const earned: EarnedBadges = { ...owned, [id]: earnedAt }
  const shape: BadgeStorageShape = badgeStorageShape(profile.badges)
  const { error } = await supabase
    .from("kitchen_profiles")
    .update({ badges: serializeEarnedBadges(earned, shape) as Record<string, string> | string[] })
    .eq("id", data.user.id)

  if (error) {
    return { ok: false as const, error: "Odznak se nepodařilo uložit." }
  }

  announceBadge(id, earnedAt)
  remember(earned)
  return { ok: true as const, granted: true }
}

export function earnedCount(earned: EarnedBadges) {
  return earnedBadgeIds(earned).length
}
