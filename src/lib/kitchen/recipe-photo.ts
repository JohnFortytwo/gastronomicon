import type { createClient } from "@/lib/supabase/client"
import { MAX_RECIPE_PHOTO_BYTES, MAX_RECIPE_PHOTOS_PER_USER, RECIPE_PHOTO_BUCKET } from "@/lib/kitchen/constants"

type KitchenClient = ReturnType<typeof createClient>

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const SOURCE_LIMIT_BYTES = 12 * 1024 * 1024
const MAX_EDGE_PX = 1600

export function recipePhotoError(message: string) {
  if (message.includes("kitchen_photo_limit")) {
    return `Limit ${MAX_RECIPE_PHOTOS_PER_USER} fotek na uživatele je plný. Novou přidáte, až se nějaká uvolní.`
  }
  if (message.includes("kitchen_photo_recipe") || message.includes("kitchen_photo_path") || message.includes("kitchen_photo_owner")) {
    return "Fotku se nepodařilo uložit k tomuto receptu."
  }
  if (/bucket not found/i.test(message)) {
    return "Úložiště fotek ještě není zapnuté. V Supabase je potřeba spustit migraci pro fotky receptů."
  }
  if (/mime|content type|invalid file type/i.test(message)) {
    return "Úložiště tuhle fotku nepřijalo. Použijte JPEG, PNG nebo WEBP."
  }
  if (/entity too large|payload too large|exceeded the maximum allowed size|file size/i.test(message)) {
    return "Fotka je větší než 2 MB i po zmenšení."
  }
  return "Fotku se nepodařilo nahrát. Zkuste to znovu."
}

export async function compressRecipePhoto(file: File) {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type
  if (!ACCEPTED_TYPES.has(type)) {
    throw new Error("Fotka musí být JPEG, PNG nebo WEBP.")
  }
  if (file.size > SOURCE_LIMIT_BYTES) {
    throw new Error("Původní fotka je větší než 12 MB. Vyberte menší snímek.")
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error("Fotku se nepodařilo přečíst. Zkuste jiný JPEG, PNG nebo WEBP.")
  }

  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Fotku se nepodařilo zpracovat.")
    context.drawImage(bitmap, 0, 0, width, height)

    for (const quality of [0.82, 0.66, 0.5]) {
      const blob = await canvasToJpeg(canvas, quality)
      if (blob && blob.size <= MAX_RECIPE_PHOTO_BYTES) return blob
    }
    throw new Error("Fotka je i po zmenšení větší než 2 MB.")
  } finally {
    bitmap.close()
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  })
}

export async function countUserRecipePhotos(supabase: KitchenClient, userId: string) {
  const { data, error } = await supabase.storage.from(RECIPE_PHOTO_BUCKET).list(userId, { limit: 100 })
  if (error) return { count: 0, error: error.message }
  const count = (data ?? []).filter((item) => item.metadata && item.name !== ".emptyFolderPlaceholder").length
  return { count, error: null as string | null }
}

export async function attachRecipePhoto(supabase: KitchenClient, userId: string, recipeId: string, blob: Blob) {
  const path = `${userId}/${recipeId}.jpg`
  const { error: uploadError } = await supabase.storage.from(RECIPE_PHOTO_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
    cacheControl: "3600",
  })
  if (uploadError) return { error: recipePhotoError(uploadError.message) }

  const { data } = supabase.storage.from(RECIPE_PHOTO_BUCKET).getPublicUrl(path)
  const { error: updateError } = await supabase
    .from("kitchen_recipes")
    .update({ image_url: data.publicUrl })
    .eq("id", recipeId)

  if (updateError) {
    await supabase.storage.from(RECIPE_PHOTO_BUCKET).remove([path])
    return { error: "Fotka se nahrála, ale k receptu se nepřiřadila. Zkuste uložení znovu." }
  }
  return { error: null as string | null }
}
