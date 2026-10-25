import { useState } from 'react'
import { Link2, Loader2, Search } from 'lucide-react'
import { analyzeRepo } from '@/api/repos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RepoAnalyzeForm({ onResult }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      onResult(await analyzeRepo(repoUrl.trim()))
    } catch (err) {
      onResult(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            aria-label="GitHub repository URL"
            aria-invalid={Boolean(error)}
            className="h-11 pl-9 font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !repoUrl.trim()} className="h-11 px-6">
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          {loading ? 'Analysing...' : 'Analyse Repository'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
