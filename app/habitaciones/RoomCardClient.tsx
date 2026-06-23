'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

interface RoomCardClientProps {
  room: any
  isOccupied: boolean
  guestName: string | null
  isAdmin?: boolean
}

export default function RoomCardClient({ room, isOccupied, guestName, isAdmin }: RoomCardClientProps) {
  const initialStatus = room.cleaningStatus || 'clean'
  const [cleaningStatus, setCleaningStatus] = useState(
    isOccupied && initialStatus === 'clean' ? 'occupied' : initialStatus
  )
  const [updating, setUpdating] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [priorityNote, setPriorityNote] = useState(room.cleaningNote || '')
  
  // Refresca la UI al cambiar la DB ya que Next.js refrescará la página
  // pero el componente se re-renderizará con los nuevos props

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
      window.location.reload() // Forzar reload para que la página reordene los elementos
    }
  }

  const togglePriority = async () => {
    if (room.cleaningPriority) {
      setUpdating(true)
      try {
        const res = await fetch(`/api/habitaciones/${room.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cleaningPriority: false, cleaningNote: null })
        })
        if (res.ok) window.location.reload()
      } finally { setUpdating(false) }
    } else {
      setIsAddingNote(true)
    }
  }

  const submitPriority = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/habitaciones/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleaningPriority: true, cleaningNote: priorityNote })
      })
      if (res.ok) window.location.reload()
      setIsAddingNote(false)
    } finally { setUpdating(false) }
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
  
  if (room.cleaningPriority) {
    occBorder = '#fca5a5' // red-300
    occBg = '#fef2f2' // red-50
    occTitleColor = '#b91c1c' // red-700
    occTextColor = '#991b1b' // red-800
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
  
  if (room.cleaningPriority) {
    statusBadge = <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12}/> Prioridad</span>
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

      {room.cleaningNote && (
        <div style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '4px', fontStyle: 'italic', color: occTextColor }}>
          Nota: {room.cleaningNote}
        </div>
      )}

      {isAddingNote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input 
            type="text" 
            placeholder="Nota de urgencia..." 
            value={priorityNote} 
            onChange={e => setPriorityNote(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${occBorder}`, width: '100%' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={submitPriority} disabled={updating} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Guardar</button>
            <button onClick={() => setIsAddingNote(false)} disabled={updating} style={{ flex: 1, background: 'transparent', border: `1px solid ${occBorder}`, borderRadius: '4px', padding: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${occBorder}`, display: 'flex', gap: '8px' }}>
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
        
        {isAdmin && cleaningStatus === 'dirty' && !isAddingNote && (
          <button 
            onClick={togglePriority}
            disabled={updating}
            title={room.cleaningPriority ? "Quitar prioridad" : "Marcar como prioridad"}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: room.cleaningPriority ? '1px solid #ef4444' : '1px solid var(--border)',
              background: room.cleaningPriority ? '#ef4444' : 'var(--surface-1)',
              color: room.cleaningPriority ? 'white' : 'var(--text-muted)',
              cursor: updating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertCircle size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
