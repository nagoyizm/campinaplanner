'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Send, Pin, User, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface Memo {
  id: string
  content: string
  author: string
  createdAt: Date
  targetUserId?: string | null
  targetUser?: { name: string, roleName: string } | null
}

export default function PizarraClient({ initialMemos, userRole, orgUsers = [] }: { initialMemos: Memo[], userRole: string, orgUsers?: any[] }) {
  const [memos, setMemos] = useState<Memo[]>(initialMemos)
  const [newMemo, setNewMemo] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [loading, setLoading] = useState(false)

  // Empleados y recepcionistas no pueden publicar memos en este modelo simple, solo leen.
  // Podríamos permitir si quisiéramos, pero según requerimientos el admin publica los memos.
  const canPost = userRole === 'admin' || userRole === 'superadmin'

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemo.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/pizarra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemo, targetUserId: targetUserId || null })
      })
      if (!res.ok) throw new Error('Error al publicar')
      const created = await res.json()
      setMemos([created, ...memos])
      setNewMemo('')
      toast.success('Memo publicado')
    } catch {
      toast.error('No se pudo publicar el memo')
    }
    setLoading(false)
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', borderBottom: '2px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '12px', borderRadius: '12px' }}>
          <MessageSquare size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Pizarra / Memo</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Comunicaciones internas del equipo</p>
        </div>
      </div>

      {canPost && (
        <form onSubmit={handlePost} style={{ background: 'var(--surface-1)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-base)' }}>Nuevo Mensaje</label>
          <textarea 
            value={newMemo}
            onChange={e => setNewMemo(e.target.value)}
            className="input" 
            rows={3} 
            placeholder="Escribe un nuevo memorándum para el equipo..."
            style={{ width: '100%', resize: 'vertical' }}
            required
          />
          {orgUsers && orgUsers.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', color: 'var(--text-base)', fontSize: '0.9rem' }}>Destinatario (Opcional)</label>
              <select 
                className="input" 
                value={targetUserId} 
                onChange={e => setTargetUserId(e.target.value)}
                style={{ width: '100%', maxWidth: '300px' }}
              >
                <option value="">Para todos (Memo General)</option>
                {orgUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.roleName})</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !newMemo.trim()}>
              {loading ? 'Publicando...' : <><Send size={16} /> Publicar</>}
            </button>
          </div>
        </form>
      )}

      {canPost && (
        <div style={{ background: 'var(--surface-1)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-base)' }}>Envío Masivo por WhatsApp</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Envía un mensaje a todos los pasajeros que actualmente tienen estado de estadía ("Checked In").
          </p>
          <form 
            onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const msg = (form.elements.namedItem('broadcastMsg') as HTMLTextAreaElement).value
              if (!msg) return
              
              const btn = form.querySelector('button')
              if(btn) btn.disabled = true
              
              try {
                const res = await fetch('/api/whatsapp/broadcast', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: msg })
                })
                const data = await res.json()
                if(res.ok) {
                  toast.success(data.message)
                  form.reset()
                } else {
                  toast.error(data.error || 'Error al enviar')
                }
              } catch (err) {
                toast.error('Error de red al enviar')
              } finally {
                if(btn) btn.disabled = false
              }
            }}
          >
            <textarea 
              name="broadcastMsg"
              className="input" 
              rows={3} 
              placeholder="Escribe el mensaje aquí... Ej: Les recordamos que el desayuno es hasta las 10:30."
              style={{ width: '100%', resize: 'vertical', marginBottom: '12px' }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} /> Enviar a Todos
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {memos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-1)', borderRadius: '16px', color: 'var(--text-muted)' }}>
            <Pin size={48} style={{ opacity: 0.2, marginBottom: '16px', display: 'inline-block' }} />
            <p>No hay mensajes en la pizarra.</p>
          </div>
        ) : (
          memos.map(memo => (
            <div key={memo.id} style={{ background: 'var(--surface-1)', padding: '20px', borderRadius: '12px', borderLeft: memo.targetUserId ? '4px solid #ef4444' : '4px solid #fde68a', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              
              {memo.targetUser && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>
                  <Pin size={12} />
                  Privado para: {memo.targetUser.name}
                </div>
              )}

              <p style={{ fontSize: '1.05rem', color: 'var(--text-base)', lineHeight: 1.5, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>
                {memo.content}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} />
                  <span>{memo.author}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>{format(new Date(memo.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
