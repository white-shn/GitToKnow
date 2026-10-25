import { useCallback, useMemo, useState } from 'react'
import CodeViewerDialog from '@/features/code-viewer/CodeViewerDialog'
import { RepoContext } from './RepoContext'

const STORAGE_KEY = 'gittoknow_cached_analysis'

function getInitialAnalysis(propAnalysis) {
  if (propAnalysis !== undefined) return propAnalysis
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Shares the analysis with every page/tab and owns the code viewer, so the file tree, graph details and chat
 * citations can all open a file with `openFile(path, { start_line, end_line })`.
 */
export default function RepoProvider({ analysis: propAnalysis, children }) {
  const [internalAnalysis, setInternalAnalysis] = useState(() => getInitialAnalysis(propAnalysis))
  const [target, setTarget] = useState(null)

  const analysis = propAnalysis !== undefined ? propAnalysis : internalAnalysis

  const setAnalysis = useCallback((data) => {
    setInternalAnalysis(data)
    try {
      if (data) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore storage quota errors
    }
  }, [])

  const clearAnalysis = useCallback(() => {
    setInternalAnalysis(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }, [])

  const fileInfo = useMemo(() => {
    if (!analysis?.files) return new Map()
    return new Map(analysis.files.map((f) => [f.path, f]))
  }, [analysis])

  const openFile = useCallback(
    (path, range) => setTarget({ path, startLine: range?.start_line ?? null, endLine: range?.end_line ?? null }),
    [],
  )

  const value = useMemo(
    () => ({
      analysis,
      repoId: analysis?.repo_id ?? null,
      fileInfo,
      openFile,
      setAnalysis,
      clearAnalysis,
    }),
    [analysis, fileInfo, openFile, setAnalysis, clearAnalysis],
  )

  return (
    <RepoContext value={value}>
      {children}
      {analysis?.repo_id && (
        <CodeViewerDialog repoId={analysis.repo_id} target={target} onClose={() => setTarget(null)} />
      )}
    </RepoContext>
  )
}
