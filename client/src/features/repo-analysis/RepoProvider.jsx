import { useCallback, useMemo, useState } from 'react'
import CodeViewerDialog from '@/features/code-viewer/CodeViewerDialog'
import { RepoContext } from './RepoContext'

/**
 * Shares the analysis with every tab and owns the code viewer, so the file tree, graph details and chat
 * citations can all open a file with `openFile(path, { start_line, end_line })`.
 */
export default function RepoProvider({ analysis, children }) {
  const [target, setTarget] = useState(null)

  const fileInfo = useMemo(() => new Map(analysis.files.map((f) => [f.path, f])), [analysis])
  const openFile = useCallback(
    (path, range) => setTarget({ path, startLine: range?.start_line ?? null, endLine: range?.end_line ?? null }),
    [],
  )
  const value = useMemo(
    () => ({ analysis, repoId: analysis.repo_id, fileInfo, openFile }),
    [analysis, fileInfo, openFile],
  )

  return (
    <RepoContext value={value}>
      {children}
      <CodeViewerDialog repoId={analysis.repo_id} target={target} onClose={() => setTarget(null)} />
    </RepoContext>
  )
}
