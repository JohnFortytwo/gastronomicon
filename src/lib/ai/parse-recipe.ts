import type { RecipeCategory } from "@/types/database"

export type ExtractedIngredient = {
  name: string
  amount: number | null
  unit: string | null
  category: string | null
  is_hero: boolean
}

export type ExtractedStep = {
  step_number: number
  instruction: string
}

export type ExtractedRecipe = {
  title: string
  description: string | null
  category: RecipeCategory
  prep_time_mins: number | null
  cook_time_mins: number | null
  base_portions: number
  calories_per_portion: number | null
  kaloricke_tabulky_name: string | null
  ingredients: ExtractedIngredient[]
  steps: ExtractedStep[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function asNullableText(value: unknown) {
  const text = asText(value)
  return text || null
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asInt(value: unknown) {
  const parsed = asNumber(value)
  if (parsed == null) return null
  return Math.max(0, Math.round(parsed))
}

function asCategory(value: unknown): RecipeCategory {
  if (
    value === "main" ||
    value === "soup" ||
    value === "side" ||
    value === "dessert" ||
    value === "starter"
  ) {
    return value
  }
  return "main"
}

export function parseExtractedRecipe(raw: unknown): ExtractedRecipe | null {
  const record = asRecord(raw)
  const source = record && asRecord(record.recipe) ? asRecord(record.recipe) : record
  if (!source) return null

  const title = asText(source.title)
  if (!title) return null

  const ingredients = Array.isArray(source.ingredients)
    ? source.ingredients.flatMap((item): ExtractedIngredient[] => {
        const row = asRecord(item)
        const name = row ? asText(row.name) : ""
        if (!row || !name) return []
        return [
          {
            name,
            amount: asNumber(row.amount),
            unit: asNullableText(row.unit),
            category: asNullableText(row.category),
            is_hero: row.is_hero === true,
          },
        ]
      })
    : []

  const steps = Array.isArray(source.steps)
    ? source.steps.flatMap((item, index): ExtractedStep[] => {
        const row = asRecord(item)
        const instruction = row ? asText(row.instruction) : ""
        if (!instruction) return []
        return [{ step_number: index + 1, instruction }]
      })
    : []

  const base = asInt(source.base_portions)

  return {
    title,
    description: asNullableText(source.description),
    category: asCategory(source.category),
    prep_time_mins: asInt(source.prep_time_mins),
    cook_time_mins: asInt(source.cook_time_mins),
    base_portions: base && base > 0 ? base : 4,
    calories_per_portion: asInt(source.calories_per_portion),
    kaloricke_tabulky_name: asNullableText(source.kaloricke_tabulky_name),
    ingredients,
    steps,
  }
}

export function parseModelJson(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "")
  return parseExtractedRecipe(JSON.parse(trimmed) as unknown)
}
