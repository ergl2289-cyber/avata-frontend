import { ref } from 'vue'

/**
 * Video state for the listing wizard. Lives outside the ListingForm because a
 * File can't be serialized into a draft (localStorage) — so the video is
 * runtime-only: picked on the photos step, uploaded right after publish.
 *
 * Module-scoped refs: there is only ever one wizard open at a time, and the
 * state must survive step navigation (components mount/unmount per step).
 */

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024 // matches the backend cap
export const VIDEO_MAX_SECONDS = 60

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null) // object URL for the picked file
const error = ref<string | null>(null)
/** Edit mode: poster of the already-uploaded video (shown until replaced/removed). */
const existingPosterUrl = ref<string | null>(null)
/** Edit mode: user removed the existing video → DELETE on save. */
const removeExisting = ref(false)

/** Read the clip duration from metadata without decoding the whole file. */
function probeDuration(f: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(v.duration)
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad video'))
    }
    v.src = url
  })
}

async function setVideo(f: File): Promise<boolean> {
  error.value = null
  if (f.size > VIDEO_MAX_BYTES) {
    error.value = 'Видео слишком большое — до 100 МБ'
    return false
  }
  try {
    const duration = await probeDuration(f)
    if (Number.isFinite(duration) && duration > VIDEO_MAX_SECONDS + 1) {
      error.value = `Видео слишком длинное — до ${VIDEO_MAX_SECONDS} секунд`
      return false
    }
  } catch {
    error.value = 'Не удалось прочитать видео — попробуйте другой файл'
    return false
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
  // A new clip replaces the old one server-side, no separate delete needed.
  removeExisting.value = false
  existingPosterUrl.value = null
  return true
}

/** Remove the picked (or existing) video. */
function clearVideo() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = null
  error.value = null
  if (existingPosterUrl.value) {
    existingPosterUrl.value = null
    removeExisting.value = true
  }
}

/** Reset everything when the wizard opens (new listing or edit prefill). */
function resetVideoState(posterUrl: string | null = null) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  file.value = null
  previewUrl.value = null
  error.value = null
  existingPosterUrl.value = posterUrl
  removeExisting.value = false
}

export function useListingVideo() {
  return {
    videoFile: file,
    videoPreviewUrl: previewUrl,
    videoError: error,
    existingPosterUrl,
    removeExisting,
    setVideo,
    clearVideo,
    resetVideoState,
  }
}
