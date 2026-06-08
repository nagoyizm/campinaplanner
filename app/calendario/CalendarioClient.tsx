'use client'

import { useState, useCallback, useRef, Fragment, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, addDays, addMonths, startOfMonth,
  isSameDay, isWeekend, isToday, differenceInDays
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, RotateCcw,
  Plus, RefreshCw, Printer, Crown, Volume2,
  Trash2, AlertTriangle, Star, Dog, Clock, Sunrise,
  Repeat, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Calendario.module.css'
import ReservaModal from '@/components/reservas/ReservaModal'

// ── Types ────────────────────────────────────────────────────────
interface Room {
  id: string
  code: string
  name: string
  unitTypeId: string
  unitType: { id: string; name: string }
}

interface ReservationRoom {
  id: string
  reservationId: number
  roomId: string
  arrival: string
  departure: string
  nights: number
  adults: number
  children: number
  unitRate: number
  unitTotal: number
  reservation: {
    id: number
    status: string
    isVip: boolean
    isNoisy: boolean
    isDirty: boolean
    isDifficult: boolean
    isNewPax: boolean
    isRecurring: boolean
    lateCheckoutHrs: number | null
    earlyCheckinHrs: number | null
    pets: number
    adults: number
    children: number
    guest: { id: string; firstName: string; lastName: string }
  }
  rate: { id: string; name: string; rackRate: number } | null
}

interface CalendarioClientProps {
  rooms: Room[]
  reservas: ReservationRoom[]
  fechaBase: string
}

// ── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  booked:      { label: 'Reservado',   color: '#3b82f6', textColor: '#fff' },
  confirmed:   { label: 'Confirmado',  color: '#10b981', textColor: '#fff' },
  checked_in:  { label: 'Check-In',    color: '#f59e0b', textColor: '#fff' },
  checked_out: { label: 'Check-Out',   color: '#6b7280', textColor: '#fff' },
  blocked:     { label: 'Bloqueado',   color: '#1f2937', textColor: '#f9fafb' },
  cancelled:   { label: 'Cancelado',   color: '#ef4444', textColor: '#fff' },
  no_show:     { label: 'No Show',     color: '#8b5cf6', textColor: '#fff' },
}

const DAYS_TO_SHOW = 30

// ── Mini icon component ───────────────────────────────────────────
function ReservationIcons({ rsv }: { rsv: ReservationRoom['reservation'] }) {
  return (
    <span className={styles.icons}>
      {rsv.isVip        && <Crown size={10} className={styles.iconVip} data-tooltip="VIP" />}
      {rsv.isNoisy      && <Volume2 size={10} className={styles.iconNoisy} data-tooltip="Ruidoso" />}
      {rsv.isDifficult  && <AlertTriangle size={10} className={styles.iconDiff} data-tooltip="Complicado" />}
      {rsv.isDirty      && <Trash2 size={10} className={styles.iconDirty} data-tooltip="Sucio" />}
      {rsv.isNewPax     && <Star size={10} className={styles.iconNew} data-tooltip="PAX Nuevo" />}
      {rsv.isRecurring  && <Repeat size={10} className={styles.iconRecurring} data-tooltip="Recurrente" />}
      {rsv.pets > 0     && <Dog size={10} className={styles.iconPet} data-tooltip="Mascota" />}
      {rsv.lateCheckoutHrs && <Clock size={10} className={styles.iconLate} data-tooltip={`Late +${rsv.lateCheckoutHrs}h`} />}
      {rsv.earlyCheckinHrs && <Sunrise size={10} className={styles.iconEarly} data-tooltip={`Early -${rsv.earlyCheckinHrs}h`} />}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function CalendarioClient({ rooms, reservas, fechaBase }: CalendarioClientProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(() => new Date(fechaBase))
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    roomId: string; arrival: Date; departure: Date
  } | null>(null)
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)
  const [dragStart, setDragStart] = useState<{ roomId: string; date: Date } | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Drag & drop / Resize states
  const [activeDrag, setActiveDrag] = useState<{
    rsv: ReservationRoom
    type: 'move' | 'resize-left' | 'resize-right'
    startRoomId: string
    startDate: Date
    clickOffset: number // number of days from arrival where click happened
    currentRoomId: string
    currentDate: Date
  } | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const clickStartRef = useRef<{ x: number; y: number } | null>(null)

  // Generate days array
  const startDay = startOfMonth(currentDate)
  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDay, i))

  // Group rooms by unit type
  const unitTypes = Array.from(
    new Map(rooms.map(r => [r.unitType.id, r.unitType])).values()
  )

  // Find reservations for a specific room/day
  const getReservationForCell = useCallback(
    (roomId: string, day: Date): ReservationRoom | null => {
      return (
        reservas.find((r) => {
          if (r.roomId !== roomId) return false
          const arr = new Date(r.arrival)
          const dep = new Date(r.departure)
          // Compare at day granularity (strip time)
          const dayStart = new Date(day); dayStart.setHours(0,0,0,0)
          const arrDay = new Date(arr); arrDay.setHours(0,0,0,0)
          const depDay = new Date(dep); depDay.setHours(0,0,0,0)
          return dayStart >= arrDay && dayStart < depDay
        }) ?? null
      )
    },
    [reservas]
  )

  // Is this the first day of a reservation block?
  const isFirstDay = (r: ReservationRoom, day: Date) => {
    const arr = new Date(r.arrival)
    arr.setHours(0,0,0,0)
    const d = new Date(day)
    d.setHours(0,0,0,0)
    return isSameDay(arr, d)
  }

  // Calculate width (nights) of reservation block starting from this day
  const getBlockWidth = (r: ReservationRoom, day: Date, daysArr: Date[]) => {
    const arr = new Date(r.arrival); arr.setHours(0,0,0,0)
    const dep = new Date(r.departure); dep.setHours(0,0,0,0)
    const dayN = new Date(day); dayN.setHours(0,0,0,0)
    const start = dayN < arr ? arr : dayN
    const end = dep
    let count = 0
    for (const d of daysArr) {
      const dn = new Date(d); dn.setHours(0,0,0,0)
      if (dn >= start && dn < end) count++
      else if (dn >= end) break
    }
    return count
  }

  // ── Navigation ────────────────────────────────────────────────
  const goToPrev = () => {
    const prevMonth = addMonths(currentDate, -1)
    setCurrentDate(prevMonth)
    router.push(`/calendario?fecha=${format(prevMonth, 'yyyy-MM-dd')}`)
  }
  const goToNext = () => {
    const nextMonth = addMonths(currentDate, 1)
    setCurrentDate(nextMonth)
    router.push(`/calendario?fecha=${format(nextMonth, 'yyyy-MM-dd')}`)
  }
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    router.push(`/calendario?fecha=${format(today, 'yyyy-MM-dd')}`)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  // ── Cell click → new reservation ─────────────────────────────
  const handleCellClick = (roomId: string, day: Date, existingRsv: ReservationRoom | null) => {
    if (existingRsv) {
      // Open existing reservation
      setSelectedReservaId(existingRsv.reservationId)
      setSelectedCell(null)
      setModalOpen(true)
    } else {
      // New reservation
      setSelectedReservaId(null)
      setSelectedCell({
        roomId,
        arrival: day,
        departure: addDays(day, 1),
      })
      setModalOpen(true)
    }
  }

  // ── Drag to select range ──────────────────────────────────────
  const handleMouseDown = (roomId: string, day: Date) => {
    setDragStart({ roomId, date: day })
    setDragEnd(day)
  }

  const handleMouseEnter = (roomId: string, day: Date) => {
    if (dragStart && dragStart.roomId === roomId) {
      setDragEnd(day)
    }
    if (activeDrag) {
      setActiveDrag(prev => {
        if (!prev) return null
        return {
          ...prev,
          currentRoomId: roomId,
          currentDate: day
        }
      })
    }
  }

  const handleMouseUp = (roomId: string, day: Date) => {
    if (dragStart && dragStart.roomId === roomId) {
      const start = dragStart.date < day ? dragStart.date : day
      const end = dragStart.date < day ? day : dragStart.date
      const existingRsv = getReservationForCell(roomId, start)
      if (!existingRsv) {
        setSelectedCell({
          roomId,
          arrival: start,
          departure: addDays(end, 1),
        })
        setSelectedReservaId(null)
        setModalOpen(true)
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }

  const isDragSelected = (roomId: string, day: Date) => {
    if (!dragStart || !dragEnd || dragStart.roomId !== roomId) return false
    const s = dragStart.date < dragEnd ? dragStart.date : dragEnd
    const e = dragStart.date < dragEnd ? dragEnd : dragStart.date
    return day >= s && day <= e
  }

  // Rescheduling/Resizing handlers
  const checkCollision = useCallback((reservaId: number, roomId: string, arrival: Date, departure: Date) => {
    return reservas.some(r => {
      if (r.reservationId === reservaId) return false
      if (r.roomId !== roomId) return false
      const arr = new Date(r.arrival)
      const dep = new Date(r.departure)
      return arrival < dep && departure > arr
    })
  }, [reservas])

  const handleRsvMouseDown = (
    e: React.MouseEvent,
    rsv: ReservationRoom,
    day: Date,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    if (e.button !== 0) return // Left click only
    e.stopPropagation()
    clickStartRef.current = { x: e.clientX, y: e.clientY }
    const clickOffset = differenceInDays(day, new Date(rsv.arrival))

    setActiveDrag({
      rsv,
      type,
      startRoomId: rsv.roomId,
      startDate: new Date(rsv.arrival),
      clickOffset,
      currentRoomId: rsv.roomId,
      currentDate: day,
    })
  }

  const handleRsvMouseUp = useCallback(async (upEvent: MouseEvent) => {
    if (!activeDrag) return

    const isClick = clickStartRef.current
      ? Math.abs(upEvent.clientX - clickStartRef.current.x) < 5 &&
        Math.abs(upEvent.clientY - clickStartRef.current.y) < 5
      : false

    if (isClick) {
      setSelectedReservaId(activeDrag.rsv.reservationId)
      setSelectedCell(null)
      setModalOpen(true)
      setActiveDrag(null)
      return
    }

    const { rsv, type, clickOffset, currentRoomId, currentDate } = activeDrag
    let newArrival = new Date(rsv.arrival)
    let newDeparture = new Date(rsv.departure)
    let targetRoomId = rsv.roomId

    if (type === 'move') {
      newArrival = addDays(currentDate, -clickOffset)
      newDeparture = addDays(newArrival, rsv.nights)
      targetRoomId = currentRoomId
    } else if (type === 'resize-left') {
      newArrival = currentDate
      if (newArrival >= newDeparture) {
        newArrival = addDays(newDeparture, -1)
      }
    } else if (type === 'resize-right') {
      newDeparture = addDays(currentDate, 1)
      if (newDeparture <= newArrival) {
        newDeparture = addDays(newArrival, 1)
      }
    }

    const originalArrival = new Date(rsv.arrival)
    const originalDeparture = new Date(rsv.departure)
    const datesChanged = !isSameDay(originalArrival, newArrival) || 
                         !isSameDay(originalDeparture, newDeparture) || 
                         targetRoomId !== rsv.roomId

    const hasCollision = checkCollision(rsv.reservationId, targetRoomId, newArrival, newDeparture)

    if (datesChanged && !hasCollision) {
      setRescheduling(true)
      const saveToast = toast.loading('Guardando cambios en el calendario... 🌲')
      try {
        const getRes = await fetch(`/api/reservas/${rsv.reservationId}`)
        if (!getRes.ok) throw new Error('No se pudo obtener la reserva')
        const data = await getRes.json()

        const updatedRooms = data.rooms.map((roomLine: any) => {
          if (roomLine.roomId === rsv.roomId) {
            const nights = differenceInDays(newDeparture, newArrival)
            const unitTotal = nights * roomLine.unitRate
            return {
              roomId: targetRoomId,
              rateId: roomLine.rateId,
              arrival: newArrival.toISOString(),
              departure: newDeparture.toISOString(),
              nights,
              adults: roomLine.adults,
              children: roomLine.children,
              unitRate: roomLine.unitRate,
              unitTotal,
            }
          }
          return {
            roomId: roomLine.roomId,
            rateId: roomLine.rateId,
            arrival: roomLine.arrival,
            departure: roomLine.departure,
            nights: roomLine.nights,
            adults: roomLine.adults,
            children: roomLine.children,
            unitRate: roomLine.unitRate,
            unitTotal: roomLine.unitTotal,
          }
        })

        const newUnitTotal = updatedRooms.reduce((acc: number, r: any) => acc + r.unitTotal, 0)

        const putBody = {
          reservaId: data.id,
          status: data.status,
          isVip: data.isVip,
          isNoisy: data.isNoisy,
          isDirty: data.isDirty,
          isDifficult: data.isDifficult,
          isNewPax: data.isNewPax,
          isRecurring: data.isRecurring,
          lateCheckoutHrs: data.lateCheckoutHrs,
          earlyCheckinHrs: data.earlyCheckinHrs,
          adults: data.adults,
          children: data.children,
          pets: data.pets,
          paymentMethod: data.paymentMethod,
          accountCode: data.accountCode,
          totalPaid: data.totalPaid,
          lostItems: data.lostItems,
          notes: data.notes,
          unitTotal: newUnitTotal,
          discounts: data.discounts,
          additionalServices: data.additionalServices,
          tax: data.tax,
          guest: {
            id: data.guest.id,
            firstName: data.guest.firstName,
            lastName: data.guest.lastName,
            rut: data.guest.rut,
            email: data.guest.email,
            phone: data.guest.phone,
            nationality: data.guest.nationality,
            address: data.guest.address,
            notes: data.guest.notes,
          },
          rooms: updatedRooms,
        }

        const putRes = await fetch('/api/reservas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(putBody),
        })

        if (!putRes.ok) throw new Error('Error al actualizar la reserva')

        toast.success('¡Reserva reprogramada con éxito! 🌲', { id: saveToast })
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error('Ocurrió un error al reprogramar la reserva.', { id: saveToast })
      } finally {
        setRescheduling(false)
      }
    } else if (hasCollision) {
      toast.error('¡Conflicto de fechas en esa habitación! Elige un espacio libre.')
    }

    setActiveDrag(null)
  }, [activeDrag, checkCollision, router])

  useEffect(() => {
    if (!activeDrag) return

    const handleWindowMouseUp = (upEvent: MouseEvent) => {
      handleRsvMouseUp(upEvent)
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [activeDrag, handleRsvMouseUp])

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className="btn btn-secondary btn-sm" onClick={goToPrev} id="cal-prev">
            <ChevronLeft size={16} />
          </button>
          <span className={styles.monthLabel}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={goToNext} id="cal-next">
            <ChevronRight size={16} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={goToToday} id="cal-today">
            Hoy
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={handleRefresh} id="cal-refresh">
            <RefreshCw size={15} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setSelectedCell(null); setSelectedReservaId(null); setModalOpen(true) }}
            id="cal-new-reservation"
          >
            <Plus size={15} />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* ── Calendar Grid ── */}
      <div className={styles.gridWrapper}>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `200px repeat(${DAYS_TO_SHOW}, minmax(38px, 1fr))` }}
          onMouseLeave={() => { setDragStart(null); setDragEnd(null) }}
        >
          {/* ── Header Row ── */}
          <div className={styles.cornerCell}>
            <span className={styles.cornerText}>Habitación</span>
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`${styles.dayHeader} ${isToday(day) ? styles.todayHeader : ''} ${isWeekend(day) ? styles.weekendHeader : ''}`}
            >
              <span className={styles.dayNum}>{format(day, 'd')}</span>
              <span className={styles.dayName}>{format(day, 'EEE', { locale: es })}</span>
            </div>
          ))}

          {/* ── Room Rows ── */}
          {unitTypes.map((ut) => {
            const unitRooms = rooms.filter(r => r.unitTypeId === ut.id)
            return (
              <Fragment key={`ut-group-${ut.id}`}>
                {/* Unit type separator */}
                <div key={`ut-${ut.id}`} className={styles.unitTypeRow} style={{ gridColumn: `1 / ${DAYS_TO_SHOW + 2}` }}>
                  <span>{ut.name}</span>
                </div>

                {unitRooms.map((room) => (
                  <Fragment key={`room-group-${room.id}`}>
                    {/* Room label */}
                    <div key={`label-${room.id}`} className={styles.roomLabel}>
                      <span className={styles.roomCode}>{room.code}</span>
                      <span className={styles.roomName}>{room.name.replace(/^[a-z]-/i, '')}</span>
                    </div>

                    {/* Day cells */}
                    {days.map((day, dayIdx) => {
                      const rsv = getReservationForCell(room.id, day)
                      const isFirst = rsv ? isFirstDay(rsv, day) : false
                      const blockWidth = rsv && isFirst ? getBlockWidth(rsv, day, days) : 1
                      const status = rsv ? STATUS_CONFIG[rsv.reservation.status] : null
                      const isDragSel = isDragSelected(room.id, day)

                      // Determine if this cell is covered by the active drag preview
                      let isPreviewStart = false
                      let previewWidth = 1
                      let isPreviewCell = false
                      let isPreviewValid = true

                      if (activeDrag) {
                        const { rsv: dragRsv, type: dragType, clickOffset } = activeDrag
                        let newArrival = new Date(dragRsv.arrival)
                        let newDeparture = new Date(dragRsv.departure)
                        let targetRoomId = dragRsv.roomId

                        if (dragType === 'move') {
                          newArrival = addDays(activeDrag.currentDate, -clickOffset)
                          newDeparture = addDays(newArrival, dragRsv.nights)
                          targetRoomId = activeDrag.currentRoomId
                        } else if (dragType === 'resize-left') {
                          newArrival = activeDrag.currentDate
                          if (newArrival >= newDeparture) {
                            newArrival = addDays(newDeparture, -1)
                          }
                        } else if (dragType === 'resize-right') {
                          newDeparture = addDays(activeDrag.currentDate, 1)
                          if (newDeparture <= newArrival) {
                            newDeparture = addDays(newArrival, 1)
                          }
                        }

                        // Check collision
                        isPreviewValid = !checkCollision(dragRsv.reservationId, targetRoomId, newArrival, newDeparture)

                        if (room.id === targetRoomId) {
                          const dayStart = new Date(day); dayStart.setHours(0,0,0,0)
                          const arrStart = new Date(newArrival); arrStart.setHours(0,0,0,0)
                          const depStart = new Date(newDeparture); depStart.setHours(0,0,0,0)

                          if (dayStart >= arrStart && dayStart < depStart) {
                            isPreviewCell = true
                            if (isSameDay(arrStart, dayStart)) {
                              isPreviewStart = true
                              const start = dayStart
                              const end = depStart
                              let count = 0
                              for (const d of days) {
                                const dn = new Date(d); dn.setHours(0,0,0,0)
                                if (dn >= start && dn < end) count++
                                else if (dn >= end) break
                              }
                              previewWidth = count
                            }
                          }
                        }
                      }

                      return (
                        <div
                          key={`cell-${room.id}-${day.toISOString()}`}
                          className={`
                            ${styles.cell}
                            ${isToday(day) ? styles.todayCell : ''}
                            ${isWeekend(day) ? styles.weekendCell : ''}
                            ${isDragSel ? styles.dragSelected : ''}
                            ${rsv ? styles.hasReservation : ''}
                            ${isPreviewCell ? styles.dragSelected : ''}
                          `}
                          onClick={() => !activeDrag && handleCellClick(room.id, day, rsv)}
                          onMouseDown={() => !rsv && !activeDrag && handleMouseDown(room.id, day)}
                          onMouseEnter={() => handleMouseEnter(room.id, day)}
                          onMouseUp={() => !activeDrag && handleMouseUp(room.id, day)}
                        >
                          {/* Original Reservation Block (hide if being dragged/resized) */}
                          {rsv && isFirst && status && (!activeDrag || activeDrag.rsv.reservationId !== rsv.reservationId) && (
                            <div
                              className={styles.reservationBlock}
                              style={{
                                backgroundColor: status.color,
                                color: status.textColor,
                                width: `calc(${blockWidth * 100}% + ${blockWidth - 1}px)`,
                              }}
                              onMouseDown={(e) => {
                                if (rescheduling) return
                                handleRsvMouseDown(e, rsv, day, 'move')
                              }}
                              title={`Rsv #${rsv.reservationId} — ${rsv.reservation.guest.firstName} ${rsv.reservation.guest.lastName}`}
                            >
                              {/* Left Resize Handle */}
                              <div
                                className={styles.resizeHandleLeft}
                                onMouseDown={(e) => {
                                  if (rescheduling) return
                                  handleRsvMouseDown(e, rsv, day, 'resize-left')
                                }}
                              />
                              
                              <span className={styles.rsvGuest}>
                                {rsv.reservation.guest.firstName} {rsv.reservation.guest.lastName}
                              </span>
                              <span className={styles.rsvPax}>
                                {rsv.reservation.adults}A
                                {rsv.reservation.children > 0 && ` ${rsv.reservation.children}N`}
                                {rsv.reservation.pets > 0 && ` ${rsv.reservation.pets}M`}
                              </span>
                              <ReservationIcons rsv={rsv.reservation} />

                              {/* Right Resize Handle */}
                              <div
                                className={styles.resizeHandleRight}
                                onMouseDown={(e) => {
                                  if (rescheduling) return
                                  handleRsvMouseDown(e, rsv, day, 'resize-right')
                                }}
                              />
                            </div>
                          )}

                          {/* Drag & Resize Preview Block */}
                          {activeDrag && isPreviewStart && (
                            <div
                              className={`${styles.reservationBlock} ${styles.dragPreviewBlock}`}
                              style={{
                                backgroundColor: isPreviewValid ? 'var(--brand-500)' : '#dc2626',
                                color: '#ffffff',
                                border: '2px dashed #ffffff',
                                width: `calc(${previewWidth * 100}% + ${previewWidth - 1}px)`,
                                pointerEvents: 'none',
                              }}
                            >
                              <span className={styles.rsvGuest}>
                                {isPreviewValid 
                                  ? `${activeDrag.rsv.reservation.guest.firstName} ${activeDrag.rsv.reservation.guest.lastName} (Soltar para reubicar)` 
                                  : '¡Conflicto de fechas!'
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className={styles.legend}>
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <div key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: val.color }} />
            <span>{val.label}</span>
          </div>
        ))}
        <div className={styles.legendSeparator} />
        <div className={styles.legendItem}><Crown size={12} style={{color:'#d4a843'}} /><span>VIP</span></div>
        <div className={styles.legendItem}><Volume2 size={12} style={{color:'#ef4444'}} /><span>Ruidoso</span></div>
        <div className={styles.legendItem}><Dog size={12} style={{color:'#ec4899'}} /><span>Mascota</span></div>
        <div className={styles.legendItem}><Star size={12} style={{color:'#10b981'}} /><span>PAX Nuevo</span></div>
        <div className={styles.legendItem}><Clock size={12} style={{color:'#8b5cf6'}} /><span>Late C/O</span></div>
        <div className={styles.legendItem}><Sunrise size={12} style={{color:'#0ea5e9'}} /><span>Early C/I</span></div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ReservaModal
          reservaId={selectedReservaId}
          defaultRoomId={selectedCell?.roomId}
          defaultArrival={selectedCell?.arrival}
          defaultDeparture={selectedCell?.departure}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
