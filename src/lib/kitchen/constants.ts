import type { CompanionRelationType, RecipeCategory } from "@/types/database"

export const AI_MONTHLY_LIMIT = 100

/** Keep in sync with the check in supabase/migrations/*_kitchen_recipe_photos.sql */
export const MAX_RECIPE_PHOTOS_PER_USER = 40
export const MAX_RECIPE_PHOTO_BYTES = 2 * 1024 * 1024
export const RECIPE_PHOTO_BUCKET = "kitchen-recipe-photos"

export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "main", label: "Hlavní chod" },
  { value: "soup", label: "Polévka" },
  { value: "side", label: "Příloha" },
  { value: "dessert", label: "Dezert" },
  { value: "starter", label: "Předkrm" },
]

export const CATEGORY_LABEL: Record<RecipeCategory, string> = {
  main: "Hlavní chod",
  soup: "Polévka",
  side: "Příloha",
  dessert: "Dezert",
  starter: "Předkrm",
}

export const RELATION_LABEL: Record<CompanionRelationType, string> = {
  side_dish: "Příloha",
  soup: "Polévka",
  dessert: "Dezert",
}

export const INGREDIENT_UNITS = ["g", "ml", "ks"] as const

/** Amount the cook judges, such as salt. Stored in kitchen_recipe_ingredients.unit. */
export const ESTIMATE_UNIT = "podle chuti"

export const RELATION_TYPES: { value: CompanionRelationType; label: string }[] = [
  { value: "side_dish", label: "Příloha" },
  { value: "soup", label: "Polévka" },
  { value: "dessert", label: "Dezert" },
]

export const LOADING_MESSAGES = [
  "Počítám pravděpodobnost úspěšného pečení...",
  "Syntetizuji ingredience z lokálního sektoru...",
  "Zjišťuji odpověď na život, vesmír a vůbec...",
] as const

export const PANIC_TITLE = "DON'T PANIC. Tuhle stránku v galaxii neevidujeme."

export const ADULT_COEFFICIENT = 1
export const KID_COEFFICIENT = 0.6
export const GOURMAND_COEFFICIENT = 1.5
