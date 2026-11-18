"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2 } from "lucide-react"
import type { ExtractedRecipe } from "@/lib/ai/parse-recipe"
import { INGREDIENT_CATEGORY_SUGGESTIONS, RECIPE_CATEGORIES, RELATION_TYPES } from "@/lib/kitchen/constants"
import type { CompanionRelationType, RecipeCategory } from "@/types/database"
import type { PickerRecipe } from "@/types/recipe-view"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type IngredientDraft = {
  key: string
  name: string
  amount: string
  unit: string
  category: string
  isHero: boolean
}

type StepDraft = {
  key: string
  instruction: string
}

type CompanionDraft = {
  companionId: string
  title: string
  relationType: CompanionRelationType
}

type RecipeDraft = {
  title: string
  description: string
  category: RecipeCategory
  prepTimeMins: string
  cookTimeMins: string
  basePortions: string
  caloriesPerPortion: string
  calorieTableName: string
  isPublic: boolean
  imageUrl: string
  ingredients: IngredientDraft[]
  steps: StepDraft[]
  companions: CompanionDraft[]
}

function key() {
  return crypto.randomUUID()
}

function emptyIngredient(): IngredientDraft {
  return { key: key(), name: "", amount: "", unit: "", category: "", isHero: false }
}

function emptyDraft(): RecipeDraft {
  return {
    title: "",
    description: "",
    category: "main",
    prepTimeMins: "",
    cookTimeMins: "",
    basePortions: "4",
    caloriesPerPortion: "",
    calorieTableName: "",
    isPublic: false,
    imageUrl: "",
    ingredients: [emptyIngredient()],
    steps: [{ key: key(), instruction: "" }],
    companions: [],
  }
}

function draftFromExtraction(recipe: ExtractedRecipe): RecipeDraft {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    category: recipe.category,
    prepTimeMins: recipe.prep_time_mins?.toString() ?? "",
    cookTimeMins: recipe.cook_time_mins?.toString() ?? "",
    basePortions: String(recipe.base_portions || 4),
    caloriesPerPortion: recipe.calories_per_portion?.toString() ?? "",
    calorieTableName: recipe.kaloricke_tabulky_name ?? "",
    isPublic: false,
    imageUrl: "",
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            key: key(),
            name: ingredient.name,
            amount: ingredient.amount == null ? "" : String(ingredient.amount).replace(".", ","),
            unit: ingredient.unit ?? "",
            category: ingredient.category ?? "",
            isHero: ingredient.is_hero,
          }))
        : [emptyIngredient()],
    steps:
      recipe.steps.length > 0
        ? recipe.steps.map((step) => ({ key: key(), instruction: step.instruction }))
        : [{ key: key(), instruction: "" }],
    companions: [],
  }
}

function parseIntField(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(",", "."))
  if (!Number.isInteger(parsed) || parsed < 0) return undefined
  return parsed
}

function parseAmount(value: string) {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return parsed
}

function writeError(code?: string) {
  if (code === "42501" || code === "PGRST301") {
    return "Databáze zápis odmítla. Zkontrolujte migraci kitchen_ a že jste v domácnosti."
  }
  return "Uložení selhalo. Zkuste to znovu."
}

const CATEGORY_ITEMS = Object.fromEntries(RECIPE_CATEGORIES.map((item) => [item.value, item.label]))
const RELATION_ITEMS = Object.fromEntries(RELATION_TYPES.map((item) => [item.value, item.label]))

export function RecipeCreator({
  householdId,
  recipes,
  locked = false,
}: {
  householdId: string
  recipes: PickerRecipe[]
  locked?: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState("manual")
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [url, setUrl] = useState("")
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)

  useEffect(() => {
    return () => {
      if (photo?.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview)
    }
  }, [photo])

  const pickerItems = useMemo(
    () => recipes.filter((recipe) => !draft.companions.some((companion) => companion.companionId === recipe.id)),
    [draft.companions, recipes],
  )
  const [companionId, setCompanionId] = useState<string | null>(null)
  const [relationType, setRelationType] = useState<CompanionRelationType>("side_dish")

  function patch(partial: Partial<RecipeDraft>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  async function importRecipe(payload: Record<string, unknown>) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/ai/extract-recipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => null)) as { error?: string; recipe?: ExtractedRecipe; remaining?: number } | null
      if (!response.ok || !body?.recipe) {
        setError(body?.error ?? "Import se nepovedl.")
        return
      }
      setDraft(draftFromExtraction(body.recipe))
      setTab("manual")
      setNotice(
        typeof body.remaining === "number"
          ? `Recept je předvyplněný. Než ho uložíte, zkontrolujte ho. Zbývá ${body.remaining} volání tento měsíc.`
          : "Recept je předvyplněný. Než ho uložíte, zkontrolujte suroviny i postup.",
      )
    } catch {
      setError("Spojení s kuchyní se přerušilo.")
    } finally {
      setPending(false)
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (locked || !householdId) {
      setError("Nejdřív připojte Supabase a domácnost. Formulář si můžete prohlédnout, uložení počká.")
      return
    }
    if (!draft.title.trim()) {
      setError("Recept potřebuje název.")
      return
    }
    const basePortions = parseIntField(draft.basePortions)
    if (!basePortions || basePortions < 1) {
      setError("Základní počet porcí musí být celé číslo od 1 výš.")
      return
    }
    const prep = parseIntField(draft.prepTimeMins)
    const cook = parseIntField(draft.cookTimeMins)
    const calories = parseIntField(draft.caloriesPerPortion)
    if (prep === undefined || cook === undefined || calories === undefined) {
      setError("Časy a kalorie pište jako celá čísla, nebo je nechte prázdné.")
      return
    }

    const ingredients = []
    for (const ingredient of draft.ingredients) {
      if (!ingredient.name.trim()) continue
      const amount = parseAmount(ingredient.amount)
      if (amount === undefined) {
        setError(`Množství u „${ingredient.name}“ není číslo.`)
        return
      }
      ingredients.push({
        name: ingredient.name.trim(),
        amount,
        unit: ingredient.unit.trim() || null,
        category: ingredient.category.trim() || null,
        is_hero: ingredient.isHero,
      })
    }
    if (ingredients.length === 0) {
      setError("Přidejte aspoň jednu surovinu.")
      return
    }
    const steps = draft.steps
      .map((step) => step.instruction.trim())
      .filter(Boolean)
      .map((instruction, index) => ({ step_number: index + 1, instruction }))
    if (steps.length === 0) {
      setError("Přidejte aspoň jeden krok postupu.")
      return
    }

    setPending(true)
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const { data: created, error: recipeError } = await supabase
      .from("kitchen_recipes")
      .insert({
        household_id: householdId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        category: draft.category,
        prep_time_mins: prep,
        cook_time_mins: cook,
        base_portions: basePortions,
        calories_per_portion: calories,
        kaloricke_tabulky_name: draft.calorieTableName.trim() || null,
        is_public: draft.isPublic,
        image_url: draft.imageUrl.trim() || null,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single()

    if (recipeError || !created) {
      setPending(false)
      setError(writeError(recipeError?.code))
      return
    }

    const { error: ingredientError } = await supabase.from("kitchen_recipe_ingredients").insert(
      ingredients.map((ingredient) => ({ ...ingredient, recipe_id: created.id })),
    )
    const { error: stepError } = await supabase.from("kitchen_recipe_steps").insert(
      steps.map((step) => ({ ...step, recipe_id: created.id })),
    )
    const { error: companionError } =
      draft.companions.length > 0
        ? await supabase.from("kitchen_recipe_companions").insert(
            draft.companions.map((companion) => ({
              recipe_id: created.id,
              companion_id: companion.companionId,
              relation_type: companion.relationType,
            })),
          )
        : { error: null }

    setPending(false)
    if (ingredientError || stepError || companionError) {
      setError("Recept vznikl, ale část surovin, postupu nebo doprovodu se neuložila.")
      router.push(`/recipes/${created.id}`)
      return
    }
    router.push(`/recipes/${created.id}`)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">NOVÝ RECEPT</p>
        <h1 className="font-heading text-4xl leading-none">Zapsat do archivu</h1>
        <p className="text-muted-foreground">Ručně, z odkazu, nebo z fotky. Před uložením všechno uvidíte.</p>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList className="!h-auto min-h-16 w-full">
          <TabsTrigger value="manual" className="min-h-16 flex-1 px-2 text-center text-sm leading-tight whitespace-normal">
            Ruční zadání
          </TabsTrigger>
          <TabsTrigger value="url" className="min-h-16 flex-1 px-2 text-center text-sm leading-tight whitespace-normal">
            Import z URL (AI)
          </TabsTrigger>
          <TabsTrigger value="photo" className="min-h-16 flex-1 px-2 text-center text-sm leading-tight whitespace-normal">
            Import z fotky (AI)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Veřejný odkaz na recept. Domácnost má 100 volání měsíčně, limit se počítá až při skutečném dotazu na model.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="recipe-url">Adresa stránky</Label>
            <Input
              id="recipe-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={pending || !url.trim()}
            onClick={() => importRecipe({ source: "url_import", url: url.trim() })}
          >
            {pending ? "Čtu stránku…" : "Načíst recept"}
          </Button>
        </TabsContent>

        <TabsContent value="photo" className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Vyfoťte stránku z kuchařky nebo vyberte snímek. JPEG, PNG, WEBP nebo GIF, nejvýš 4 MB.
          </p>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              if (file.size > 4 * 1024 * 1024) {
                setError("Fotka je větší než 4 MB.")
                return
              }
              const reader = new FileReader()
              reader.onload = () => {
                const result = typeof reader.result === "string" ? reader.result : ""
                const base64 = result.split(",")[1] ?? ""
                setPhoto({ base64, mimeType: file.type, preview: URL.createObjectURL(file) })
                setError(null)
              }
              reader.readAsDataURL(file)
            }}
          />
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="Náhled fotky receptu" className="max-h-64 w-full rounded-2xl object-cover" />
          ) : null}
          <Button
            type="button"
            disabled={pending || !photo}
            onClick={() => photo && importRecipe({ source: "photo_ocr", imageBase64: photo.base64, mimeType: photo.mimeType })}
          >
            {pending ? "Čtu fotku…" : "Přečíst recept"}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <form onSubmit={save} className="flex flex-col gap-5">
            {notice ? <p className="rounded-xl border bg-primary/10 px-4 py-3 text-sm">{notice}</p> : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Název</Label>
              <Input id="title" value={draft.title} onChange={(event) => patch({ title: event.target.value })} placeholder="Svíčková na smetaně" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Příběh / úvod</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Krátce, proč se k tomuhle jídlu vracíte."
              />
            </div>
            <div className="grid gap-2">
              <Label>Kategorie</Label>
              <Select
                items={CATEGORY_ITEMS}
                value={draft.category}
                onValueChange={(value) => {
                  if (value === "main" || value === "soup" || value === "side" || value === "dessert" || value === "starter") {
                    patch({ category: value })
                  }
                }}
              >
                <SelectTrigger aria-label="Kategorie">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="prep">Příprava (min)</Label>
                <Input id="prep" inputMode="numeric" value={draft.prepTimeMins} onChange={(event) => patch({ prepTimeMins: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cook">Vaření (min)</Label>
                <Input id="cook" inputMode="numeric" value={draft.cookTimeMins} onChange={(event) => patch({ cookTimeMins: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portions">Základní porce</Label>
                <Input id="portions" inputMode="numeric" value={draft.basePortions} onChange={(event) => patch({ basePortions: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="calories">kcal / porci</Label>
                <Input id="calories" inputMode="numeric" value={draft.caloriesPerPortion} onChange={(event) => patch({ caloriesPerPortion: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="calorie-name">Název v Kalorických tabulkách</Label>
              <Input
                id="calorie-name"
                value={draft.calorieTableName}
                onChange={(event) => patch({ calorieTableName: event.target.value })}
                placeholder="Svíčková na smetaně"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Adresa fotky</Label>
              <Input
                id="image"
                type="url"
                inputMode="url"
                value={draft.imageUrl}
                onChange={(event) => patch({ imageUrl: event.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2">
              <Label htmlFor="public" className="text-base">
                Sdílet s přáteli
              </Label>
              <Switch
                id="public"
                aria-label="Sdílet s přáteli"
                checked={draft.isPublic}
                onCheckedChange={(checked) => patch({ isPublic: checked })}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl">Suroviny</h2>
                <Button type="button" variant="outline" onClick={() => patch({ ingredients: [...draft.ingredients, emptyIngredient()] })}>
                  <Plus />
                  Přidat
                </Button>
              </div>
              {draft.ingredients.map((ingredient, index) => (
                <div key={ingredient.key} className="grid gap-2 rounded-2xl border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Surovina ${index + 1}`}
                      value={ingredient.name}
                      placeholder="Název suroviny"
                      onChange={(event) =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, name: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant={ingredient.isHero ? "default" : "outline"}
                      size="icon"
                      aria-pressed={ingredient.isHero}
                      aria-label={ingredient.isHero ? "Zrušit hrdinskou surovinu" : "Označit jako hrdinskou surovinu"}
                      onClick={() =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, isHero: !item.isHero } : item,
                          ),
                        })
                      }
                    >
                      <Star className={ingredient.isHero ? "fill-current" : ""} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Odebrat surovinu"
                      onClick={() =>
                        patch({
                          ingredients:
                            draft.ingredients.length === 1
                              ? [emptyIngredient()]
                              : draft.ingredients.filter((item) => item.key !== ingredient.key),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      aria-label="Množství"
                      inputMode="decimal"
                      placeholder="0,5"
                      value={ingredient.amount}
                      onChange={(event) =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, amount: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label="Jednotka"
                      placeholder="g, ml, ks"
                      value={ingredient.unit}
                      onChange={(event) =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, unit: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Input
                      aria-label="Kategorie suroviny"
                      placeholder="Zelenina"
                      list="ingredient-categories"
                      value={ingredient.category}
                      onChange={(event) =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, category: event.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              <datalist id="ingredient-categories">
                {INGREDIENT_CATEGORY_SUGGESTIONS.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl">Postup</h2>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patch({ steps: [...draft.steps, { key: key(), instruction: "" }] })}
                >
                  <Plus />
                  Krok
                </Button>
              </div>
              {draft.steps.map((step, index) => (
                <div key={step.key} className="flex items-start gap-2">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg border font-mono">{index + 1}</span>
                  <Textarea
                    aria-label={`Krok ${index + 1}`}
                    value={step.instruction}
                    onChange={(event) =>
                      patch({
                        steps: draft.steps.map((item) =>
                          item.key === step.key ? { ...item, instruction: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Odebrat krok"
                    onClick={() =>
                      patch({
                        steps: draft.steps.length === 1 ? [{ key: key(), instruction: "" }] : draft.steps.filter((item) => item.key !== step.key),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-2xl">Doprovod</h2>
              {recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Až budete mít víc receptů, půjde k nim přidat přílohu, polévku nebo dezert.
                </p>
              ) : (
                <div className="grid gap-2">
                  <Select
                    items={pickerItems.map((recipe) => ({ value: recipe.id, label: recipe.title }))}
                    value={companionId}
                    onValueChange={(value) => {
                      const next = typeof value === "string" ? value : null
                      setCompanionId(next)
                      const found = recipes.find((recipe) => recipe.id === next)
                      if (!found) return
                      setRelationType(found.category === "soup" ? "soup" : found.category === "dessert" ? "dessert" : "side_dish")
                    }}
                  >
                    <SelectTrigger aria-label="Vybrat doprovodný recept">
                      <SelectValue placeholder="Vyberte recept" />
                    </SelectTrigger>
                    <SelectContent>
                      {pickerItems.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    items={RELATION_ITEMS}
                    value={relationType}
                    onValueChange={(value) => {
                      if (value === "side_dish" || value === "soup" || value === "dessert") setRelationType(value)
                    }}
                  >
                    <SelectTrigger aria-label="Vztah doprovodu">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_TYPES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!companionId}
                    onClick={() => {
                      const found = recipes.find((recipe) => recipe.id === companionId)
                      if (!found) return
                      patch({
                        companions: [
                          ...draft.companions,
                          { companionId: found.id, title: found.title, relationType },
                        ],
                      })
                      setCompanionId(null)
                    }}
                  >
                    Přidat doprovod
                  </Button>
                </div>
              )}
              {draft.companions.map((companion) => (
                <div key={companion.companionId} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3">
                  <span>
                    {companion.title}
                    <span className="block text-sm text-muted-foreground">
                      {RELATION_TYPES.find((item) => item.value === companion.relationType)?.label}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      patch({ companions: draft.companions.filter((item) => item.companionId !== companion.companionId) })
                    }
                  >
                    Odebrat
                  </Button>
                </div>
              ))}
            </div>

            {error && tab === "manual" ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Ukládám…" : "Uložit recept"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      {error && tab !== "manual" ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
