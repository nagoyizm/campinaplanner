'use client'

import { useState, useCallback, useRef, Fragment, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, addDays, addMonths, startOfMonth,
  isSameDay, isWeekend, isToday, differenceInDays,
  getDaysInMonth, startOfWeek
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  Plus, RefreshCw, Printer, Crown, Volume2,
  Trash2, AlertTriangle, Star, Dog, Clock, Sunrise,
  Repeat, Loader2, ShieldCheck, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './Calendario.module.css'
import ReservaModal from '@/components/reservas/ReservaModal'
import QuickReservaModal from '@/components/reservas/QuickReservaModal'

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
    unitTotal: number
    additionalServices: number
    discounts: number
    tax: number
    totalPaid: number
    lostItems: string | null
    notes: string | null
    guaranteeRsv: string | null
    guaranteeGames: string | null
    guest: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; rut: string | null }
  }
  rate: { id: string; name: string; rackRate: number } | null
}

interface CalendarioClientProps {
  rooms: Room[]
  reservas: ReservationRoom[]
  fechaBase: string
  todayStr: string
}

// Convierte una fecha UTC ISO (YYYY-MM-DD...) a un objeto Date local sin desfase de zona horaria
function parseUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)
}

// ── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  booked:      { label: 'Reservado',   color: '#1d4ed8', textColor: '#fff' },
  confirmed:   { label: 'Confirmado',  color: '#047857', textColor: '#fff' },
  checked_in:  { label: 'Check-In',    color: '#b45309', textColor: '#fff' },
  checked_out: { label: 'Check-Out',   color: '#4b5563', textColor: '#fff' },
  blocked:     { label: 'Bloqueado',   color: '#111827', textColor: '#f9fafb' },
  cancelled:   { label: 'Cancelado',   color: '#b91c1c', textColor: '#fff' },
  no_show:     { label: 'No Show',     color: '#6d28d9', textColor: '#fff' },
}

// ── Main Component ────────────────────────────────────────────────
export default function CalendarioClient({ rooms, reservas, fechaBase, todayStr }: CalendarioClientProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(() => parseUTCDate(fechaBase))
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    roomId: string; arrival: Date; departure: Date
  } | null>(null)
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null)
  const [quickModalRsv, setQuickModalRsv] = useState<any>(null)
  const [dragStart, setDragStart] = useState<{ roomId: string; date: Date } | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [hoverRsv, setHoverRsv] = useState<{ rsv: ReservationRoom; x: number; y: number } | null>(null)

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

  // Is this day "Today" in Santiago?
  const isTodaySantiago = useCallback((d: Date) => {
    return isSameDay(d, parseUTCDate(todayStr))
  }, [todayStr])

  // Generate days array
  const daysToShow = viewMode === 'month' ? getDaysInMonth(currentDate) : 7
  const startDay = viewMode === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDay, i))

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
          const arr = parseUTCDate(r.arrival)
          const dep = parseUTCDate(r.departure)
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
    const arr = parseUTCDate(r.arrival)
    arr.setHours(0,0,0,0)
    const d = new Date(day)
    d.setHours(0,0,0,0)
    return isSameDay(arr, d)
  }

  // Calculate width (nights) of reservation block starting from this day
  const getBlockWidth = (r: ReservationRoom, day: Date, daysArr: Date[]) => {
    const arr = parseUTCDate(r.arrival); arr.setHours(0,0,0,0)
    const dep = parseUTCDate(r.departure); dep.setHours(0,0,0,0)
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
    const newDate = viewMode === 'month' ? addMonths(currentDate, -1) : addDays(currentDate, -7)
    setCurrentDate(newDate)
    router.push(`/calendario?fecha=${format(newDate, 'yyyy-MM-dd')}`)
  }
  const goToNext = () => {
    const newDate = viewMode === 'month' ? addMonths(currentDate, 1) : addDays(currentDate, 7)
    setCurrentDate(newDate)
    router.push(`/calendario?fecha=${format(newDate, 'yyyy-MM-dd')}`)
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
      // Open quick modal
      setQuickModalRsv(existingRsv.reservation)
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
      const arr = parseUTCDate(r.arrival)
      const dep = parseUTCDate(r.departure)
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
    const clickOffset = differenceInDays(day, parseUTCDate(rsv.arrival))

    setActiveDrag({
      rsv,
      type,
      startRoomId: rsv.roomId,
      startDate: parseUTCDate(rsv.arrival),
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
      setQuickModalRsv(activeDrag.rsv.reservation)
      setActiveDrag(null)
      return
    }

    const { rsv, type, clickOffset, currentRoomId, currentDate } = activeDrag
    let newArrival = parseUTCDate(rsv.arrival)
    let newDeparture = parseUTCDate(rsv.departure)
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

    const originalArrival = parseUTCDate(rsv.arrival)
    const originalDeparture = parseUTCDate(rsv.departure)
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

  const handleRsvMouseEnter = (e: React.MouseEvent, rsv: ReservationRoom) => {
    if (activeDrag || rescheduling) return
    setHoverRsv({ rsv, x: e.clientX, y: e.clientY })
  }

  const handleRsvMouseMove = (e: React.MouseEvent) => {
    if (hoverRsv) {
      setHoverRsv(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
    }
  }

  const handleRsvMouseLeave = () => {
    setHoverRsv(null)
  }

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
          <div style={{ display: 'flex', gap: '2px', background: 'var(--surface-3)', padding: '2px', borderRadius: '6px', marginRight: '12px' }}>
            <button
              style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: 'none', background: viewMode === 'month' ? 'var(--brand-500)' : 'transparent', color: viewMode === 'month' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setViewMode('month')}
            >Mes</button>
            <button
              style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px', border: 'none', background: viewMode === 'week' ? 'var(--brand-500)' : 'transparent', color: viewMode === 'week' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setViewMode('week')}
            >Semana</button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={goToPrev} id="cal-prev" title="Anterior">
            <ChevronLeft size={16} />
          </button>
          <span className={styles.monthLabel}>
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy', { locale: es })
              : `${format(startDay, 'd MMM', { locale: es })} - ${format(addDays(startDay, 6), 'd MMM yyyy', { locale: es })}`}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={goToNext} id="cal-next" title="Siguiente">
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
          style={{ gridTemplateColumns: `130px repeat(${daysToShow}, minmax(46px, 1fr))` }}
          onMouseLeave={() => { setDragStart(null); setDragEnd(null) }}
        >
          {/* ── Header Row ── */}
          <div className={styles.cornerCell}>
            <span className={styles.cornerText}>Habitación</span>
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`${styles.dayHeader} ${isTodaySantiago(day) ? styles.todayHeader : ''} ${isWeekend(day) ? styles.weekendHeader : ''}`}
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
                {/* Unit type separator removed per user request */}

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
                        let newArrival = parseUTCDate(dragRsv.arrival)
                        let newDeparture = parseUTCDate(dragRsv.departure)
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
                            ${isTodaySantiago(day) ? styles.todayCell : ''}
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
                              onMouseEnter={(e) => handleRsvMouseEnter(e, rsv)}
                              onMouseMove={handleRsvMouseMove}
                              onMouseLeave={handleRsvMouseLeave}
                            >
                              {/* Left Resize Handle */}
                              <div
                                className={styles.resizeHandleLeft}
                                onMouseDown={(e) => {
                                  if (rescheduling) return
                                  handleRsvMouseDown(e, rsv, day, 'resize-left')
                                }}
                              />
                              
                              <span className={styles.rsvGuest} style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                                {rsv.reservation.guaranteeRsv === 'true' ? (
                                  <ShieldCheck size={12} style={{ color: '#10b981', flexShrink: 0 }} data-tooltip="Garantía Pagada" />
                                ) : (
                                  <ShieldAlert size={12} style={{ color: '#ef4444', flexShrink: 0 }} data-tooltip="Sin Garantía" />
                                )}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rsv.reservation.guest.firstName} {rsv.reservation.guest.lastName}
                                </span>
                              </span>

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
        <div className={styles.legendItem}><ShieldCheck size={12} style={{color:'#10b981'}} /><span>Garantía Pagada</span></div>
        <div className={styles.legendItem}><ShieldAlert size={12} style={{color:'#ef4444'}} /><span>Sin Garantía</span></div>
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

      {/* ── Tooltip ── */}
      {hoverRsv && !activeDrag && !quickModalRsv && !modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: hoverRsv.y + 15,
            left: hoverRsv.x + 15,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            fontSize: '13px',
            minWidth: '240px',
            maxWidth: '320px',
            color: 'var(--text-primary)'
          }}
        >
          {(() => {
            const hrsv = hoverRsv.rsv.reservation
            const hguest = hrsv.guest
            const total = (hrsv.unitTotal || 0) + (hrsv.additionalServices || 0) - (hrsv.discounts || 0) + (hrsv.tax || 0)
            const amountDue = total - (hrsv.totalPaid || 0)

            return (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '14px', color: 'var(--brand-500)' }}>
                  {hguest.firstName} {hguest.lastName} - #{hrsv.id}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>PAX y Mascotas:</strong> {hrsv.adults} Adultos, {hrsv.children} Niños, {hrsv.pets} Mascotas</div>
                  {hguest.email && <div><strong>Email:</strong> {hguest.email}</div>}
                  {hguest.phone && <div><strong>Celular:</strong> {hguest.phone}</div>}
                  {hguest.rut && <div><strong>RUT:</strong> {hguest.rut}</div>}
                  <hr style={{ margin: '4px 0', borderColor: 'var(--border)' }} />
                  <div><strong>Total:</strong> {formatCLP(total)}</div>
                  <div><strong>Total Pagado:</strong> {formatCLP(hrsv.totalPaid)}</div>
                  <div><strong style={{ color: amountDue > 0 ? '#ef4444' : 'inherit' }}>Monto Adeudado:</strong> {formatCLP(amountDue)}</div>
                  {(hrsv.lostItems || hrsv.notes) && <hr style={{ margin: '4px 0', borderColor: 'var(--border)' }} />}
                  {hrsv.lostItems && <div><strong>Objeto perdido:</strong> {hrsv.lostItems}</div>}
                  {hrsv.notes && <div><strong>Notas:</strong> {hrsv.notes}</div>}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── Quick Modal ── */}
      {quickModalRsv && (
        <QuickReservaModal
          rsv={quickModalRsv}
          onClose={() => setQuickModalRsv(null)}
          onOpenFull={() => {
            setQuickModalRsv(null)
            setSelectedReservaId(quickModalRsv.id)
            setSelectedCell(null)
            setModalOpen(true)
          }}
          onSaved={() => {
            setQuickModalRsv(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
