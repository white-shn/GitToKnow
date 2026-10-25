import { useCallback, useEffect, useState } from 'react'
import { getPullRequestAiReview, getPullRequestReview } from '@/api/repos'

const LOADING = { status: 'loading', review: null, error: null }
const AI_LOADING = { status: 'loading', text: '', detail: '' }

/**
 * Loads the rule-based PR review first, then the AI commentary on it, so the scores show without waiting for the LLM.
 * status: 'loading' | 'ready' | 'error'; ai.status: 'loading' | 'ok' | 'not_configured' | 'unavailable' | 'no_prs'.
 */
export function usePullRequestReview(repoId) {
  const [state, setState] = useState(LOADING)
  const [ai, setAi] = useState(AI_LOADING)
  const [request, setRequest] = useState({ attempt: 0, refresh: false })

  useEffect(() => {
    if (!repoId) return // no repo analysed yet
    const controller = new AbortController()
    const { signal } = controller
    const { refresh } = request
    getPullRequestReview(repoId, { refresh, signal })
      .then((review) => {
        setState({ status: 'ready', review, error: null })
        if (!review.open_pr_count) return setAi({ ...AI_LOADING, status: 'no_prs' })
        return getPullRequestAiReview(repoId, { refresh, signal }).then((data) =>
          setAi({ status: data.ai_status, text: data.ai_review ?? '', detail: data.ai_detail ?? '' }),
        )
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        // A failure of the AI call must not hide a review that already loaded.
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', review: null, error: err.message }))
        setAi((prev) => (prev.status === 'loading' ? { ...AI_LOADING, status: 'unavailable', detail: err.message } : prev))
      })
    return () => controller.abort()
  }, [repoId, request])

  const reload = useCallback((refresh = false) => {
    setState(LOADING)
    setAi(AI_LOADING)
    setRequest((r) => ({ attempt: r.attempt + 1, refresh }))
  }, [])
  return { ...state, ai, reload }
}
