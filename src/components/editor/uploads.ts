export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Formats every browser can display and the annotation canvas can draw
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

// Upload ids of image placeholders whose upload is still running in this tab.
// A placeholder that isn't in here was left behind by an interrupted upload.
export const activeUploads = new Set<string>()

export function imageFileError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" can't be added. Use a PNG, JPEG, GIF or WebP image.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `"${file.name}" is ${mb} MB. Images can be up to ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`
  }
  return null
}
