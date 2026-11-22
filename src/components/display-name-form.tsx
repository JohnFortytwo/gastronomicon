"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { displayNameError, normalizeDisplayName } from "@/lib/kitchen/display-name"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const router = useRouter()
  const [name, setName] = useState(displayName)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const next = normalizeDisplayName(name)
    const invalid = displayNameError(next)
    if (invalid) {
      setError(invalid)
      return
    }

    setPending(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) {
      setPending(false)
      setError("Pro změnu jména se musíte přihlásit.")
      return
    }

    const { data: updated, error: updateError } = await supabase
      .from("kitchen_profiles")
      .update({ display_name: next })
      .eq("id", userId)
      .select("id")

    setPending(false)
    if (updateError || !updated?.length) {
      setError("Jméno se nepodařilo změnit. Nejdřív dokončete vstup do kuchyně.")
      return
    }

    setMessage("Jméno bylo změněno.")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="display-name">Jméno</Label>
        <Input
          id="display-name"
          name="display-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={24}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Ukládám…" : "Uložit jméno"}
      </Button>
    </form>
  )
}
