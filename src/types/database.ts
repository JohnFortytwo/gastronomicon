/**
 * Canonical Gastronomicon schema. Column names match PostgreSQL exactly.
 * Do not rename `kitchen_` identifiers.
 */

export type RecipeCategory = "main" | "soup" | "side" | "dessert" | "starter"

export type CompanionRelationType = "side_dish" | "soup" | "dessert"

export type AiActionType = "url_import" | "photo_ocr" | "ai_menu_suggest" | (string & {})

export type KitchenHousehold = {
  id: string
  name: string
  created_at: string
}

export type KitchenProfile = {
  id: string
  household_id: string | null
  display_name: string | null
  default_adults: number
  default_kids: number
  default_gourmands: number
  badges: Record<string, string> | string[]
  created_at: string
}

export type KitchenRecipe = {
  id: string
  household_id: string
  title: string
  description: string | null
  category: RecipeCategory
  prep_time_mins: number | null
  cook_time_mins: number | null
  base_portions: number
  calories_per_portion: number | null
  kaloricke_tabulky_name: string | null
  is_public: boolean
  image_url: string | null
  created_by: string | null
  created_at: string
}

export type KitchenRecipeIngredient = {
  id: string
  recipe_id: string
  name: string
  amount: number | null
  unit: string | null
  category: string | null
  is_hero: boolean
}

export type KitchenRecipeStep = {
  id: string
  recipe_id: string
  step_number: number
  instruction: string
}

export type KitchenRecipeCompanion = {
  recipe_id: string
  companion_id: string
  relation_type: CompanionRelationType
}

export type KitchenAiUsageLog = {
  id: string
  household_id: string
  user_id: string | null
  action_type: string
  created_at: string
}

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Table<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationship[]
}

export type Database = {
  public: {
    Tables: {
      kitchen_households: Table<
        KitchenHousehold,
        { id?: string; name: string; created_at?: string },
        { id?: string; name?: string; created_at?: string }
      >
      kitchen_profiles: Table<
        KitchenProfile,
        {
          id: string
          household_id?: string | null
          display_name?: string | null
          default_adults?: number
          default_kids?: number
          default_gourmands?: number
          badges?: Record<string, string> | string[]
          created_at?: string
        },
        {
          id?: string
          household_id?: string | null
          display_name?: string | null
          default_adults?: number
          default_kids?: number
          default_gourmands?: number
          badges?: Record<string, string> | string[]
          created_at?: string
        }
      >
      kitchen_recipes: Table<
        KitchenRecipe,
        {
          id?: string
          household_id: string
          title: string
          description?: string | null
          category?: RecipeCategory
          prep_time_mins?: number | null
          cook_time_mins?: number | null
          base_portions?: number
          calories_per_portion?: number | null
          kaloricke_tabulky_name?: string | null
          is_public?: boolean
          image_url?: string | null
          created_by?: string | null
          created_at?: string
        },
        {
          id?: string
          household_id?: string
          title?: string
          description?: string | null
          category?: RecipeCategory
          prep_time_mins?: number | null
          cook_time_mins?: number | null
          base_portions?: number
          calories_per_portion?: number | null
          kaloricke_tabulky_name?: string | null
          is_public?: boolean
          image_url?: string | null
          created_by?: string | null
          created_at?: string
        }
      >
      kitchen_recipe_ingredients: Table<
        KitchenRecipeIngredient,
        {
          id?: string
          recipe_id: string
          name: string
          amount?: number | null
          unit?: string | null
          category?: string | null
          is_hero?: boolean
        },
        {
          id?: string
          recipe_id?: string
          name?: string
          amount?: number | null
          unit?: string | null
          category?: string | null
          is_hero?: boolean
        }
      >
      kitchen_recipe_steps: Table<
        KitchenRecipeStep,
        {
          id?: string
          recipe_id: string
          step_number: number
          instruction: string
        },
        {
          id?: string
          recipe_id?: string
          step_number?: number
          instruction?: string
        }
      >
      kitchen_recipe_companions: Table<
        KitchenRecipeCompanion,
        KitchenRecipeCompanion,
        Partial<KitchenRecipeCompanion>
      >
      kitchen_ai_usage_logs: Table<
        KitchenAiUsageLog,
        {
          id?: string
          household_id: string
          user_id?: string | null
          action_type: string
          created_at?: string
        },
        {
          id?: string
          household_id?: string
          user_id?: string | null
          action_type?: string
          created_at?: string
        }
      >
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      kitchen_current_household_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      kitchen_create_household: {
        Args: { household_name: string; display_name: string }
        Returns: KitchenHousehold
      }
      kitchen_join_household: {
        Args: { target_household_id: string; display_name: string }
        Returns: KitchenHousehold
      }
    }
  }
}
