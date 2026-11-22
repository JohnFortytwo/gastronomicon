import "server-only"

import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export type KitchenAccount = {
  label: string
  displayName: string
}

export async function loadKitchenAccount(): Promise<KitchenAccount> {
  const fallback: KitchenAccount = { label: "Účet", displayName: "" }
  if (!hasSupabaseEnv()) return fallback

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return fallback

  const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle()

  const nickname = typeof profile?.nickname === "string" ? profile.nickname.trim() : ""
  const emailName = user.email?.split("@")[0]?.trim() ?? ""
  return { label: nickname || emailName || "Účet", displayName: nickname }
}
