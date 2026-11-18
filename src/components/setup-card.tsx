import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SetupCard() {
  return (
    <Card>
      <CardHeader>
        <p className="font-mono text-[11px] tracking-[0.28em] text-primary">PŘIPOJENÍ</p>
        <CardTitle className="font-heading text-2xl">Kuchyně ještě nemá souřadnice</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          Doplňte ve <span className="font-mono text-foreground">.env.local</span> adresu sdíleného Supabase a anon klíč.
          Tabulky této aplikace začínají na <span className="font-mono text-foreground">kitchen_</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 font-mono text-sm">
        <p>NEXT_PUBLIC_SUPABASE_URL</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        <p>GEMINI_API_KEY</p>
      </CardContent>
    </Card>
  )
}
