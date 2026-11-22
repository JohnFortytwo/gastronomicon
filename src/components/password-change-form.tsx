"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PasswordChangeForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (password !== confirm) {
      setError("Hesla se neshodují.")
      return
    }
    if (password.length < 8) {
      setError("Heslo musí mít alespoň 8 znaků.")
      return
    }

    setPending(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      setPending(false)
      setError("Pro změnu hesla se musíte přihlásit.")
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (updateError) {
      setError("Heslo se nepodařilo změnit.")
      return
    }
    setPassword("")
    setConfirm("")
    setMessage("Heslo bylo změněno. Platí i pro boardgaming.")
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="password">Nové heslo</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Potvrzení hesla</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
          minLength={8}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Ukládám…" : "Uložit heslo"}
      </Button>
    </form>
  )
}
