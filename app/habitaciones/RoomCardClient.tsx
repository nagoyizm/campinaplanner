'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import Icon from '@/components/ui/Icon'
import styles from './RoomCard.module.css'

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

  // Estado visual derivado
  const isManuallyOccupied = cleaningStatus === 'occupied'
  const isEffectivelyOccupied = isOccupied || isManuallyOccupied

  let state = 'clean'
  if (room.cleaningPriority) state = 'priority'
  else if (cleaningStatus === 'maintenance') state = 'maintenance'
  else if (cleaningStatus === 'dirty') state = 'dirty'
  else if (isEffectivelyOccupied) state = 'occupied'

  // Badge
  let badge = null
  let badgeTone = 'success'
  if (room.cleaningPriority) {
    badge = <><Icon icon={AlertCircle} size="xs" /> Prioridad</>
    badgeTone = 'danger'
  } else if (cleaningStatus === 'dirty') {
    badge = <><Icon icon={AlertCircle} size="xs" /> Sin Limpieza</>
    badgeTone = 'warning'
  } else if (cleaningStatus === 'maintenance') {
    badge = <><Icon icon={Wrench} size="xs" /> Mantenimiento</>
    badgeTone = 'neutral'
  } else if (!isEffectivelyOccupied) {
    badge = <><Icon icon={CheckCircle2} size="xs" /> Lista</>
  }

  const statusTone = state === 'clean' ? 'success' : state === 'dirty' ? 'warning' : state === 'maintenance' ? 'neutral' : state === 'occupied' ? 'info' : 'danger'

  return (
    <div className={styles.card} data-state={state}>
      <div className={styles.header}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{room.name}</span>
          {badge && <span className={styles.statusBadge} data-tone={badgeTone}>{badge}</span>}
        </div>
        {isEffectivelyOccupied
          ? <Icon icon={XCircle} size="lg" color="var(--warning)" />
          : <Icon icon={CheckCircle2} size="lg" color="var(--success)" />}
      </div>

      <div className={styles.occupancy}>
        {isOccupied ? `Ocupada por ${guestName}` : (isManuallyOccupied ? 'Ocupada (Manual)' : 'Disponible')}
      </div>

      {room.cleaningNote && (
        <div className={styles.note}>
          Nota: {room.cleaningNote}
        </div>
      )}

      {isAddingNote && (
        <div className={styles.noteForm}>
          <input
            type="text"
            placeholder="Nota de urgencia..."
            value={priorityNote}
            onChange={e => setPriorityNote(e.target.value)}
            className={styles.noteInput}
            autoFocus
          />
          <div className={styles.noteActions}>
            <button
              onClick={submitPriority}
              disabled={updating}
              className={styles.noteSave}
            >Guardar</button>
            <button
              onClick={() => setIsAddingNote(false)}
              disabled={updating}
              className={styles.noteCancel}
            >Cancelar</button>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <select
          value={cleaningStatus}
          onChange={handleStatusChange}
          disabled={updating}
          className={styles.select}
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
            className={styles.priorityBtn}
            data-active={room.cleaningPriority}
            aria-label={room.cleaningPriority ? "Quitar prioridad" : "Marcar como prioridad"}
          >
            <Icon icon={AlertCircle} size="md" />
          </button>
        )}
      </div>
    </div>
  )
}