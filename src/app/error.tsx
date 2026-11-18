"use client"

import { PANIC_TITLE } from "@/lib/kitchen/constants"
import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-6">
      <p className="font-mono text-xs tracking-[0.28em] text-primary">PORUCHA</p>
      <h1 className="font-heading text-4xl leading-tight">{PANIC_TITLE}</h1>
      <p className="text-base text-muted-foreground">Něco se v kuchyni zaseklo. Zkuste to ještě jednou.</p>
      <Button type="button" onClick={reset}>
        Zkusit znovu
      </Button>
    </main>
  )
}
