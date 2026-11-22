import "server-only"

import { createClient } from "@/lib/supabase/server"
import { asAmount, asCategory, asRelation } from "@/lib/kitchen/format"
import { pragueMonthStartIso } from "@/lib/kitchen/month"
import type { KitchenRecipe, KitchenRecipeIngredient, KitchenRecipeStep } from "@/types/database"
import type {
  PickerRecipe,
  RecipeFeedItem,
  StudioCompanion,
  StudioRecipe,
} from "@/types/recipe-view"

export async function monthlyAiCallCount(householdId: string) {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("kitchen_ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId)
    .gte("created_at", pragueMonthStartIso())
  if (error) return null
  return count ?? 0
}

function readError() {
  return "Recepty se nepodařilo načíst. Zkontrolujte migraci kitchen_ a oprávnění."
}

function toStudioRecipe(
  recipe: Pick<
    KitchenRecipe,
    | "id"
    | "title"
    | "description"
    | "category"
    | "prep_time_mins"
    | "cook_time_mins"
    | "base_portions"
    | "calories_per_portion"
    | "kaloricke_tabulky_name"
    | "image_url"
    | "is_public"
  >,
  ingredients: KitchenRecipeIngredient[],
  steps: KitchenRecipeStep[],
): StudioRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    category: asCategory(recipe.category),
    prepTimeMins: recipe.prep_time_mins,
    cookTimeMins: recipe.cook_time_mins,
    basePortions: recipe.base_portions,
    caloriesPerPortion: recipe.calories_per_portion,
    calorieTableName: recipe.kaloricke_tabulky_name,
    imageUrl: recipe.image_url,
    isPublic: recipe.is_public,
    ingredients: ingredients
      .map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        amount: asAmount(ingredient.amount),
        unit: ingredient.unit,
        category: ingredient.category,
        isHero: ingredient.is_hero,
      }))
      .sort((a, b) => Number(b.isHero) - Number(a.isHero) || a.name.localeCompare(b.name, "cs")),
    steps: steps
      .slice()
      .sort((a, b) => a.step_number - b.step_number)
      .map((step) => ({
        id: step.id,
        stepNumber: step.step_number,
        instruction: step.instruction,
      })),
  }
}

export async function listFeed(householdId: string): Promise<{ recipes: RecipeFeedItem[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("kitchen_recipes")
    .select(
      "id, household_id, title, description, category, prep_time_mins, cook_time_mins, base_portions, calories_per_portion, is_public, image_url",
    )
    .or(`household_id.eq.${householdId},is_public.eq.true`)
    .order("created_at", { ascending: false })

  if (error || !data) return { recipes: [], error: readError() }

  const ids = data.map((recipe) => recipe.id)
  const heroes = new Map<string, string[]>()
  if (ids.length > 0) {
    const ingredients = await supabase
      .from("kitchen_recipe_ingredients")
      .select("recipe_id, name")
      .in("recipe_id", ids)
      .eq("is_hero", true)

    for (const ingredient of ingredients.data ?? []) {
      const list = heroes.get(ingredient.recipe_id) ?? []
      list.push(ingredient.name)
      heroes.set(ingredient.recipe_id, list)
    }
  }

  return {
    error: null,
    recipes: data.map((recipe) => ({
      id: recipe.id,
      householdId: recipe.household_id,
      title: recipe.title,
      description: recipe.description,
      category: asCategory(recipe.category),
      prepTimeMins: recipe.prep_time_mins,
      cookTimeMins: recipe.cook_time_mins,
      basePortions: recipe.base_portions,
      caloriesPerPortion: recipe.calories_per_portion,
      isPublic: recipe.is_public,
      imageUrl: recipe.image_url,
      heroIngredients: (heroes.get(recipe.id) ?? []).sort((a, b) => a.localeCompare(b, "cs")),
    })),
  }
}

export async function listPickerRecipes(householdId: string): Promise<PickerRecipe[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("kitchen_recipes")
    .select("id, title, category")
    .or(`household_id.eq.${householdId},is_public.eq.true`)
    .order("title", { ascending: true })
    .limit(200)

  return (data ?? []).map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    category: asCategory(recipe.category),
  }))
}

export async function getRecipeStudio(id: string): Promise<
  | { recipe: StudioRecipe; companions: StudioCompanion[] }
  | { recipe: null; companions: [] }
  | { error: string }
> {
  const supabase = await createClient()
  const { data: recipe, error } = await supabase
    .from("kitchen_recipes")
    .select(
      "id, title, description, category, prep_time_mins, cook_time_mins, base_portions, calories_per_portion, kaloricke_tabulky_name, image_url, is_public",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) return { error: readError() }
  if (!recipe) return { recipe: null, companions: [] }

  const [{ data: ingredients }, { data: steps }, { data: links }] = await Promise.all([
    supabase.from("kitchen_recipe_ingredients").select("*").eq("recipe_id", id),
    supabase.from("kitchen_recipe_steps").select("*").eq("recipe_id", id).order("step_number"),
    supabase.from("kitchen_recipe_companions").select("*").eq("recipe_id", id),
  ])

  const companionIds = (links ?? []).map((link) => link.companion_id)
  const companionRecipes = companionIds.length
    ? (
        await supabase
          .from("kitchen_recipes")
          .select(
            "id, title, description, category, prep_time_mins, cook_time_mins, base_portions, calories_per_portion, kaloricke_tabulky_name, image_url, is_public",
          )
          .in("id", companionIds)
      ).data ?? []
    : []

  const companionIngredients = companionIds.length
    ? (await supabase.from("kitchen_recipe_ingredients").select("*").in("recipe_id", companionIds)).data ?? []
    : []
  const companionSteps = companionIds.length
    ? (await supabase.from("kitchen_recipe_steps").select("*").in("recipe_id", companionIds)).data ?? []
    : []

  const companions: StudioCompanion[] = []
  for (const link of links ?? []) {
    const companion = companionRecipes.find((item) => item.id === link.companion_id)
    if (!companion) continue
    companions.push({
      relationType: asRelation(link.relation_type),
      recipe: toStudioRecipe(
        companion,
        companionIngredients.filter((item) => item.recipe_id === companion.id),
        companionSteps.filter((item) => item.recipe_id === companion.id),
      ),
    })
  }

  return {
    recipe: toStudioRecipe(recipe, ingredients ?? [], steps ?? []),
    companions,
  }
}
