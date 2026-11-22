"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Star } from "lucide-react"
import { CATEGORY_LABEL, ESTIMATE_UNIT, RELATION_LABEL } from "@/lib/kitchen/constants"
import { formatCzechNumber, formatMinutes } from "@/lib/kitchen/format"
import { equivalentPortions, scaleAmount, scaleFactor, totalCalories, type EaterCounts } from "@/lib/kitchen/portions"
import type { StudioCompanion, StudioRecipe, TableDefaults } from "@/types/recipe-view"
import { PortionScaler } from "@/components/portion-scaler"
import { useCookMode } from "@/components/cook-mode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ScaledLine = {
  key: string
  name: string
  unit: string | null
  category: string | null
  isHero: boolean
  scaled: number | null
  sourceTitle: string
}

function useScreenWakeLock(enabled: boolean) {
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let released = false
    let sentinel: WakeLockSentinel | null = null

    const request = async () => {
      if (released) return
      if (!("wakeLock" in navigator)) {
        setUnavailable(true)
        return
      }
      try {
        sentinel = await navigator.wakeLock.request("screen")
        setUnavailable(false)
      } catch {
        setUnavailable(true)
      }
    }

    void request()
    const onVisible = () => {
      if (document.visibilityState === "visible") void request()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      released = true
      document.removeEventListener("visibilitychange", onVisible)
      void sentinel?.release().catch(() => undefined)
    }
  }, [enabled])

  return enabled && unavailable
}

export function RecipeStudio({
  recipe,
  companions,
  defaults,
  preview,
}: {
  recipe: StudioRecipe
  companions: StudioCompanion[]
  defaults: TableDefaults
  preview?: boolean
}) {
  const { setCookMode } = useCookMode()
  const [counts, setCounts] = useState<EaterCounts>({
    adults: defaults.adults,
    kids: defaults.kids,
    gourmands: defaults.gourmands,
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [stepSource, setStepSource] = useState(recipe.id)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [cooking, setCooking] = useState(false)
  const wakeLockFallback = useScreenWakeLock(cooking)

  useEffect(() => () => setCookMode(false), [setCookMode])

  const equivalent = equivalentPortions(counts)
  const selected = companions.filter((companion) => selectedIds.includes(companion.recipe.id))
  const visibleStepSource =
    stepSource !== recipe.id && !selectedIds.includes(stepSource) ? recipe.id : stepSource
  const active = selected.find((companion) => companion.recipe.id === visibleStepSource)?.recipe ?? recipe

  const lines = useMemo(() => {
    const sources = [recipe, ...selected.map((companion) => companion.recipe)]
    return sources.flatMap((source) => {
      const factor = scaleFactor(equivalent, source.basePortions)
      return source.ingredients.map((ingredient): ScaledLine => ({
        key: `${source.id}:${ingredient.id}`,
        name: ingredient.name,
        unit: ingredient.unit,
        category: ingredient.category,
        isHero: ingredient.isHero,
        scaled:
          ingredient.unit === ESTIMATE_UNIT || ingredient.amount == null ? null : scaleAmount(ingredient.amount, factor),
        sourceTitle: source.title,
      }))
    })
  }, [equivalent, recipe, selected])

  const groups = useMemo(() => {
    const map = new Map<string, ScaledLine[]>()
    for (const line of lines) {
      const key = line.category?.trim() || "Ostatní"
      map.set(key, [...(map.get(key) ?? []), line])
    }
    return [...map.entries()]
  }, [lines])

  const combinedCalories = [recipe, ...selected.map((companion) => companion.recipe)].reduce((sum, source) => {
    const calories = totalCalories(source.caloriesPerPortion, equivalent)
    return calories == null ? sum : sum + calories
  }, 0)
  const missingCalories = [recipe, ...selected.map((companion) => companion.recipe)].some(
    (source) => source.caloriesPerPortion == null,
  )

  function toggleCompanion(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function startCooking(next: boolean) {
    setCooking(next)
    setCookMode(next)
    if (next) window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const prep = formatMinutes(recipe.prepTimeMins)
  const cook = formatMinutes(recipe.cookTimeMins)

  return (
    <article className="flex flex-col gap-6">
      {cooking ? (
        <div className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <p className="font-mono text-xs tracking-[0.22em] text-primary">REŽIM VAŘENÍ</p>
          <Button type="button" variant="outline" onClick={() => startCooking(false)}>
            Ukončit vaření
          </Button>
        </div>
      ) : null}

      {preview ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Ukázkový recept. Nic se neukládá, dokud není připojená databáze.
        </p>
      ) : null}

      {!cooking && recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.imageUrl} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{CATEGORY_LABEL[recipe.category]}</Badge>
          {recipe.isPublic ? <Badge variant="outline">Sdíleno s přáteli</Badge> : null}
        </div>
        <h1 className={cn("font-heading leading-tight", cooking ? "text-4xl" : "text-4xl")}>{recipe.title}</h1>
        {!cooking && recipe.description ? (
          <p className="text-base leading-relaxed text-muted-foreground">{recipe.description}</p>
        ) : null}
        <p className="font-mono text-xs text-muted-foreground">
          {[prep ? `příprava ${prep}` : null, cook ? `vaření ${cook}` : null, `základ ${recipe.basePortions} porcí`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {!cooking ? (
          <Button type="button" onClick={() => startCooking(true)}>
            Režim vaření
          </Button>
        ) : null}
        {cooking && wakeLockFallback ? (
          <p className="text-sm text-muted-foreground">Obrazovku se nepodařilo udržet zapnutou. Telefon může usnout.</p>
        ) : null}
      </header>

      <PortionScaler
        counts={counts}
        defaults={defaults}
        basePortions={recipe.basePortions}
        caloriesPerPortion={recipe.caloriesPerPortion}
        calorieTableName={recipe.calorieTableName}
        onChange={setCounts}
      />

      {companions.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl">Doprovod</h2>
          {companions.map((companion) => {
            const activeCompanion = selectedIds.includes(companion.recipe.id)
            return (
              <button
                key={companion.recipe.id}
                type="button"
                aria-pressed={activeCompanion}
                onClick={() => toggleCompanion(companion.recipe.id)}
                className={cn(
                  "min-h-11 rounded-2xl border px-4 py-3 text-left",
                  activeCompanion ? "border-primary bg-primary/10" : "bg-card",
                )}
              >
                <span className="block text-sm text-muted-foreground">{RELATION_LABEL[companion.relationType]}</span>
                <span className="block font-heading text-xl">{companion.recipe.title}</span>
                <span className="text-sm text-muted-foreground">
                  {activeCompanion ? "Suroviny jsou v seznamu." : "Přidat do seznamu surovin."}
                </span>
              </button>
            )
          })}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className={cn("font-heading", cooking ? "text-3xl" : "text-2xl")}>Suroviny</h2>
          {selected.length > 0 && combinedCalories > 0 ? (
            <p className="text-right text-sm text-muted-foreground">
              Se zvoleným doprovodem {formatCzechNumber(combinedCalories, 0)} kcal
              {missingCalories ? " · u některého chodu kalorie chybí" : ""}
            </p>
          ) : null}
        </div>
        {groups.map(([category, group]) => (
          <div key={category} className="flex flex-col gap-1">
            {groups.length === 1 && category === "Ostatní" ? null : (
              <h3 className="px-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">{category}</h3>
            )}
            {group.map((line) => {
              const isChecked = Boolean(checked[line.key])
              const amount =
                line.scaled == null
                  ? null
                  : `${formatCzechNumber(line.scaled)}${line.unit ? ` ${line.unit}` : ""}`
              return (
                <button
                  key={line.key}
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => setChecked((current) => ({ ...current, [line.key]: !current[line.key] }))}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-1 py-1 text-left"
                >
                  <span
                    className={cn(
                      "grid shrink-0 place-items-center rounded-lg border",
                      cooking ? "size-12" : "size-11",
                      isChecked ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {isChecked ? <Check /> : null}
                  </span>
                  <span className={cn("min-w-0 flex-1", cooking && "text-lg", isChecked && "text-muted-foreground line-through")}>
                    <span className="flex items-center gap-1.5">
                      {line.isHero ? <Star className="size-4 fill-primary text-primary" aria-label="Hrdinská surovina" /> : null}
                      {line.name}
                    </span>
                    <span className="block font-mono text-sm text-muted-foreground">
                      {amount ?? "podle chuti"}
                      {selected.length > 0 ? ` · ${line.sourceTitle}` : ""}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={cn("font-heading", cooking ? "text-3xl" : "text-2xl")}>Postup</h2>
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={visibleStepSource === recipe.id ? "default" : "outline"} onClick={() => setStepSource(recipe.id)}>
              {recipe.title}
            </Button>
            {selected.map((companion) => (
              <Button
                key={companion.recipe.id}
                type="button"
                variant={visibleStepSource === companion.recipe.id ? "default" : "outline"}
                onClick={() => setStepSource(companion.recipe.id)}
              >
                {companion.recipe.title}
              </Button>
            ))}
          </div>
        ) : null}
        <ol className="flex flex-col gap-3">
          {active.steps.map((step) => {
            const key = `step:${active.id}:${step.id}`
            const isChecked = Boolean(checked[key])
            return (
              <li key={step.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => setChecked((current) => ({ ...current, [key]: !current[key] }))}
                  className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left"
                >
                  <span
                    className={cn(
                      "grid shrink-0 place-items-center rounded-lg border font-mono",
                      cooking ? "size-12 text-lg" : "size-11",
                      isChecked ? "border-primary bg-primary text-primary-foreground" : "",
                    )}
                  >
                    {isChecked ? <Check /> : step.stepNumber}
                  </span>
                  <span className={cn("pt-2 leading-relaxed", cooking ? "text-2xl" : "text-base", isChecked && "text-muted-foreground line-through")}>
                    {step.instruction}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        {active.steps.length === 0 ? <p className="text-muted-foreground">Postup zatím chybí.</p> : null}
      </section>
    </article>
  )
}
