export const BADGE_IDS = [] as const

type ListedBadgeId = (typeof BADGE_IDS)[number]
export type BadgeId = [ListedBadgeId] extends [never] ? string : ListedBadgeId

export type Badge = {
  id: BadgeId
  src: string
  title: string
  description: string
}

export const HEADER_BADGE_LIMIT = 4

export const BADGES: readonly Badge[] = []

const BADGE_ID_SET = new Set<string>(BADGE_IDS)

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === "string" && BADGE_ID_SET.has(value)
}

export function badgeById(id: BadgeId): Badge {
  const badge = BADGES.find((item) => item.id === id)
  if (!badge) {
    throw new Error(`Neznámý odznak ${id}.`)
  }
  return badge
}

export type EarnedBadges = Partial<Record<BadgeId, string>>

export type BadgeStorageShape = "map" | "list"

function isEarnedAt(value: string) {
  return !Number.isNaN(Date.parse(value))
}

export function badgeStorageShape(value: unknown): BadgeStorageShape {
  return Array.isArray(value) ? "list" : "map"
}

export function serializeEarnedBadges(earned: EarnedBadges, shape: BadgeStorageShape) {
  if (shape === "map") return earned
  return earnedBadgeIds(earned).map((id) => `${id}|${earned[id]}`)
}

export function parseEarnedBadges(value: unknown): EarnedBadges {
  const earned: EarnedBadges = {}

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") continue
      const pipe = item.indexOf("|")
      if (pipe <= 0) continue
      const id = item.slice(0, pipe)
      const at = item.slice(pipe + 1)
      if (!isBadgeId(id) || !isEarnedAt(at)) continue
      earned[id] = new Date(at).toISOString()
    }
    return earned
  }

  if (!value || typeof value !== "object") return earned

  const record = value as Record<string, unknown>
  for (const id of BADGE_IDS) {
    const at = record[id]
    if (typeof at !== "string" || !isEarnedAt(at)) continue
    earned[id] = new Date(at).toISOString()
  }
  return earned
}

export function earnedBadgeIds(earned: EarnedBadges): BadgeId[] {
  return BADGE_IDS.filter((id) => typeof earned[id] === "string")
}

export function formatEarnedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function sampleBadges(owned: readonly BadgeId[], limit: number, prefer?: BadgeId | null): Badge[] {
  const pool = BADGES.filter((badge) => owned.includes(badge.id))
  const shuffled = [...pool]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swap]
    shuffled[swap] = current
  }

  const picked = shuffled.slice(0, limit)
  if (!prefer || !owned.includes(prefer) || picked.some((badge) => badge.id === prefer)) {
    return picked
  }

  const preferred = badgeById(prefer)
  if (picked.length < limit) return [preferred, ...picked]
  return [preferred, ...picked.slice(0, limit - 1)]
}
