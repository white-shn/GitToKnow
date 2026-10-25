import { request } from './client'

export const getHealth = (signal) => request('/api/health', { signal })
