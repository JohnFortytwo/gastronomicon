import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { GalacticLoader } from "@/components/galactic-loader"
import { OnboardingCard } from "@/components/onboarding-card"
import { RecipeStudio } from "@/components/recipe-studio"
import { SetupCard } from "@/components/setup-card"
import { getKitchenAccess } from "@/lib/kitchen/context"
import { getRecipeStudio } from "@/lib/kitchen/queries"
import { sampleCompanions, sampleDefaults, sampleRecipe } from "@/lib/kitchen/sample-recipe"

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<GalacticLoader />}>
      <RecipeContent params={params} />
    </Suspense>
  )
}

async function RecipeContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await getKitchenAccess()

  if (access.status === "unconfigured" && id === "nahled") {
    return (
      <RecipeStudio
        recipe={sampleRecipe}
        companions={sampleCompanions}
        defaults={sampleDefaults}
        preview
      />
    )
  }

  if (access.status === "anonymous") redirect("/login")
  if (access.status === "unconfigured") return <SetupCard />
  if (access.status === "needs-household") return <OnboardingCard />

  const result = await getRecipeStudio(id)
  if ("error" in result) {
    return <p className="rounded-xl border border-destructive/40 px-4 py-3 text-sm">{result.error}</p>
  }
  if (!result.recipe) notFound()

  return (
    <RecipeStudio
      recipe={result.recipe}
      companions={result.companions}
      defaults={{
        adults: access.profile.default_adults,
        kids: access.profile.default_kids,
        gourmands: access.profile.default_gourmands,
      }}
    />
  )
}
