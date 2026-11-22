import type { Metadata } from "next"
import { BadgeBoard } from "@/components/badge-board"

export const metadata: Metadata = {
  title: "Odznaky",
}

export default function BadgesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">ODZNAKY</p>
        <h1 className="mt-2 font-heading text-4xl">Odznaky</h1>
        <p className="mt-3 text-base text-muted-foreground">Tady jsou odznaky, které už máte.</p>
      </header>
      <BadgeBoard />
    </div>
  )
}
