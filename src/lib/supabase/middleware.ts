import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"
import { hasSupabaseEnv, supabaseEnv } from "@/lib/supabase/env"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!hasSupabaseEnv()) {
    return { response, user: null, configured: false as const }
  }

  const { url, key } = supabaseEnv()
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  return { response, user: data.user, configured: true as const }
}

export function carrySession(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
  return to
}
