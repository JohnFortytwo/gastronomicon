"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { SetupCard } from "@/components/setup-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [view, setView] = useState<"in" | "reset">("in")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!hasSupabaseEnv()) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="font-mono text-[11px] tracking-[0.28em] text-primary">VSTUP</p>
          <h1 className="mt-2 font-heading text-4xl">Gastronomicon</h1>
        </header>
        <SetupCard />
      </div>
    )
  }

  function showLogin() {
    setView("in")
    setError(null)
    setMessage(null)
  }

  function showReset() {
    setView("reset")
    setPassword("")
    setError(null)
    setMessage(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setPending(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setPending(false)
    if (signInError) {
      setError("Přihlášení se nepovedlo. Zkontrolujte e-mail a heslo.")
      return
    }
    router.replace("/")
    router.refresh()
  }

  async function sendReset(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setPending(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/recovery`,
    })
    setPending(false)
    if (resetError) {
      setError("Odkaz se nepodařilo odeslat.")
      return
    }
    setMessage("Pokud k tomuto e-mailu účet patří, odkaz na obnovu už letí do schránky.")
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">{view === "in" ? "VSTUP" : "OBNOVA"}</p>
        <CardTitle className="font-heading text-3xl">Gastronomicon</CardTitle>
        <CardDescription className="text-base">
          {view === "in"
            ? "Stejný účet jako u sousedního projektu. Kuchyně má vlastní stůl."
            : "Pošleme odkaz na e-mail existujícího účtu. Nové heslo si nastavíte až po jeho otevření."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {view === "in" ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vy@domacnost.cz"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Ověřuji…" : "Přihlásit se"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={showReset}>
              Zapomněli jste heslo?
            </Button>
          </form>
        ) : (
          <form onSubmit={sendReset} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vy@domacnost.cz"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Odesílám…" : "Odeslat odkaz na obnovu"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={showLogin}>
              Zpět na přihlášení
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
