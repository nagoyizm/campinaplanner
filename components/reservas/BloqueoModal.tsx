'use client'

import { useState } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import { X, Calendar as CalendarIcon, ShieldAlert } from 'lucide-react'

export default function BloqueoModal({
  defaultRoomId,
  defaultArrival,
  onClose,
  onSave
}: {
  defaultRoomId: string
  defaultArrival: Date
  onClose: () => void
  onSave: () => void
}) {
  const [arrival, setArrival] = useState(format(defaultArrival, 'yyyy-MM-dd'))
  const [departure, setDeparture] = useState(format(addDays(defaultArrival, 1), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const arrDate = new Date(`${arrival}T12:00:00`)
    const depDate = new Date(`${departure}T12:00:00`)
    const nights = differenceInDays(depDate, arrDate)

    if (nights <= 0) {
      toast.error('La fecha de término debe ser posterior a la de inicio.')
      setLoading(false)
      return
    }

    const payload = {
      status: 'blocked',
      isVip: false,
      isNoisy: false,
      isDirty: false,
      isDifficult: false,
      isNewPax: false,
      isRecurring: false,
      isWalkIn: false,
      adults: 0,
      children: 0,
      pets: 0,
      totalPaid: 0,
      unitTotal: 0,
      discounts: 0,
      additionalServices: 0,
      tax: 0,
      notes: notes || 'Bloqueo de sistema',
      guest: {
        firstName: 'Bloqueo',
        lastName: 'Sistema',
        rut: '',
        email: '',
        phone: '',
        nationality: 'Chile',
      },
      rooms: [
        {
          roomId: defaultRoomId,
          rateId: null,
          arrival: arrDate.toISOString(),
          departure: depDate.toISOString(),
          nights,
          adults: 0,
          children: 0,
          unitRate: 0,
          unitTotal: 0
        }
      ]
    }

    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al bloquear la fecha')
      }

      toast.success('Fecha bloqueada correctamente')
      onSave()
    } catch (error: any) {
      toast.error(error.message || 'Error al bloquear la fecha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface-1)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
            <ShieldAlert size={20} color="#ef4444" />
            Bloquear Fechas
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Fecha Inicio</label>
              <input 
                type="date" 
                value={arrival} 
                onChange={e => setArrival(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Fecha Término</label>
              <input 
                type="date" 
                value={departure} 
                onChange={e => setDeparture(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Motivo (Opcional)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Mantenimiento, pintura..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', minHeight: 80, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ background: '#ef4444', color: 'white', border: 'none' }}>
              {loading ? 'Bloqueando...' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
