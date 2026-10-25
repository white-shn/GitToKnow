import { request } from './client'

/** Ask a question about an analysed repo. history is [{ role: 'user' | 'assistant', content }]. */
export const askRepo = (repoId, question, history = []) =>
  request(`/api/repos/${repoId}/chat`, { method: 'POST', body: { question, history } })
