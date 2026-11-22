import type { Metadata } from "next"
import Link from "next/link"
import { PasswordChangeForm } from "@/components/password-change-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Heslo",
}

export default function PasswordPage() {
  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">ÚČET</p>
        <CardTitle className="font-heading text-3xl">Změna hesla</CardTitle>
        <CardDescription className="text-base">Zadejte nové heslo k účtu. Platí i pro boardgaming.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PasswordChangeForm />
        <Link href="/" className="min-h-11 text-center text-base text-primary">
          Zpět na úvod
        </Link>
      </CardContent>
    </Card>
  )
}
