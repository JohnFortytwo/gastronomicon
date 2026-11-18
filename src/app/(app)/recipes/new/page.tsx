import { Suspense } from "react"
import { redirect } from "next/navigation"
import { GalacticLoader } from "@/components/galactic-loader"
import { OnboardingCard } from "@/components/onboarding-card"
import { RecipeCreator } from "@/components/recipe-creator"
import { SetupCard } from "@/components/setup-card"
import { getKitchenAccess } from "@/lib/kitchen/context"
import { listPickerRecipes } from "@/lib/kitchen/queries"

export default function NewRecipePage() {
  return (
    <Suspense fallback={<GalacticLoader />}>
      <NewRecipeContent />
    </Suspense>
  )
}

async function NewRecipeContent() {
  const access = await getKitchenAccess()
  if (access.status === "anonymous") redirect("/login")
  if (access.status === "unconfigured") {
    return (
      <div className="flex flex-col gap-6">
        <SetupCard />
        <RecipeCreator householdId="" recipes={[]} locked />
      </div>
    )
  }
  if (access.status === "needs-household") return <OnboardingCard />

  const recipes = await listPickerRecipes(access.household.id)
  return <RecipeCreator householdId={access.household.id} recipes={recipes} />
}
