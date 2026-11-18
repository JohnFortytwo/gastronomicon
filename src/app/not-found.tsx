import Link from "next/link"
import { PANIC_TITLE } from "@/lib/kitchen/constants"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-6">
      <p className="font-mono text-xs tracking-[0.28em] text-primary">404</p>
      <h1 className="font-heading text-4xl leading-tight">{PANIC_TITLE}</h1>
      <p className="text-base text-muted-foreground">
        Tahle souřadnice v kuchařce není. Vraťte se k průvodci, než vystydne večeře.
      </p>
      <Link href="/" className={buttonVariants()}>
        Zpět do průvodce
      </Link>
    </main>
  )
}
