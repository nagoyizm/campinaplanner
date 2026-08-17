'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, Loader2, Clock } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import toast from 'react-hot-toast'
import styles from '@/app/dashboard/dashboard.module.css'

interface PendingReservation {
  id: number
  status: string
  unitTotal: number
  paymentMethod: string | null
  createdAt: string
  guest: { firstName: string; lastName: string; email: string | null; phone: string | null }
  rooms: Array<{ id: string; arrival: string; departure: string; nights: number; room: { name: string; code: string } }>
}

export default function PendingReservasBanner() {
  const [reservas, setReservas] = useState<PendingReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/reservas/pendientes', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReservas(data.reservas || [])
    } catch {
      setReservas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (reservaId: number, action: 'confirm' | 'cancel') => {
    setWorkingId(reservaId)
    try {
      const res = await fetch('/api/reservas/pendientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservaId, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Error al procesar la reserva')
      }
      setReservas(prev => prev.filter(r => r.id !== reservaId))
      toast.success(action === 'confirm' ? 'Reserva confirmada' : 'Reserva cancelada')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setWorkingId(null)
    }
  }

  const formatCLP = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('T')[0].split('-').map(Number)
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  if (loading) return null
  if (reservas.length === 0) return null

  return (
    <div className={styles.pendingBanner}>
      <div className={styles.pendingBannerHeader}>
        <Icon icon={Clock} size="lg" />
        <div>
          <h3 className={styles.pendingBannerTitle}>
            Hay {reservas.length} reserva{reservas.length > 1 ? 's' : ''} por confirmar
          </h3>
          <p className={styles.pendingBannerSubtitle}>
            Llegaron desde la web y quedaron reservadas, pendientes de confirmación. Contacta a la persona para cerrar la reserva o confírmala cuando se haga el pago.
          </p>
        </div>
      </div>
      <div className={styles.pendingList}>
        {reservas.map((rsv) => {
          const room = rsv.rooms[0]
          return (
            <div key={rsv.id} className={styles.pendingItem}>
              <span className={`${styles.statusBadge} ${rsv.status === 'booked' ? styles.statusBooked : styles.statusOnHold}`}>
                {rsv.status === 'booked' ? 'Reservado' : 'Por Confirmar'}
              </span>
              <div className={styles.pendingItemInfo}>
                <span className={styles.pendingGuest}>
                  #{rsv.id} · {rsv.guest.firstName} {rsv.guest.lastName}
                </span>
                <span className={styles.pendingDetails}>
                  {room ? `${room.room.name} · ${formatDate(room.arrival)} al ${formatDate(room.departure)} · ${room.nights} noche${room.nights > 1 ? 's' : ''} · ${formatCLP(rsv.unitTotal)}` : 'Sin unidad asignada'}
                  {rsv.guest.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${rsv.guest.phone}`} style={{ color: 'var(--info)', fontWeight: 600 }}>{rsv.guest.phone}</a>
                    </>
                  )}
                </span>
              </div>
              <div className={styles.pendingActions}>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={workingId === rsv.id}
                  onClick={() => handleAction(rsv.id, 'confirm')}
                >
                  {workingId === rsv.id ? <Icon icon={Loader2} size="sm" className="spin" /> : <Icon icon={Check} size="sm" />}
                  Confirmar
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--danger)' }}
                  disabled={workingId === rsv.id}
                  onClick={() => handleAction(rsv.id, 'cancel')}
                >
                  <Icon icon={X} size="sm" />
                  Cancelar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}