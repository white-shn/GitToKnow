import { useCallback, useEffect, useState } from 'react'
import { getOverview } from '@/api/repos'

const LOADING = { status: 'loading', overview: '', error: null }

/** Loads the AI overview. status: 'loading' | 'ready' | 'error'. A new repo remounts the caller, so state starts fresh. */
export function useOverview(repoId) {
  const [state, setState] = useState(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!repoId) return // no repo analysed yet (landing page)
    const controller = new AbortController()
    getOverview(repoId, controller.signal)
      .then((data) => setState({ status: 'ready', overview: data.overview, error: null }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', overview: '', error: err.message })
      })
    return () => controller.abort()
  }, [repoId, attempt])

  const retry = useCallback(() => {
    setState(LOADING)
    setAttempt((n) => n + 1)
  }, [])
  return { ...state, retry }
}
