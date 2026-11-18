import "server-only"

import type { User } from "@supabase/supabase-js"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import type { KitchenHousehold, KitchenProfile } from "@/types/database"

export type KitchenAccess =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "needs-household"; user: User }
  | {
      status: "ready"
      user: User
      profile: KitchenProfile & { household_id: string }
      household: KitchenHousehold
    }

export async function getKitchenAccess(): Promise<KitchenAccess> {
  if (!hasSupabaseEnv()) return { status: "unconfigured" }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return { status: "anonymous" }

  const { data: profile } = await supabase
    .from("kitchen_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.household_id) return { status: "needs-household", user }

  const { data: household } = await supabase
    .from("kitchen_households")
    .select("*")
    .eq("id", profile.household_id)
    .maybeSingle()

  if (!household) return { status: "needs-household", user }

  return {
    status: "ready",
    user,
    profile: { ...profile, household_id: profile.household_id },
    household,
  }
}
