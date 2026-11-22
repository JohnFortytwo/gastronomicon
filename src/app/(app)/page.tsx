import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { GalacticLoader } from "@/components/galactic-loader"
import { HomeGuide } from "@/components/home-guide"
import { OnboardingCard } from "@/components/onboarding-card"
import { SetupCard } from "@/components/setup-card"
import { buttonVariants } from "@/components/ui/button"
import { getKitchenAccess } from "@/lib/kitchen/context"
import { listFeed } from "@/lib/kitchen/queries"

export default function HomePage() {
  return (
    <Suspense fallback={<GalacticLoader />}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  await connection()
  const access = await getKitchenAccess()
  if (access.status === "anonymous") redirect("/login")
  if (access.status === "unconfigured") {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="font-mono text-[11px] tracking-[0.28em] text-primary">PRŮVODCE</p>
          <h1 className="font-heading text-4xl leading-none">Co uvařit?</h1>
        </header>
        <SetupCard />
        <Link href="/recipes/nahled" className={buttonVariants()}>
          Prohlédnout ukázkový recept
        </Link>
      </div>
    )
  }
  if (access.status === "needs-household") return <OnboardingCard />

  const feed = await listFeed(access.household.id)
  return (
    <HomeGuide
      householdId={access.household.id}
      householdName={access.household.name}
      recipes={feed.recipes}
      error={feed.error}
    />
  )
}
