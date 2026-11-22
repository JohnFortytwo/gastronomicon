import type { Metadata } from "next"
import Link from "next/link"
import { DisplayNameForm } from "@/components/display-name-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loadKitchenAccount } from "@/lib/kitchen/account"

export const metadata: Metadata = {
  title: "Jméno",
}

export default async function DisplayNamePage() {
  const account = await loadKitchenAccount()

  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">ÚČET</p>
        <CardTitle className="font-heading text-3xl">Uživatelské jméno</CardTitle>
        <CardDescription className="text-base">
          Jméno, pod kterým vás uvidí ostatní u stolu. Přihlášení zůstává přes e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DisplayNameForm displayName={account.displayName} />
        <Link href="/" className="min-h-11 text-center text-base text-primary">
          Zpět na úvod
        </Link>
      </CardContent>
    </Card>
  )
}
