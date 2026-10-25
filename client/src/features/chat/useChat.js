import { useState } from 'react'
import { askRepo } from '@/api/chat'

const HISTORY_TURNS = 10

/** Chat state for one repo. Sends recent turns as `history` so follow-up questions work. */
export function useChat(repoId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  async function send(question) {
    const history = messages
      .filter((m) => !m.error)
      .slice(-HISTORY_TURNS)
      .map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await askRepo(repoId, question, history)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer, citations: res.citations }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.message, error: true }])
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, send }
}
