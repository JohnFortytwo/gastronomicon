"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-h-11 min-w-11 flex-col justify-center">
          <span className="block font-mono text-[10px] tracking-[0.28em] text-primary">KUCHYŇSKÝ TERMINÁL</span>
          <span className="font-heading text-xl leading-none">Gastronomicon</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
