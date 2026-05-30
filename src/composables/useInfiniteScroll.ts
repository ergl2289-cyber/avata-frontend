import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * Fires `onLoadMore` when a sentinel element scrolls into view.
 * Attach the returned `sentinel` ref to a small element at the end of the list.
 */
export function useInfiniteScroll(onLoadMore: () => void, rootMargin = '400px') {
  const sentinel = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!sentinel.value) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { rootMargin },
    )
    observer.observe(sentinel.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { sentinel } as { sentinel: Ref<HTMLElement | null> }
}
