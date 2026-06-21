'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

interface RoomCardClientProps {
  room: any
  isOccupied: boolean
  guestName: string | null
}

export default function RoomCardClient({ room, isOccupied, guestName }: RoomCardClientProps) {
  const initialStatus = room.cleaningStatus || 'clean'
  const [cleaningStatus, setCleaningStatus] = useState(
    isOccupied && initialStatus === 'clean' ? 'occupied' : initialStatus
  )
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setCleaningStatus(newStatus)
    setUpdating(true)
    
    try {
      const res = await fetch(`/api/habitaciones/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleaningStatus: newStatus })
      })

      if (!res.ok) throw new Error('Error al actualizar estado')
      toast.success('Estado de limpieza actualizado')
    } catch (err) {
      toast.error('Ocurrió un error. Intente nuevamente.')
      setCleaningStatus(room.cleaningStatus) // Revert on failure
    } finally {
      setUpdating(false)
    }
  }

  // Visuals based on cleaning status & occupancy
  const isManuallyOccupied = cleaningStatus === 'occupied'
  const isEffectivelyOccupied = isOccupied || isManuallyOccupied

  let occBorder = '#a7f3d0' // verde (lista)
  let occBg = '#f0fdf4'
  let occTitleColor = '#047857'
  let occTextColor = '#065f46'

  if (cleaningStatus === 'maintenance') {
    occBorder = '#d1d5db'
    occBg = '#f3f4f6'
    occTitleColor = '#374151'
    occTextColor = '#4b5563'
  } else if (cleaningStatus === 'dirty') {
    // Marrón
    occBorder = '#fed7aa'
    occBg = '#fff7ed'
    occTitleColor = '#9a3412'
    occTextColor = '#7c2d12'
  } else if (isEffectivelyOccupied) {
    // Amarillo
    occBorder = '#fef08a'
    occBg = '#fefce8'
    occTitleColor = '#a16207'
    occTextColor = '#854d0e'
  }

  // Visuals based on cleaning status
  let statusBadge = null
  if (cleaningStatus === 'dirty') {
    statusBadge = <span style={{ background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12}/> Sin Limpieza</span>
  } else if (cleaningStatus === 'maintenance') {
    statusBadge = <span style={{ background: '#e5e7eb', color: '#4b5563', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench size={12}/> Mantenimiento</span>
  } else if (!isEffectivelyOccupied) {
    statusBadge = <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12}/> Lista</span>
  }

  return (
    <div 
      style={{ 
        border: `1px solid ${occBorder}`,
        background: occBg,
        borderRadius: '8px', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      className="room-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: occTitleColor }}>
            {room.name}
          </span>
          {statusBadge}
        </div>
        {isEffectivelyOccupied ? <XCircle size={18} color="#d97706" /> : <CheckCircle2 size={18} color="#059669" />}
      </div>
      
      <div style={{ fontSize: '0.85rem', color: occTextColor, fontWeight: 500 }}>
        {isOccupied ? `Ocupada por ${guestName}` : (isManuallyOccupied ? 'Ocupada (Manual)' : 'Disponible')}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${occBorder}` }}>
        <select 
          value={cleaningStatus} 
          onChange={handleStatusChange}
          disabled={updating}
          style={{ 
            width: '100%', 
            padding: '6px 8px', 
            borderRadius: '6px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface-1)', 
            color: 'var(--text-base)',
            fontSize: '0.8rem',
            cursor: updating ? 'wait' : 'pointer'
          }}
        >
          <option value="clean">Limpia y Lista</option>
          <option value="dirty">Limpieza Pendiente</option>
          <option value="maintenance">En Mantenimiento</option>
          <option value="occupied">Ocupada</option>
        </select>
      </div>
    </div>
  )
}
