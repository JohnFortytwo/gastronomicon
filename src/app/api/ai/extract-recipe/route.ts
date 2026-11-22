import { NextResponse } from "next/server"
import { AI_MONTHLY_LIMIT } from "@/lib/kitchen/constants"
import { pragueMonthStartIso } from "@/lib/kitchen/month"
import { extractPreparedRecipe, geminiConfigured, recipePartsFromPhoto, recipePartsFromUrl } from "@/lib/ai/gemini"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase není nakonfigurované. Import teď nelze ověřit ani zapsat." },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) {
    return NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("kitchen_profiles")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.household_id) {
    return NextResponse.json({ error: "Nejprve založte nebo připojte domácnost." }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Tělo požadavku není platné JSON." }, { status: 400 })
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const source = payload.source === "photo_ocr" ? "photo_ocr" : payload.source === "url_import" ? "url_import" : null
  if (!source) {
    return NextResponse.json({ error: "Chybí typ importu." }, { status: 400 })
  }

  const monthStart = pragueMonthStartIso()
  const { count, error: countError } = await supabase
    .from("kitchen_ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("household_id", profile.household_id)
    .gte("created_at", monthStart)

  if (countError) {
    return NextResponse.json({ error: "Nepodařilo se ověřit měsíční limit." }, { status: 500 })
  }

  if ((count ?? 0) >= AI_MONTHLY_LIMIT) {
    return NextResponse.json(
      {
        error: "Domácnost tento měsíc vyčerpala 100 volání galaktické kuchyně. Limit se obnoví příští měsíc.",
        remaining: 0,
      },
      { status: 429 },
    )
  }

  if (!geminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API není nakonfigurované. Doplňte GEMINI_API_KEY a formulář vyplňte ručně." },
      { status: 503 },
    )
  }

  const remainingBefore = Math.max(0, AI_MONTHLY_LIMIT - (count ?? 0))

  let parts: Array<Record<string, unknown>>
  try {
    parts =
      source === "url_import"
        ? await recipePartsFromUrl(typeof payload.url === "string" ? payload.url : "")
        : await recipePartsFromPhoto(
            typeof payload.imageBase64 === "string" ? payload.imageBase64 : "",
            typeof payload.mimeType === "string" ? payload.mimeType : "",
          )
  } catch (error) {
    return NextResponse.json({ error: importError(error), remaining: remainingBefore }, { status: 422 })
  }

  const { error: logError } = await supabase.from("kitchen_ai_usage_logs").insert({
    household_id: profile.household_id,
    user_id: user.id,
    action_type: source,
  })

  if (logError) {
    return NextResponse.json({ error: "Volání se nepodařilo zapsat, model jsme nespustili.", remaining: remainingBefore }, { status: 500 })
  }

  const remaining = remainingBefore - 1

  try {
    const recipe = await extractPreparedRecipe(parts)
    return NextResponse.json({ recipe, remaining })
  } catch (error) {
    return NextResponse.json(
      { error: `${importError(error)} Volání se započítalo do měsíčního limitu.`, remaining },
      { status: 502 },
    )
  }
}

function importError(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError" || /aborted due to timeout/i.test(error.message))
  ) {
    return "Model nestihl odpovědět. Zkuste import znovu za chvíli."
  }
  return error instanceof Error ? error.message : "Import se nepovedl."
}
