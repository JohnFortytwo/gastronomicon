"use client"

import { Suspense, type ReactNode } from "react"
import { useCookMode, CookModeProvider } from "@/components/cook-mode"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"
import { cn } from "@/lib/utils"

function ShellFrame({ children }: { children: ReactNode }) {
  const { cookMode } = useCookMode()

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Přeskočit na obsah
      </a>
      {cookMode ? null : <Header />}
      <main id="obsah" className={cn("mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-5", cookMode ? "pb-10" : "pb-28")}>
        {children}
        {cookMode ? null : (
          <p className="pt-8 text-center font-mono text-[10px] tracking-widest text-muted-foreground">
            Ručník nezapomeň · 42
          </p>
        )}
      </main>
      {cookMode ? null : (
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CookModeProvider>
      <ShellFrame>{children}</ShellFrame>
    </CookModeProvider>
  )
}
