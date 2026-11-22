"use client"

import Link from "next/link"
import { AccountMenu } from "@/components/account-menu"
import { BrandLogo } from "@/components/brand-logo"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header({ accountLabel }: { accountLabel: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-lg items-center justify-between gap-3 px-4 py-2">
        <Link href="/" aria-label="Úvod" className="flex min-h-11 min-w-11 items-center">
          <BrandLogo />
        </Link>
        <div className="flex items-start gap-2">
          <ThemeToggle />
          <AccountMenu label={accountLabel} />
        </div>
      </div>
    </header>
  )
}
