import { request } from './client'

/** Ask the server to analyse a GitHub repository. */
export const analyzeRepo = (repoUrl) =>
  request('/api/repos/analyze', { method: 'POST', body: { repo_url: repoUrl } })

/** AI-generated overview (markdown) for an analysed repo. repoId is "owner/repo". */
export const getOverview = (repoId, signal) => request(`/api/repos/${repoId}/overview`, { signal })

export const getIndexStatus = (repoId, signal) => request(`/api/repos/${repoId}/status`, { signal })

/** Compare open pull requests and recommend the best candidate for each linked issue. */
export const getPullRequestReview = (repoId, signal) => request(`/api/repos/${repoId}/pull-requests/review`, { signal })

/** Raw content of one file of an analysed repo. */
export const getFile = (repoId, path, signal) =>
  request(`/api/repos/${repoId}/files/${path.split('/').map(encodeURIComponent).join('/')}`, { signal })
