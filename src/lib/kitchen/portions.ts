import {
  ADULT_COEFFICIENT,
  GOURMAND_COEFFICIENT,
  KID_COEFFICIENT,
} from "@/lib/kitchen/constants"

export type EaterCounts = {
  adults: number
  kids: number
  gourmands: number
}

export function equivalentPortions({ adults, kids, gourmands }: EaterCounts) {
  return adults * ADULT_COEFFICIENT + kids * KID_COEFFICIENT + gourmands * GOURMAND_COEFFICIENT
}

export function scaleFactor(equivalent: number, basePortions: number) {
  if (basePortions <= 0) return 0
  return equivalent / basePortions
}

export function scaleAmount(amount: number, factor: number) {
  return Math.round(amount * factor * 100) / 100
}

export function totalCalories(caloriesPerPortion: number | null, equivalent: number) {
  if (caloriesPerPortion == null) return null
  return Math.round(caloriesPerPortion * equivalent)
}
