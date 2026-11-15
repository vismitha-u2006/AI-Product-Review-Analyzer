import React, { useState, useEffect, useRef } from 'react'
import { Bot, User, Send, Sparkles, HelpCircle, RefreshCw, MessageSquare } from 'lucide-react'
import { productsApi } from '../services/api'
import api from '../services/api'
import type { Product, ChatMessage } from '../types'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const EXAMPLE_PROMPTS = [
  'What are the most common customer complaints for this product?',
  'What are the top appreciated features according to reviews?',
  'Why are customers unhappy or leaving negative reviews?',
  'Are there any suspicious or fake reviews detected?',
  'What specific improvements should the seller make immediately?',
  'Provide an executive summary of all customer feedback.',
]

export default function AssistantPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I am your AI Review Assistant powered by Google Gemini and deep learning analysis. I can analyze feedback, answer questions about product quality, detect fake review patterns, and provide actionable seller recommendations grounded in your actual customer reviews. What would you like to know?',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadProducts = async () => {
    try {
      const res = await productsApi.getProducts()
      setProducts(res.data)
      if (res.data.length > 0) {
        setSelectedProductId(res.data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || inputMessage
    if (!text.trim() || sending) return

    const userMsg = { id: String(Date.now()), role: 'user' as const, content: text }
    setMessages((prev) => [...prev, userMsg])
    if (!messageToSend) setInputMessage('')
    setSending(true)

    try {
      const res = await api.post('/assistant/chat', {
        message: text,
        product_id: selectedProductId ? Number(selectedProductId) : undefined,
      })

      const botMsg = {
        id: String(Date.now() + 1),
        role: 'assistant' as const,
        content: res.data.response || 'I have analyzed the reviews, but could not formulate a response.',
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      console.error(err)
      const errorMsg = {
        id: String(Date.now() + 1),
        role: 'assistant' as const,
        content:
          err.response?.data?.detail ||
          'Sorry, I encountered an error connecting to the AI Assistant. Please ensure your reviews are analyzed.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-cyan-400" />
            AI Assistant & Product Intelligence
          </h1>
          <p className="text-xs text-slate-400">
            Grounded in stored review analysis data using Google Gemini API.
          </p>
        </div>

        {/* Product context selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 whitespace-nowrap">Context Product:</span>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            className="input text-xs py-1.5 max-w-[200px]"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-400 shrink-0">Suggested:</span>
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={sending}
            className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-white transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="card flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-[#151F32] border border-slate-700/80 text-slate-200 rounded-tl-none whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-[#151F32] border border-slate-700/80 p-4 text-sm text-slate-400 flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Analyzing review data & formulating response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask anything about customer reviews, satisfaction, complaints, or product features..."
          className="input flex-1 py-3 text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !inputMessage.trim()}
          className="btn-primary flex items-center gap-2 py-3 px-5 text-sm"
        >
          <Send className="h-4 w-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  )
}
