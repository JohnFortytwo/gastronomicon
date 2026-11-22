"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { EarnedBadges } from "@/components/earned-badges"

const itemClass =
  "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-base outline-none transition hover:bg-muted focus-visible:bg-muted"

export function AccountMenu({ label }: { label: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const name = label.trim() || "Účet"
  const initial = name.slice(0, 1).toLocaleUpperCase("cs")

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  async function signOut() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.replace("/login")
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-1 pr-2.5 pl-1 text-base font-medium text-foreground"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="max-w-24 truncate sm:max-w-40">{name}</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          >
            <path
              fill="currentColor"
              d="M5.2 7.4a.75.75 0 0 1 1.06.04L10 11.3l3.74-3.86a.75.75 0 1 1 1.08 1.04l-4.28 4.42a.75.75 0 0 1-1.08 0L5.16 8.48a.75.75 0 0 1 .04-1.08Z"
            />
          </svg>
        </button>
        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-30 mt-2 w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <Link href="/jmeno" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              Změnit jméno
            </Link>
            <Link href="/heslo" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              Změnit heslo
            </Link>
            <Link href="/odznaky" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              Odznaky
            </Link>
            <div className="my-1 border-t" />
            <button type="button" role="menuitem" className={itemClass} disabled={pending} onClick={signOut}>
              Odhlásit se
            </button>
          </div>
        ) : null}
      </div>
      <EarnedBadges />
    </div>
  )
}
