import { Suspense } from "react"
import { redirect } from "next/navigation"
import { GalacticLoader } from "@/components/galactic-loader"
import { OnboardingCard } from "@/components/onboarding-card"
import { RecipeCreator } from "@/components/recipe-creator"
import { SetupCard } from "@/components/setup-card"
import { getKitchenAccess } from "@/lib/kitchen/context"
import { AI_MONTHLY_LIMIT } from "@/lib/kitchen/constants"
import { listPickerRecipes, monthlyAiCallCount } from "@/lib/kitchen/queries"

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

  const [recipes, usedCalls] = await Promise.all([
    listPickerRecipes(access.household.id),
    monthlyAiCallCount(access.household.id),
  ])
  const aiRemaining = usedCalls == null ? null : Math.max(0, AI_MONTHLY_LIMIT - usedCalls)
  return <RecipeCreator householdId={access.household.id} recipes={recipes} aiRemaining={aiRemaining} />
}
