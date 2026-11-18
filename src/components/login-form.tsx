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
  const [mode, setMode] = useState<"in" | "up">("in")
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

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setPending(true)
    const supabase = createClient()
    const result =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password })
    setPending(false)
    if (result.error) {
      setError("Přihlášení se nepovedlo. Zkontrolujte e-mail a heslo.")
      return
    }
    if (mode === "up" && !result.data.session) {
      setMessage("Účet vznikl. Potvrďte ho e-mailem a pak se přihlaste.")
      return
    }
    router.replace("/")
    router.refresh()
  }

  async function sendLink() {
    setError(null)
    setMessage(null)
    if (!email.trim()) {
      setError("Nejdřív napište e-mail.")
      return
    }
    setPending(true)
    const supabase = createClient()
    const { error: linkError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setPending(false)
    if (linkError) {
      setError("Odkaz se nepodařilo odeslat.")
      return
    }
    setMessage("Pokud je adresa v pořádku, odkaz už letí do schránky.")
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">VSTUP</p>
        <CardTitle className="font-heading text-3xl">Gastronomicon</CardTitle>
        <CardDescription className="text-base">Stejný účet jako u sousedního projektu. Kuchyně má vlastní stůl.</CardDescription>
      </CardHeader>
      <CardContent>
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
              autoComplete={mode === "in" ? "current-password" : "new-password"}
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
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Ověřuji…" : mode === "in" ? "Přihlásit se" : "Vytvořit účet"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Nemám účet" : "Už účet mám"}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={sendLink}>
            Poslat magický odkaz
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
