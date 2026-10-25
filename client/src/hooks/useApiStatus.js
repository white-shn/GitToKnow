import { useEffect, useState } from 'react'
import { getHealth } from '@/api/health'

/** Pings the server once on mount. status: 'checking' | 'online' | 'offline' */
export function useApiStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const controller = new AbortController()
    getHealth(controller.signal)
      .then(() => setStatus('online'))
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('offline')
      })
    return () => controller.abort()
  }, [])

  return status
}
