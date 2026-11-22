import "server-only"

import { parseModelJson, type ExtractedRecipe } from "@/lib/ai/parse-recipe"
import { ESTIMATE_UNIT } from "@/lib/kitchen/constants"

const PROMPT = `Jsi kuchyňský archivář. Z dodaného textu nebo fotky vytáhni jeden recept a vrať pouze JSON v tomto tvaru:
{
  "title": "string",
  "description": "string nebo null",
  "category": "main | soup | side | dessert | starter",
  "prep_time_mins": number nebo null,
  "cook_time_mins": number nebo null,
  "base_portions": number,
  "calories_per_portion": number nebo null,
  "kaloricke_tabulky_name": "string nebo null",
  "ingredients": [{ "name": "string", "amount": number nebo null, "unit": "g | ml | ks | ${ESTIMATE_UNIT} nebo null", "category": null, "is_hero": boolean }],
  "steps": [{ "step_number": number, "instruction": "string" }]
}
Zachovej jazyk zdroje. Hlavní surovinu jídla označ is_hero true, sůl, tuk a vodu nech false. Nevymýšlej suroviny, které ve zdroji nejsou. Jednotku suroviny uveď jen jako g, ml, ks, nebo "${ESTIMATE_UNIT}". "${ESTIMATE_UNIT}" použij, když zdroj množství neudává přesně a kuchař ho má odhadnout, třeba sůl, pepř nebo koření. V tom případě dej amount null. Když množství jednotku nemá a nejde o odhad, dej unit null.`

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) {
    return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")
  }

  const a = Number(ipv4[1])
  const b = Number(ipv4[2])
  if (a === 10 || a === 127 || a === 0 || a >= 224) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function isTimeout(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError" || /aborted due to timeout/i.test(error.message))
  )
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000)
}

async function readPublicText(rawUrl: string) {
  let current: URL
  try {
    current = new URL(rawUrl)
  } catch {
    throw new Error("Adresa receptu není platná.")
  }
  if (current.protocol !== "http:" && current.protocol !== "https:") {
    throw new Error("Povolené jsou jen adresy http a https.")
  }

  for (let hop = 0; hop < 3; hop += 1) {
    if (isBlockedHost(current.hostname)) {
      throw new Error("Tahle adresa vede do soukromé sítě. Použijte veřejný odkaz.")
    }
    let response: Response
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers: {
          accept: "text/html, text/plain, application/json",
          "user-agent": "Gastronomicon/1.0 (recipe import)",
        },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      })
    } catch (error) {
      if (isTimeout(error)) throw new Error("Stránku s receptem se nepodařilo včas otevřít.")
      throw new Error("Stránku s receptem se nepodařilo otevřít.")
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new Error("Přesměrování receptu nemá cíl.")
      current = new URL(location, current)
      continue
    }
    if (!response.ok) throw new Error("Stránku s receptem se nepodařilo otevřít.")
    const type = response.headers.get("content-type") ?? ""
    if (!/text\/html|text\/plain|application\/json|application\/xhtml/.test(type)) {
      throw new Error("Odkaz neukazuje na textovou stránku s receptem.")
    }
    const text = htmlToText(await response.text())
    if (!text) throw new Error("Na stránce nebyl žádný čitelný text.")
    return text
  }

  throw new Error("Příliš mnoho přesměrování.")
}

async function askGemini(parts: Array<Record<string, unknown>>): Promise<ExtractedRecipe> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("Gemini API není nakonfigurované. Doplňte GEMINI_API_KEY.")
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: PROMPT }, ...parts] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    )
  } catch (error) {
    if (isTimeout(error)) throw new Error("Model nestihl odpovědět. Zkuste import znovu za chvíli.")
    throw new Error("Galaktická kuchyně teď neodpovídá. Zkuste import znovu za chvíli.")
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).replace(/AIza[0-9A-Za-z_-]{10,}/g, "[key]").slice(0, 300)
    console.error("Gemini import failed", response.status, detail)
    throw new Error("Galaktická kuchyně teď neodpovídá. Zkuste import znovu za chvíli.")
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
  }
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.filter((part) => part.thought !== true)
      .map((part) => part.text ?? "")
      .join("") ?? ""
  if (!text) throw new Error("Model nevrátil recept.")

  try {
    const recipe = parseModelJson(text)
    if (!recipe) throw new Error("prázdné")
    return recipe
  } catch {
    throw new Error("Model vrátil recept, kterému nerozumíme. Zkuste jiný zdroj.")
  }
}

export async function recipePartsFromUrl(url: string) {
  const text = await readPublicText(url)
  return [{ text: `Zdrojová stránka:\n${text}` }]
}

export async function extractPreparedRecipe(parts: Array<Record<string, unknown>>) {
  return askGemini(parts)
}

export async function extractRecipeFromUrl(url: string) {
  return extractPreparedRecipe(await recipePartsFromUrl(url))
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export async function recipePartsFromPhoto(imageBase64: string, mimeType: string) {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Podporujeme fotky JPEG, PNG, WEBP a GIF.")
  }
  const data = imageBase64.replace(/^data:[^;]+;base64,/, "")
  if (!data || data.length > 5_500_000) {
    throw new Error("Fotka je příliš velká. Použijte snímek do 4 MB.")
  }
  return [
    {
      inlineData: {
        mimeType,
        data,
      },
    },
  ]
}

export async function extractRecipeFromPhoto(imageBase64: string, mimeType: string) {
  return extractPreparedRecipe(await recipePartsFromPhoto(imageBase64, mimeType))
}

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}
