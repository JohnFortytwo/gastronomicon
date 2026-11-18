import type {
  CompanionRelationType,
  RecipeCategory,
} from "@/types/database"

export type RecipeFeedItem = {
  id: string
  householdId: string
  title: string
  description: string | null
  category: RecipeCategory
  prepTimeMins: number | null
  cookTimeMins: number | null
  basePortions: number
  caloriesPerPortion: number | null
  isPublic: boolean
  imageUrl: string | null
  heroIngredients: string[]
}

export type PickerRecipe = {
  id: string
  title: string
  category: RecipeCategory
}

export type StudioIngredient = {
  id: string
  name: string
  amount: number | null
  unit: string | null
  category: string | null
  isHero: boolean
}

export type StudioStep = {
  id: string
  stepNumber: number
  instruction: string
}

export type StudioRecipe = {
  id: string
  title: string
  description: string | null
  category: RecipeCategory
  prepTimeMins: number | null
  cookTimeMins: number | null
  basePortions: number
  caloriesPerPortion: number | null
  calorieTableName: string | null
  imageUrl: string | null
  isPublic: boolean
  ingredients: StudioIngredient[]
  steps: StudioStep[]
}

export type StudioCompanion = {
  relationType: CompanionRelationType
  recipe: StudioRecipe
}

export type TableDefaults = {
  adults: number
  kids: number
  gourmands: number
}
