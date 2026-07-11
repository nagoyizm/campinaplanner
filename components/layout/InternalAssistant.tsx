'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Sparkles, Loader } from 'lucide-react'
import styles from './InternalAssistant.module.css'
import DOMPurify from 'dompurify'

interface AssistantResult {
  answer: string
  route?: string
  routeLabel?: string
  source: 'local' | 'ai'
}

export default function InternalAssistant() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Ctrl+K / ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    globalThis.addEventListener('keydown', handler)
    return () => globalThis.removeEventListener('keydown', handler)
  }, [])

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) { setResult(null); return }
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ answer: 'Hubo un error al buscar. Intenta de nuevo.', source: 'local' })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (val.length > 0) setOpen(true)
    else { setOpen(false); setResult(null) }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      search(query)
    }
  }

  const handleNavigate = () => {
    if (result?.route) {
      router.push(result.route)
      setOpen(false)
      setQuery('')
    }
  }

  if (!mounted) return null

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {/* Inline Search Input */}
      <div className={styles.inputContainer}>
        <Search size={14} className={styles.searchIcon} />
        <input
          ref={inputRef}
          id="assistant-input"
          type="text"
          className={styles.input}
          placeholder="¿Cómo se hace...? ¿Dónde está...?"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className={styles.shortcuts}>
          {loading ? (
            <Loader size={14} className={styles.spinnerIcon} />
          ) : query && !loading ? (
            <button className={styles.clearBtn} onClick={() => { setQuery(''); setResult(null); setOpen(false); inputRef.current?.focus() }} aria-label="Limpiar">
              <X size={12} />
            </button>
          ) : (
            <kbd className={styles.kbd}>Ctrl+K</kbd>
          )}
        </div>
      </div>

      {/* Popover Result */}
      {open && (result || loading || (!result && !loading && query.length > 2)) && (
        <div className={styles.popover}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader size={16} className={styles.spinnerIcon} />
              <span>Buscando en la base de datos de conocimiento...</span>
            </div>
          ) : result ? (
            <div className={styles.result}>
              <div className={styles.answerHeader}>
                <Sparkles size={13} className={styles.sparkIcon} />
                <span className={styles.sourceLabel}>
                  {result.source === 'ai' ? 'Asistente IA' : 'Ayuda Rápida'}
                </span>
              </div>
              <p
                className={styles.answerText}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    result.answer
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replaceAll('\n', '<br/>')
                  )
                }}
              />
              {result.route && (
                <button className={styles.navBtn} onClick={handleNavigate}>
                  Ir a {result.routeLabel ?? result.route}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className={styles.hint}>
              <p>Presiona <kbd className={styles.kbdInline}>Enter</kbd> para buscar en el asistente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
