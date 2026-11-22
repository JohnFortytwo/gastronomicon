import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasSupabaseEnv } from "@/lib/supabase/env"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  if (!hasSupabaseEnv() || !code) {
    return NextResponse.redirect(new URL("/login", url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  const destination = new URL(error ? "/login" : "/obnova-hesla", url.origin)
  return NextResponse.redirect(destination)
}
