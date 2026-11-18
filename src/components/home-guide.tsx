"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, LogOut } from "lucide-react"
import { RECIPE_CATEGORIES } from "@/lib/kitchen/constants"
import { foldCzech } from "@/lib/kitchen/format"
import type { RecipeCategory } from "@/types/database"
import type { RecipeFeedItem } from "@/types/recipe-view"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Mode = "hero" | "menu"
type Scope = "household" | "friends"

export function HomeGuide({
  householdId,
  householdName,
  recipes,
  error,
}: {
  householdId: string
  householdName: string
  recipes: RecipeFeedItem[]
  error: string | null
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("hero")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<RecipeCategory | "all">("all")
  const [scope, setScope] = useState<Scope>("household")
  const [copied, setCopied] = useState(false)

  const heroes = useMemo(() => {
    const names = new Set<string>()
    for (const recipe of recipes) {
      if (recipe.householdId !== householdId && !recipe.isPublic) continue
      for (const hero of recipe.heroIngredients) names.add(hero)
    }
    return [...names].sort((a, b) => a.localeCompare(b, "cs")).slice(0, 16)
  }, [householdId, recipes])

  const visible = recipes.filter((recipe) => {
    if (mode === "hero") {
      const folded = foldCzech(query)
      if (!folded) return recipe.heroIngredients.length > 0 || recipe.householdId === householdId
      return (
        recipe.heroIngredients.some((hero) => foldCzech(hero).includes(folded)) ||
        foldCzech(recipe.title).includes(folded)
      )
    }
    const inScope =
      scope === "household" ? recipe.householdId === householdId : recipe.isPublic && recipe.householdId !== householdId
    const inCategory = category === "all" || recipe.category === category
    return inScope && inCategory
  })

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(householdId)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">PRŮVODCE</p>
        <h1 className="font-heading text-4xl leading-none">Co uvařit?</h1>
        <p className="text-base text-muted-foreground">{householdName}. Dvě cesty, jeden stůl.</p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Kód domácnosti</p>
        <p className="mt-1 font-mono text-sm break-all">{householdId}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copyCode}>
            <Copy />
            {copied ? "Zkopírováno" : "Kopírovat kód"}
          </Button>
          <Button type="button" variant="ghost" onClick={signOut}>
            <LogOut />
            Odhlásit se
          </Button>
        </div>
      </section>

      <div className="grid gap-3">
        <button
          type="button"
          className={cn(
            "min-h-11 rounded-2xl border p-4 text-left",
            mode === "hero" ? "border-primary bg-primary/10" : "bg-card",
          )}
          onClick={() => setMode("hero")}
        >
          <span className="block font-heading text-xl">Hledám podle suroviny</span>
          <span className="text-sm text-muted-foreground">Hrdina v lednici rozhodne.</span>
        </button>
        <button
          type="button"
          className={cn(
            "min-h-11 rounded-2xl border p-4 text-left",
            mode === "menu" ? "border-primary bg-primary/10" : "bg-card",
          )}
          onClick={() => setMode("menu")}
        >
          <span className="block font-heading text-xl">Stavím menu od hlavy</span>
          <span className="text-sm text-muted-foreground">Nejdřív chod, potom zbytek stolu.</span>
        </button>
      </div>

      {mode === "hero" ? (
        <div className="flex flex-col gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Třeba kuře, paprika, dýně"
            aria-label="Hledat podle hrdinské suroviny"
          />
          <div className="flex flex-wrap gap-2">
            {heroes.map((hero) => (
              <Button
                key={hero}
                type="button"
                variant={foldCzech(query) === foldCzech(hero) ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setQuery(hero)}
              >
                {hero}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={scope === "household" ? "default" : "outline"} onClick={() => setScope("household")}>
              Moje domácnost
            </Button>
            <Button type="button" variant={scope === "friends" ? "default" : "outline"} onClick={() => setScope("friends")}>
              Sdílené od přátel
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={category === "all" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setCategory("all")}
            >
              Vše
            </Button>
            {RECIPE_CATEGORIES.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={category === item.value ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setCategory(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-widest text-muted-foreground">
          {visible.length} {visible.length === 1 ? "recept" : visible.length > 1 && visible.length < 5 ? "recepty" : "receptů"}
        </p>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-center">
            <p className="font-heading text-2xl">V tomhle sektoru je ticho</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "hero"
                ? "Zkuste jiného hrdinu, nebo hvězdičkou označte hlavní surovinu v novém receptu."
                : scope === "friends"
                  ? "Přátelé zatím nic veřejného nesdílejí."
                  : "Začněte prvním receptem. Základní stůl má rád konkrétní jídlo."}
            </p>
          </div>
        ) : (
          visible.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} householdId={householdId} />)
        )}
      </div>
    </div>
  )
}
