'use client'

import { useState } from 'react'
import { X, Save, Trash2, XCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './ReservaModal.module.css'

export default function QuickReservaModal({
  rsv,
  onClose,
  onOpenFull,
  onSaved,
}: {
  rsv: any
  onClose: () => void
  onOpenFull: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState(rsv.status)
  const [isVip, setIsVip] = useState(rsv.isVip)
  const [isNoisy, setIsNoisy] = useState(rsv.isNoisy)
  const [isDirty, setIsDirty] = useState(rsv.isDirty)
  const [isDifficult, setIsDifficult] = useState(rsv.isDifficult)
  const [isNewPax, setIsNewPax] = useState(rsv.isNewPax)
  const [isRecurring, setIsRecurring] = useState(rsv.isRecurring)
  const [isWalkIn, setIsWalkIn] = useState(rsv.isWalkIn)
  const [guaranteeRsv, setGuaranteeRsv] = useState(rsv.guaranteeRsv || '')
  const [guaranteeGames, setGuaranteeGames] = useState(rsv.guaranteeGames || '')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const guest = rsv.guest
  const total = (rsv.unitTotal || 0) + (rsv.additionalServices || 0) - (rsv.discounts || 0) + (rsv.tax || 0)
  const amountDue = total - (rsv.totalPaid || 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/reservas/${rsv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          isVip, isNoisy, isDirty, isDifficult, isNewPax, isRecurring, isWalkIn,
          guaranteeRsv, guaranteeGames
        })
      })
      if (!res.ok) throw new Error('Error al guardar')
      toast.success('¡Reserva actualizada!')
      onSaved()
    } catch (e) {
      toast.error('Ocurrió un error.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar esta reserva por completo?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reservas/${rsv.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast.success('Reserva eliminada')
      onSaved()
    } catch (e) {
      toast.error('No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelReservation = async () => {
    setStatus('cancelled')
    setSaving(true)
    try {
      const res = await fetch(`/api/reservas/${rsv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Reserva cancelada')
      onSaved()
    } catch (e) {
      toast.error('No se pudo cancelar')
      setSaving(false)
    }
  }

  return (
    <>
      <div className={styles.overlay} style={{ background: 'transparent' }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '95%',
          maxWidth: '1200px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.25)',
          padding: '16px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Row 1: Header & Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
              {guest.firstName} {guest.lastName} <span style={{ color: 'var(--brand-500)', fontWeight: 600 }}>#{rsv.id}</span>
            </h2>
            <select
              className="select"
              style={{ width: '130px', padding: '4px', fontSize: '12px', height: 'auto' }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="booked">Reservado</option>
              <option value="confirmed">Confirmado</option>
              <option value="checked_in">Check-In</option>
              <option value="checked_out">Check-Out</option>
              <option value="cancelled">Cancelado</option>
              <option value="no_show">No Show</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={onOpenFull} disabled={saving || deleting}>
              <ExternalLink size={14} /> Abrir
            </button>
            <button className="btn btn-primary btn-sm" style={{ background: '#10b981' }} onClick={handleSave} disabled={saving || deleting}>
              {saving ? '...' : <><Save size={14} /> Guardar</>}
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleCancelReservation} disabled={saving || deleting || status === 'cancelled'}>
              <XCircle size={14} /> Cancelar
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving || deleting}>
              <Trash2 size={14} /> Borrar
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving || deleting}>
              <X size={14} /> Cerrar
            </button>
          </div>
        </div>

        {/* Row 2: Data Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr', gap: '12px', fontSize: '12px' }}>
          
          {/* Col 1: Finances */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
              <strong>${total.toLocaleString('es-CL')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pagado:</span>
              <strong>${(rsv.totalPaid || 0).toLocaleString('es-CL')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Adeudado:</span>
              <strong style={{ color: amountDue > 0 ? '#ef4444' : 'inherit' }}>${amountDue.toLocaleString('es-CL')}</strong>
            </div>
          </div>

          {/* Col 2: Info & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)', width: '40px' }}>PAX:</span> 
              <span>{rsv.adults} Adultos, {rsv.children} Niños, {rsv.pets} Mascotas</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ color: 'var(--text-secondary)', width: '40px' }}>Tel:</span> 
              <span>{guest.phone}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', overflow: 'hidden' }}>
              <span style={{ color: 'var(--text-secondary)', width: '40px' }}>Notas:</span> 
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rsv.notes || '-'}</span>
            </div>
          </div>

          {/* Col 3: Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
            {[
              { label: '👑 VIP',         val: isVip,       set: setIsVip,       cls: 'chip-vip' },
              { label: '🔊 Ruidoso',     val: isNoisy,     set: setIsNoisy,     cls: 'chip-noisy' },
              { label: '🧹 Sucio',       val: isDirty,     set: setIsDirty,     cls: 'chip-dirty' },
              { label: '⚠️ Complicado',  val: isDifficult, set: setIsDifficult, cls: 'chip-difficult' },
              { label: '✨ PAX Nuevo',   val: isNewPax,    set: setIsNewPax,    cls: 'chip-newpax' },
              { label: '🔄 Cliente',     val: isRecurring, set: setIsRecurring, cls: 'chip-recurring' },
              { label: '🚶 Walk-in',     val: isWalkIn,    set: setIsWalkIn,    cls: 'chip-walkin' },
            ].map(tag => (
              <button
                key={tag.label}
                className={`chip ${tag.cls}`}
                style={{ 
                  padding: '2px 8px', 
                  fontSize: '11px', 
                  height: '22px',
                  cursor: 'pointer',
                  opacity: tag.val ? 1 : 0.35,
                  filter: tag.val ? 'saturate(1.2)' : 'grayscale(100%)',
                  outline: tag.val ? '1px solid currentColor' : 'none',
                  outlineOffset: '1px'
                }}
                onClick={() => tag.set(!tag.val)}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Col 4: Guarantees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="garantia-rsv-quick"
                checked={guaranteeRsv === 'true'} 
                onChange={e => setGuaranteeRsv(e.target.checked ? 'true' : 'false')} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="garantia-rsv-quick" style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>GARANTÍA RSV</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 600 }}>GARANTÍA JUEGOS</span>
              <input className="input" style={{ padding: '4px 6px', fontSize: '12px', height: 'auto' }} value={guaranteeGames} onChange={e => setGuaranteeGames(e.target.value)} placeholder="-" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
