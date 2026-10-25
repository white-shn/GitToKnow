import { createContext, useContext } from 'react'

export const RepoContext = createContext(null)

/** The analysed repo plus helpers. Must be used under <RepoProvider>. */
export function useRepo() {
  const ctx = useContext(RepoContext)
  if (!ctx) throw new Error('useRepo must be used inside <RepoProvider>')
  return ctx
}
