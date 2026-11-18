"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "Průvodce", icon: House },
  { href: "/recipes/new", label: "Nový recept", icon: Plus },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-lg grid-cols-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-sm",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
