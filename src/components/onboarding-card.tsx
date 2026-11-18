"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function OnboardingCard() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [householdName, setHouseholdName] = useState("")
  const [householdCode, setHouseholdCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function createHousehold() {
    setError(null)
    if (!householdName.trim() || !displayName.trim()) {
      setError("Vyplňte jméno i název domácnosti.")
      return
    }
    setPending(true)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("kitchen_create_household", {
      household_name: householdName.trim(),
      display_name: displayName.trim(),
    })
    setPending(false)
    if (rpcError) {
      setError("Domácnost se nepodařilo založit. Spusťte migraci kitchen_ ve sdíleném Supabase.")
      return
    }
    router.refresh()
  }

  async function joinHousehold() {
    setError(null)
    if (!displayName.trim() || !UUID_RE.test(householdCode.trim())) {
      setError("Zadejte své jméno a celý kód domácnosti.")
      return
    }
    setPending(true)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("kitchen_join_household", {
      target_household_id: householdCode.trim(),
      display_name: displayName.trim(),
    })
    setPending(false)
    if (rpcError) {
      const missing = rpcError.message.toLowerCase().includes("neexistuje")
      setError(missing ? "Domácnost s tímto kódem v galaxii neevidujeme." : "Připojení se nepovedlo. Zkontrolujte kód i migraci.")
      return
    }
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">PALUBA</p>
        <CardTitle className="font-heading text-2xl">Kam patří vaše kuchyně?</CardTitle>
        <CardDescription className="text-base">
          Založte domácnost, nebo se připojte kódem, který vám pošle někdo od stolu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="!h-auto min-h-11 w-full">
            <TabsTrigger value="create" className="min-h-11 flex-1">
              Založit
            </TabsTrigger>
            <TabsTrigger value="join" className="min-h-11 flex-1">
              Připojit se
            </TabsTrigger>
          </TabsList>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="display-name">Jak vám máme říkat</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Jan"
                autoComplete="nickname"
              />
            </div>
            <TabsContent value="create" className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="household-name">Název domácnosti</Label>
                <Input
                  id="household-name"
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  placeholder="Kuchyně na konečné"
                />
              </div>
              <Button type="button" disabled={pending} onClick={createHousehold}>
                {pending ? "Zakládám…" : "Založit domácnost"}
              </Button>
            </TabsContent>
            <TabsContent value="join" className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="household-code">Kód domácnosti</Label>
                <Input
                  id="household-code"
                  value={householdCode}
                  onChange={(event) => setHouseholdCode(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p className="text-sm text-muted-foreground">
                  Je to dlouhý identifikátor, ne heslo. Najdete ho na úvodní obrazovce domácnosti.
                </p>
              </div>
              <Button type="button" disabled={pending} onClick={joinHousehold}>
                {pending ? "Připojuji…" : "Připojit se ke stolu"}
              </Button>
            </TabsContent>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </Tabs>
      </CardContent>
    </Card>
  )
}
