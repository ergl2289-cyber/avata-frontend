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
const previewPosterUrl = ref<string | null>(null) // captured first frame (data URL)
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

/**
 * Grab a frame as a data URL — the "title photo" of the clip. Two strategies
 * race (first painted frame wins): requestVideoFrameCallback after play()
 * (reliable in WebView, where a plain seek often yields a black canvas) and a
 * seek to ~0.5s (frame 0 is commonly black). 8s safety timeout.
 */
function captureFrame(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f)
    const v = document.createElement('video')
    let settled = false
    const cleanup = () => {
      try {
        v.pause()
        v.removeAttribute('src')
        v.load()
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(url)
    }
    const fail = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('capture failed'))
    }
    const draw = () => {
      if (settled || !v.videoWidth) return
      try {
        const c = document.createElement('canvas')
        c.width = v.videoWidth
        c.height = v.videoHeight
        c.getContext('2d')!.drawImage(v, 0, 0)
        const data = c.toDataURL('image/jpeg', 0.8)
        settled = true
        cleanup()
        resolve(data)
      } catch {
        fail()
      }
    }
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.onerror = fail
    setTimeout(fail, 8000)
    v.onloadedmetadata = () => {
      const anyV = v as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => void
      }
      if (typeof anyV.requestVideoFrameCallback === 'function') {
        anyV.requestVideoFrameCallback(() => draw())
        v.play().catch(() => {
          /* autoplay blocked — the seek path below still fires */
        })
      }
      try {
        v.currentTime = Math.min(0.5, (v.duration || 1) / 2)
      } catch {
        /* ignore — rVFC path may still succeed */
      }
    }
    v.onseeked = () => draw()
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
  // Best-effort title frame (like a photo thumbnail); <video> stays the fallback.
  previewPosterUrl.value = await captureFrame(f).catch(() => null)
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
  previewPosterUrl.value = null
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
  previewPosterUrl.value = null
  error.value = null
  existingPosterUrl.value = posterUrl
  removeExisting.value = false
}

export function useListingVideo() {
  return {
    videoFile: file,
    videoPreviewUrl: previewUrl,
    videoPreviewPosterUrl: previewPosterUrl,
    videoError: error,
    existingPosterUrl,
    removeExisting,
    setVideo,
    clearVideo,
    resetVideoState,
  }
}
