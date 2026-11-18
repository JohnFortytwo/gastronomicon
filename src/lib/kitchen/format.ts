export function formatCzechNumber(value: number, maximumFractionDigits = 2, minimumFractionDigits = 0) {
  const factor = 10 ** maximumFractionDigits
  const rounded = Math.round(value * factor) / factor
  return new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(rounded)
}

export function formatMinutes(mins: number | null) {
  if (mins == null) return null
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export function foldCzech(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function asAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function asCategory(value: unknown) {
  if (
    value === "main" ||
    value === "soup" ||
    value === "side" ||
    value === "dessert" ||
    value === "starter"
  ) {
    return value
  }
  return "main" as const
}

export function asRelation(value: unknown) {
  if (value === "side_dish" || value === "soup" || value === "dessert") return value
  return "side_dish" as const
}
