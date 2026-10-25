import { useEffect, useState } from 'react'
import { getIndexStatus } from '@/api/repos'

const FAST_MS = 2500 // while nothing is usable yet
const SLOW_MS = 6000 // chat already works, remaining files still being indexed

/** Polls the chat index until it is fully built. status: 'pending' | 'indexing' | 'ready' | 'failed'. */
export function useIndexStatus(repoId) {
  const [state, setState] = useState({ status: 'pending', progress: 0, error: null })

  useEffect(() => {
    if (!repoId) return
    let cancelled = false
    let timer
    const controller = new AbortController()

    async function poll() {
      try {
        const s = await getIndexStatus(repoId, controller.signal)
        if (cancelled) return
        setState({ status: s.index_status, progress: s.progress, error: s.error ?? null })
        const done = s.index_status === 'failed' || (s.index_status === 'ready' && s.progress >= 1)
        if (!done) timer = setTimeout(poll, s.index_status === 'ready' ? SLOW_MS : FAST_MS)
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') timer = setTimeout(poll, SLOW_MS)
      }
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [repoId])

  return state
}
