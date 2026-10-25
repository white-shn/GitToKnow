import { request } from './client'

/** Ask the server to analyse a GitHub repository. */
export const analyzeRepo = (repoUrl) =>
  request('/api/repos/analyze', { method: 'POST', body: { repo_url: repoUrl } })
