'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, Calendar, DollarSign, Bell, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface OrganizationRow {
  id: string
  name: string
}

interface SaasItemModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'payment' | 'event'
  orgs: OrganizationRow[]
  initialData?: {
    id?: string
    startDate: Date
    endDate: Date
    organizationId?: string
    title?: string
    amount?: number
    status?: string
    type?: string
    description?: string
    notes?: string
  }
}

export default function SaasItemModal({ isOpen, onClose, itemType, orgs, initialData }: SaasItemModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('pending')
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('reminder')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isOpen && initialData) {
      setStartDate(format(initialData.startDate, 'yyyy-MM-dd'))
      setEndDate(format(initialData.endDate, 'yyyy-MM-dd'))
      setOrganizationId(initialData.organizationId || '')
      setAmount(initialData.amount ? initialData.amount.toString() : '')
      setStatus(initialData.status || 'pending')
      setTitle(initialData.title || '')
      setEventType(initialData.type || 'reminder')
      setDescription(initialData.description || initialData.notes || '')
    } else {
      // Reset
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
      setEndDate(format(new Date(), 'yyyy-MM-dd'))
      setOrganizationId('')
      setAmount('')
      setStatus('pending')
      setTitle('')
      setEventType('reminder')
      setDescription('')
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const isEdit = !!initialData?.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const endpoint = itemType === 'payment' ? '/api/saas/payments' : '/api/saas/events'
      const method = isEdit ? 'PUT' : 'POST'
      
      const body: any = {
        startDate,
        endDate
      }
      
      if (isEdit) body.id = initialData.id

      if (itemType === 'payment') {
        body.organizationId = organizationId
        body.amount = parseFloat(amount)
        body.status = status
        body.notes = description
      } else {
        body.title = title
        body.type = eventType
        body.description = description
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Error al guardar')

      toast.success(isEdit ? 'Actualizado correctamente' : 'Creado correctamente')
      router.refresh()
      onClose()
    } catch (err) {
      toast.error('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!initialData?.id) return
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    setLoading(true)
    try {
      const endpoint = itemType === 'payment' ? '/api/saas/payments' : '/api/saas/events'
      const res = await fetch(`${endpoint}?id=${initialData.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')

      toast.success('Eliminado correctamente')
      router.refresh()
      onClose()
    } catch (err) {
      toast.error('Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'var(--surface-1)', width: '100%', maxWidth: '500px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-base)' }}>
            {itemType === 'payment' ? <DollarSign size={20} color="#ca8a04" /> : <Bell size={20} color="#3b82f6" />}
            {isEdit ? 'Editar' : 'Nuevo'} {itemType === 'payment' ? 'Cobro de Suscripción' : 'Evento Global'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Fecha Inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Fecha Fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="input" style={{ width: '100%' }} />
            </div>
          </div>

          {itemType === 'payment' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Cliente (Organización)</label>
                <select value={organizationId} onChange={e => setOrganizationId(e.target.value)} required className="input" style={{ width: '100%' }}>
                  <option value="">Selecciona un cliente</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Monto a Cobrar</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="Ej: 50000" className="input" style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Estado</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="input" style={{ width: '100%' }}>
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="overdue">Atrasado</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Título del Evento</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Actualización de Servidor" className="input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>Tipo de Evento</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className="input" style={{ width: '100%' }}>
                  <option value="reminder">Recordatorio</option>
                  <option value="meeting">Reunión</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>{itemType === 'payment' ? 'Notas / Referencia' : 'Descripción'}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input" style={{ width: '100%', resize: 'none' }}></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            {isEdit ? (
              <button type="button" onClick={handleDelete} className="btn btn-ghost" style={{ color: '#ef4444' }} disabled={loading}>
                <Trash2 size={18} /> Eliminar
              </button>
            ) : <div />}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="spinning" size={18} /> : 'Guardar'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  )
}
