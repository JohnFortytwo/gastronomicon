"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2 } from "lucide-react"
import type { ExtractedRecipe } from "@/lib/ai/parse-recipe"
import { AI_MONTHLY_LIMIT, ESTIMATE_UNIT, INGREDIENT_UNITS, MAX_RECIPE_PHOTOS_PER_USER, RECIPE_CATEGORIES, RELATION_TYPES } from "@/lib/kitchen/constants"
import { attachRecipePhoto, compressRecipePhoto, countUserRecipePhotos, recipePhotoError } from "@/lib/kitchen/recipe-photo"
import type { CompanionRelationType, RecipeCategory } from "@/types/database"
import type { PickerRecipe } from "@/types/recipe-view"
import { createClient } from "@/lib/supabase/client"
import { Button, buttonVariants } from "@/components/ui/button"
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

function aiLimitText(callsLeft: number | null) {
  if (callsLeft == null) {
    return `Domácnost má ${AI_MONTHLY_LIMIT} volání měsíčně. Počítá se jen skutečný dotaz na model.`
  }
  if (callsLeft === 0) {
    return `Domácnost tento měsíc vyčerpala ${AI_MONTHLY_LIMIT} volání. Limit se obnoví příští měsíc.`
  }
  return `Domácnost má ${AI_MONTHLY_LIMIT} volání měsíčně, zbývá ${callsLeft}. Počítá se jen skutečný dotaz na model.`
}

function openRecipeWindow(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
    const link = document.createElement("a")
    link.href = parsed.href
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.focus()
    return true
  } catch {
    return false
  }
}

function key() {
  return crypto.randomUUID()
}

function emptyIngredient(): IngredientDraft {
  return { key: key(), name: "", amount: "", unit: "", isHero: false }
}

const ESTIMATE_ALIASES = new Set(["podle chuti", "dle chuti", "to taste", "taste"])

const UNIT_ALIASES: Record<string, (typeof INGREDIENT_UNITS)[number]> = {
  g: "g",
  gr: "g",
  gram: "g",
  gramy: "g",
  gramu: "g",
  gramů: "g",
  ml: "ml",
  mililitr: "ml",
  mililitry: "ml",
  mililitru: "ml",
  mililitrů: "ml",
  ks: "ks",
  kus: "ks",
  kusy: "ks",
  kusu: "ks",
  kusů: "ks",
}

function normalizeUnit(unit: string | null | undefined) {
  const trimmed = (unit ?? "").trim()
  if (!trimmed) return ""
  const key = trimmed.toLowerCase().replace(/\.$/, "")
  if (key === ESTIMATE_UNIT || ESTIMATE_ALIASES.has(key)) return ESTIMATE_UNIT
  return UNIT_ALIASES[key] ?? trimmed
}

function unitChoices(current: string) {
  const choices: { value: string; label: string }[] = [
    { value: "none", label: "bez jednotky" },
    ...INGREDIENT_UNITS.map((unit) => ({ value: unit, label: unit })),
    { value: ESTIMATE_UNIT, label: ESTIMATE_UNIT },
  ]
  if (current && !choices.some((choice) => choice.value === current)) {
    choices.push({ value: current, label: current })
  }
  return choices
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
            amount:
              normalizeUnit(ingredient.unit) === ESTIMATE_UNIT || ingredient.amount == null
                ? ""
                : String(ingredient.amount).replace(".", ","),
            unit: normalizeUnit(ingredient.unit),
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
  aiRemaining = null,
}: {
  householdId: string
  recipes: PickerRecipe[]
  locked?: boolean
  aiRemaining?: number | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState("manual")
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [url, setUrl] = useState("")
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)
  const [dishPhoto, setDishPhoto] = useState<{ blob: Blob; preview: string } | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoCount, setPhotoCount] = useState<number | null>(null)
  const [calorieNameFollowsTitle, setCalorieNameFollowsTitle] = useState(true)
  const [callsLeft, setCallsLeft] = useState<number | null>(aiRemaining)
  const [sourcePage, setSourcePage] = useState<{ url: string; opened: boolean } | null>(null)
  const dishPhotoInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (photo?.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview)
    }
  }, [photo])

  useEffect(() => {
    if (locked) return
    const supabase = createClient()
    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user || cancelled) return
      const usage = await countUserRecipePhotos(supabase, data.user.id)
      if (!cancelled && !usage.error) setPhotoCount(usage.count)
    })()
    return () => {
      cancelled = true
    }
  }, [locked])

  const pickerItems = useMemo(
    () => recipes.filter((recipe) => !draft.companions.some((companion) => companion.companionId === recipe.id)),
    [draft.companions, recipes],
  )
  const [companionId, setCompanionId] = useState<string | null>(null)
  const [relationType, setRelationType] = useState<CompanionRelationType>("side_dish")

  function patch(partial: Partial<RecipeDraft>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function onTitleChange(title: string) {
    setDraft((current) => ({
      ...current,
      title,
      calorieTableName: calorieNameFollowsTitle ? title : current.calorieTableName,
    }))
  }

  function loadCalorieNameFromTitle() {
    setCalorieNameFollowsTitle(true)
    setDraft((current) => ({ ...current, calorieTableName: current.title }))
  }

  async function onDishPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    setPhotoBusy(true)
    try {
      const blob = await compressRecipePhoto(file)
      const preview = URL.createObjectURL(blob)
      setDishPhoto((current) => {
        if (current?.preview.startsWith("blob:")) URL.revokeObjectURL(current.preview)
        return { blob, preview }
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fotku se nepodařilo připravit.")
    } finally {
      setPhotoBusy(false)
    }
  }

  async function importRecipe(payload: Record<string, unknown>, openedPage: { url: string; opened: boolean } | null = null) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/ai/extract-recipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: string
        recipe?: ExtractedRecipe
        remaining?: number
      } | null
      if (typeof body?.remaining === "number") setCallsLeft(body.remaining)
      if (!response.ok || !body?.recipe) {
        setError(body?.error ?? "Import se nepovedl.")
        return
      }
      setDraft(draftFromExtraction(body.recipe))
      const importedCalorieName = body.recipe.kaloricke_tabulky_name?.trim() ?? ""
      setCalorieNameFollowsTitle(importedCalorieName.length === 0 || importedCalorieName === body.recipe.title)
      setSourcePage(payload.source === "url_import" ? openedPage : null)
      setTab("manual")
      const checkNote =
        payload.source === "url_import"
          ? openedPage?.opened
            ? " Původní recept je v nové záložce. Zůstaňte tady a než ho uložíte, zkontrolujte název, suroviny i postup."
            : " Prohlížeč novou záložku zablokoval. Otevřete původní recept a zkontrolujte název, suroviny i postup, než ho uložíte."
          : " Než ho uložíte, zkontrolujte suroviny i postup."
      setNotice(
        typeof body.remaining === "number"
          ? `Recept je předvyplněný.${checkNote} Zbývá ${body.remaining} volání tento měsíc.`
          : `Recept je předvyplněný.${checkNote}`,
      )
      window.scrollTo({ top: 0, behavior: "smooth" })
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
      const estimated = ingredient.unit === ESTIMATE_UNIT
      const amount = estimated ? null : parseAmount(ingredient.amount)
      if (amount === undefined) {
        setError(`Množství u „${ingredient.name}“ není číslo.`)
        return
      }
      ingredients.push({
        name: ingredient.name.trim(),
        amount,
        unit: estimated ? ESTIMATE_UNIT : ingredient.unit.trim() || null,
        category: null,
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
    const userId = auth.user?.id ?? null

    if (dishPhoto) {
      if (!userId) {
        setPending(false)
        setError("Nejste přihlášeni.")
        return
      }
      const usage = await countUserRecipePhotos(supabase, userId)
      if (usage.error) {
        setPending(false)
        setError(recipePhotoError(usage.error))
        return
      }
      if (usage.count >= MAX_RECIPE_PHOTOS_PER_USER) {
        setPending(false)
        setError(`Limit ${MAX_RECIPE_PHOTOS_PER_USER} fotek na uživatele je plný. Novou přidáte, až se nějaká uvolní.`)
        return
      }
    }

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
        created_by: userId,
      })
      .select("id")
      .single()

    if (recipeError || !created) {
      setPending(false)
      setError(writeError(recipeError?.code))
      return
    }

    if (dishPhoto && userId) {
      const attached = await attachRecipePhoto(supabase, userId, created.id, dishPhoto.blob)
      if (attached.error) {
        await supabase.from("kitchen_recipes").delete().eq("id", created.id)
        setPending(false)
        setError(attached.error)
        return
      }
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
          <p className="text-sm text-muted-foreground">{aiLimitText(callsLeft)}</p>
          <p className="text-sm text-muted-foreground">
            Zůstanete na této stránce. Původní recept se otevře v nové záložce, ať ho můžete porovnat s vyplněným formulářem.
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
            disabled={pending || !url.trim() || callsLeft === 0}
            onClick={() => {
              const address = url.trim()
              const opened = openRecipeWindow(address)
              void importRecipe({ source: "url_import", url: address }, { url: address, opened })
            }}
          >
            {pending ? "Čtu stránku…" : "Načíst recept"}
          </Button>
        </TabsContent>

        <TabsContent value="photo" className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Vyfoťte stránku z kuchařky nebo vyberte snímek. JPEG, PNG, WEBP nebo GIF, nejvýš 4 MB. {aiLimitText(callsLeft)}
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
            disabled={pending || !photo || callsLeft === 0}
            onClick={() => photo && importRecipe({ source: "photo_ocr", imageBase64: photo.base64, mimeType: photo.mimeType })}
          >
            {pending ? "Čtu fotku…" : "Přečíst recept"}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <form onSubmit={save} className="flex flex-col gap-5">
            {notice ? <p className="rounded-xl border bg-primary/10 px-4 py-3 text-sm">{notice}</p> : null}
            {sourcePage ? (
              <a
                href={sourcePage.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", className: "w-fit" })}
              >
                {sourcePage.opened ? "Znovu otevřít původní recept" : "Otevřít původní recept"}
              </a>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Název</Label>
              <Input id="title" value={draft.title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Svíčková na smetaně" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Popis jídla</Label>
              <p id="description-hint" className="text-sm text-muted-foreground">
                Sem patří příběh receptu: co je to za jídlo, odkud ho máte, jak chutná a k čemu se hodí. Samotný postup se píše až níž.
              </p>
              <Textarea
                id="description"
                aria-describedby="description-hint"
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Nedělní svíčková od babičky. Hustá omáčka, k tomu houskový knedlík."
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
              <p id="calorie-name-hint" className="text-sm text-muted-foreground">
                Při psaní názvu se sem doplní sám. Přepište ho, jen když se v Kalorických tabulkách hledá jinak.
              </p>
              <Input
                id="calorie-name"
                aria-describedby="calorie-name-hint"
                value={draft.calorieTableName}
                onChange={(event) => {
                  setCalorieNameFollowsTitle(false)
                  patch({ calorieTableName: event.target.value })
                }}
                placeholder="Svíčková na smetaně"
              />
              <Button type="button" variant="outline" className="w-fit" disabled={!draft.title.trim()} onClick={loadCalorieNameFromTitle}>
                Načíst z názvu
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dish-photo">Fotka jídla</Label>
              <p id="dish-photo-hint" className="text-sm text-muted-foreground">
                Obrázek hotového jídla, který se ukáže u receptu. Není povinný a není to čtení receptu z fotky — to je záložka
                Import z fotky.{" "}
                {`Každý uživatel může mít nejvýš ${MAX_RECIPE_PHOTOS_PER_USER} takových fotek${
                  photoCount != null && photoCount > 0 ? ` (teď ${photoCount} z ${MAX_RECIPE_PHOTOS_PER_USER}).` : "."
                } Před uložením se zmenší na nejvýš 2 MB.`}
              </p>
              <Input
                ref={dishPhotoInput}
                id="dish-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="dish-photo-hint"
                disabled={photoBusy || pending}
                tabIndex={-1}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  void onDishPhoto(file)
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  disabled={photoBusy || pending}
                  onClick={() => dishPhotoInput.current?.click()}
                >
                  {dishPhoto ? "Vyměnit fotku" : "Vybrat fotku"}
                </Button>
                {dishPhoto ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() =>
                      setDishPhoto((current) => {
                        if (current?.preview.startsWith("blob:")) URL.revokeObjectURL(current.preview)
                        return null
                      })
                    }
                  >
                    Odebrat fotku
                  </Button>
                ) : null}
              </div>
              {photoBusy ? <p className="text-sm text-muted-foreground">Zmenšuji fotku…</p> : null}
              {dishPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dishPhoto.preview} alt="Náhled fotky jídla" className="max-h-56 w-full rounded-2xl object-cover" />
              ) : null}
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
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      aria-label="Množství"
                      inputMode="decimal"
                      placeholder={ingredient.unit === ESTIMATE_UNIT ? "odhad" : "1"}
                      value={ingredient.amount}
                      disabled={ingredient.unit === ESTIMATE_UNIT}
                      onChange={(event) =>
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key ? { ...item, amount: event.target.value } : item,
                          ),
                        })
                      }
                    />
                    <Select
                      items={unitChoices(ingredient.unit)}
                      value={ingredient.unit || null}
                      onValueChange={(value) => {
                        const next = value === "none" || value == null ? "" : String(value)
                        patch({
                          ingredients: draft.ingredients.map((item) =>
                            item.key === ingredient.key
                              ? { ...item, unit: next, amount: next === ESTIMATE_UNIT ? "" : item.amount }
                              : item,
                          ),
                        })
                      }}
                    >
                      <SelectTrigger aria-label="Jednotka" className="w-full">
                        <SelectValue placeholder="Jednotka" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitChoices(ingredient.unit).map((choice) => (
                          <SelectItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
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
