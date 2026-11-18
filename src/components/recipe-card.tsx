import Link from "next/link"
import { Star } from "lucide-react"
import { CATEGORY_LABEL } from "@/lib/kitchen/constants"
import { formatMinutes } from "@/lib/kitchen/format"
import type { RecipeFeedItem } from "@/types/recipe-view"
import { Badge } from "@/components/ui/badge"

export function RecipeCard({ recipe, householdId }: { recipe: RecipeFeedItem; householdId: string }) {
  const prep = formatMinutes(recipe.prepTimeMins)
  const cook = formatMinutes(recipe.cookTimeMins)
  const shared = recipe.isPublic && recipe.householdId !== householdId

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex min-h-11 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors active:bg-secondary"
    >
      {recipe.imageUrl ? (
        // User-supplied recipe photos are arbitrary remote URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/7] items-end bg-secondary px-4 py-3">
          <span className="font-heading text-3xl text-primary/80">{recipe.title.slice(0, 1)}</span>
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{CATEGORY_LABEL[recipe.category]}</Badge>
          {shared ? <Badge variant="outline">Od přátel</Badge> : null}
          {recipe.isPublic && !shared ? <Badge variant="outline">Sdíleno</Badge> : null}
        </div>
        <h2 className="font-heading text-2xl leading-tight">{recipe.title}</h2>
        {recipe.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
        ) : null}
        <p className="font-mono text-xs text-muted-foreground">
          {[prep ? `příprava ${prep}` : null, cook ? `vaření ${cook}` : null, `${recipe.basePortions} porcí`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {recipe.heroIngredients.length > 0 ? (
          <p className="flex items-center gap-1.5 text-sm">
            <Star className="size-4 fill-primary text-primary" aria-hidden />
            {recipe.heroIngredients.slice(0, 3).join(", ")}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
