'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  format, addMonths, addDays, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, isAfter, differenceInDays, getDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar as CalendarIcon, Users, CheckCircle2,
  ChevronLeft, ChevronRight, ShieldCheck,
  CreditCard, Copy, Sparkles, ArrowRight, GripVertical
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './PublicBooking.module.css'

interface Rate {
  id: string
  name: string
  rackRate: number
  includedOccupants: number
  extraPersonAdult: number
  extraPersonChild: number
  weekendSurcharge: number
}

interface Room {
  id: string
  name: string
  code: string
}

interface UnitType {
  id: string
  name: string
  description: string | null
  maxOccupancy: number
  sortOrder: number
  rooms: Room[]
  rates: Rate[]
}

interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  colorPalette: string
  currency: string
  paymentMethods: string
  bankAccounts: string
  unitTypes: UnitType[]
}

interface PublicBookingClientProps {
  initialOrg: Organization
}

export default function PublicBookingClient({ initialOrg }: PublicBookingClientProps) {
  const [org] = useState<Organization>(initialOrg)
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<string>(
    initialOrg.unitTypes[0]?.id || ''
  )

  // Current calendar month view
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  // Selected dates
  const [arrivalDate, setArrivalDate] = useState<Date | null>(null)
  const [departureDate, setDepartureDate] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Drag state for dragging range endpoints
  const [dragSide, setDragSide] = useState<'start' | 'end' | null>(null)

  // Occupants
  const [adults, setAdults] = useState<number>(2)
  const [children, setChildren] = useState<number>(0)

  // UX Step State: show guest form only after clicking "Ingresar Datos del Huésped"
  const [showGuestForm, setShowGuestForm] = useState<boolean>(false)
  const guestFormRef = useRef<HTMLDivElement>(null)

  // Guest details form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('Chile')
  const [notes, setNotes] = useState('')

  // State & Availability
  const [availability, setAvailability] = useState<Record<string, { available: boolean; freeCount: number; totalRooms: number }>>({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null)

  const selectedUnitType = useMemo(() => {
    return org.unitTypes.find(u => u.id === selectedUnitTypeId) || org.unitTypes[0]
  }, [org, selectedUnitTypeId])

  const paletteClass = useMemo(() => {
    const palette = org.colorPalette?.toLowerCase() || 'verde'
    switch (palette) {
      case 'azul': return styles.themeAzul
      case 'rojizo': return styles.themeRojizo
      case 'crema': return styles.themeCrema
      case 'morado': return styles.themeMorado
      case 'turquesa': return styles.themeTurquesa
      default: return styles.themeVerde
    }
  }, [org.colorPalette])

  // Today at midnight
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // Global mouseup to release dragging
  useEffect(() => {
    const handleMouseUp = () => setDragSide(null)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Fetch availability matrix when unitType or current month changes
  useEffect(() => {
    if (!selectedUnitType) return

    async function fetchAvailability() {
      setLoadingAvailability(true)
      try {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth() + 1
        const res = await fetch(
          `/api/public/disponibilidad?slug=${org.slug}&unitTypeId=${selectedUnitType.id}&year=${year}&month=${month}`
        )
        if (res.ok) {
          const data = await res.json()
          setAvailability(data.availability || {})
        }
      } catch (err) {
        console.error('Error fetching availability matrix:', err)
      } finally {
        setLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [org.slug, selectedUnitType, currentMonth])

  // Reset dates & guest form if unitType changes
  const handleSelectUnitType = (id: string) => {
    setSelectedUnitTypeId(id)
    setArrivalDate(null)
    setDepartureDate(null)
    setShowGuestForm(false)
  }

  // Check if all nights in range are free
  const checkRangeAvailability = (start: Date, end: Date) => {
    if (isBefore(start, today)) return false
    if (!isBefore(start, end)) return false

    const range = eachDayOfInterval({ start, end: addDays(end, -1) })
    return range.every(d => {
      const key = format(d, 'yyyy-MM-dd')
      return availability[key]?.available !== false
    })
  }

  // Handle Mouse Enter during Dragging or Hover
  const handleMouseEnterDay = (day: Date) => {
    if (isBefore(day, today)) return

    if (dragSide === 'start' && departureDate) {
      if (isBefore(day, departureDate) && checkRangeAvailability(day, departureDate)) {
        setArrivalDate(day)
      }
    } else if (dragSide === 'end' && arrivalDate) {
      if (isAfter(day, arrivalDate) && checkRangeAvailability(arrivalDate, day)) {
        setDepartureDate(day)
      }
    } else if (arrivalDate && !departureDate) {
      setHoverDate(day)
    }
  }

  // Handle Calendar Day Click
  const handleDayClick = (day: Date, dayAvail?: { available: boolean; freeCount: number }) => {
    if (isBefore(day, today)) {
      toast.error('No se pueden seleccionar días pasados.')
      return
    }

    if (dayAvail?.available === false) {
      toast.error('Esta fecha se encuentra totalmente ocupada para este tipo de estancia.')
      return
    }

    if (!arrivalDate || (arrivalDate && departureDate)) {
      setArrivalDate(day)
      setDepartureDate(null)
      setHoverDate(null)
      setShowGuestForm(false)
    } else {
      if (isSameDay(day, arrivalDate)) {
        setArrivalDate(null)
        setDepartureDate(null)
        setHoverDate(null)
        setShowGuestForm(false)
      } else if (isBefore(day, arrivalDate)) {
        setArrivalDate(day)
        setDepartureDate(null)
        setHoverDate(null)
        setShowGuestForm(false)
      } else {
        if (!checkRangeAvailability(arrivalDate, day)) {
          toast.error('Algunas noches intermedias en el rango están ocupadas.')
          return
        }
        setDepartureDate(day)
      }
    }
  }

  // Direct Date Input Change (Check-In)
  const handleArrivalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) {
      setArrivalDate(null)
      setDepartureDate(null)
      setShowGuestForm(false)
      return
    }
    const d = parseISO(val)
    if (isBefore(d, today)) {
      toast.error('La fecha de entrada no puede ser en el pasado.')
      return
    }
    setArrivalDate(d)
    if (departureDate && isBefore(departureDate, d)) {
      setDepartureDate(null)
    }
    setShowGuestForm(false)
  }

  // Direct Date Input Change (Check-Out)
  const handleDepartureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) {
      setDepartureDate(null)
      setShowGuestForm(false)
      return
    }
    const d = parseISO(val)
    if (!arrivalDate) {
      toast.error('Por favor selecciona primero la fecha de entrada.')
      return
    }
    if (!isAfter(d, arrivalDate)) {
      toast.error('La fecha de salida debe ser posterior a la fecha de entrada.')
      return
    }

    if (!checkRangeAvailability(arrivalDate, d)) {
      toast.error('Hay fechas ocupadas dentro del rango seleccionado.')
      return
    }

    setDepartureDate(d)
  }

  // Calculate quotation
  const nights = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0
    return Math.max(0, differenceInDays(departureDate, arrivalDate))
  }, [arrivalDate, departureDate])

  const quotation = useMemo(() => {
    if (!selectedUnitType || nights <= 0) return null

    const rate = selectedUnitType.rates[0]
    const rackRate = rate?.rackRate || 0
    const included = rate?.includedOccupants || 2
    const extraAdultRate = rate?.extraPersonAdult || 0
    const extraChildRate = rate?.extraPersonChild || 0

    const extraAdults = Math.max(0, adults - included)
    const extraChildren = extraAdults > 0 ? children : Math.max(0, (adults + children) - included)

    const nightExtraCharge = (extraAdults * extraAdultRate) + (extraChildren * extraChildRate)
    const unitRate = rackRate + nightExtraCharge
    const total = unitRate * nights

    return {
      rackRate,
      extraAdults,
      extraChildren,
      nightExtraCharge,
      unitRate,
      totalNights: nights,
      totalPrice: total
    }
  }, [selectedUnitType, nights, adults, children])

  // Click handler to proceed to Guest Form
  const handleProceedToGuestForm = () => {
    if (!arrivalDate || !departureDate || nights <= 0) {
      toast.error('Por favor selecciona la fecha de entrada y salida primero.')
      return
    }
    setShowGuestForm(true)
    setTimeout(() => {
      guestFormRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Handle Form Submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!arrivalDate || !departureDate || nights <= 0) {
      toast.error('Por favor selecciona tus fechas de entrada y salida.')
      return
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Por favor ingresa tu nombre y apellido.')
      return
    }

    if (!email.trim() && !phone.trim()) {
      toast.error('Por favor ingresa al menos un medio de contacto (email o WhatsApp).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/public/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: org.slug,
          unitTypeId: selectedUnitType.id,
          arrival: format(arrivalDate, 'yyyy-MM-dd'),
          departure: format(departureDate, 'yyyy-MM-dd'),
          adults,
          children,
          guest: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            rut: rut.trim(),
            email: email.trim(),
            phone: phone.trim(),
            nationality,
            notes: notes.trim()
          }
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo completar la reserva')
      }

      setBookingSuccess(data)
      toast.success('¡Reserva registrada exitosamente!')
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la reserva')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: org.currency || 'CLP',
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  // Days for current month calendar view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart) // 0 = Sunday

  if (bookingSuccess) {
    return (
      <div className={`${styles.container} ${paletteClass}`}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.brand}>
              {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.logo} />}
              <div>
                <h1 className={styles.orgTitle}>{org.name}</h1>
                <p className={styles.orgSubtitle}>Reserva Web Confirmada</p>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.confirmCard}>
            <div className={styles.iconSuccess}>
              <CheckCircle2 size={28} />
            </div>
            <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem' }}>¡Tu Reserva ha sido Registrada!</h2>
            <p className={styles.orgSubtitle}>
              Hemos reservado tu estancia en <strong>{bookingSuccess.unitType}</strong> ({bookingSuccess.assignedRoom}).
            </p>

            <div className={styles.refBadge}>
              Reserva N° #{bookingSuccess.reservationId}
            </div>

            <div style={{ textAlign: 'left', background: '#fdfbf7', padding: '0.85rem', borderRadius: '8px', margin: '0.85rem 0', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Huésped:</strong> {bookingSuccess.guest.firstName} {bookingSuccess.guest.lastName}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-In:</strong> {bookingSuccess.arrival}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-Out:</strong> {bookingSuccess.departure} ({bookingSuccess.nights} noche/s)</p>
              <p style={{ margin: 0 }}><strong>Total Estadía:</strong> {formatCurrency(bookingSuccess.unitTotal)}</p>
            </div>

            {bookingSuccess.bankAccounts && (
              <div className={styles.bankBox}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  <CreditCard size={15} style={{ display: 'inline', marginRight: '4px' }} />
                  Datos Bancarios para Garantía / Transferencia:
                </div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
                  {bookingSuccess.bankAccounts}
                </div>
              </div>
            )}

            <button
              className={styles.secondaryBtn}
              onClick={() => {
                const infoStr = `Reserva #${bookingSuccess.reservationId} en ${org.name}\nTipo: ${bookingSuccess.unitType}\nFechas: ${bookingSuccess.arrival} al ${bookingSuccess.departure}\nTotal: $${bookingSuccess.unitTotal.toLocaleString('es-CL')}`
                navigator.clipboard.writeText(infoStr)
                toast.success('Resumen de reserva copiado al portapapeles')
              }}
            >
              <Copy size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Copiar Resumen de Reserva
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${paletteClass}`}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.logo} />}
            <div>
              <h1 className={styles.orgTitle}>{org.name}</h1>
              <p className={styles.orgSubtitle}>Reservas & Cotización Directa</p>
            </div>
          </div>
          <div className={styles.badgeHeader}>
            <ShieldCheck size={14} />
            Garantía Directa
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className={styles.main}>
        <div className={styles.hero}>
          <h2 className={styles.title}>Cotiza y Reserva tu Estancia</h2>
          <p className={styles.subtitle}>
            Selecciona tu alojamiento, elige o estira tus fechas en el calendario y confirma tu reserva.
          </p>
        </div>

        {/* ── SIDE BY SIDE LAYOUT: Cabins (Left) + Calendar (Right) ───────── */}
        <div className={styles.topSectionGrid}>

          {/* LEFT COLUMN: CABINS LIST */}
          <div className={styles.cardCompact}>
            <h3 className={styles.cardHeaderTitle}>
              <span className={styles.stepBadge}>1</span>
              Tipos de Cabaña / Estancia
            </h3>
            <div className={styles.unitList}>
              {org.unitTypes.map(unit => {
                const minRate = unit.rates[0]?.rackRate || 0
                const isSelected = unit.id === selectedUnitType?.id

                return (
                  <div
                    key={unit.id}
                    className={`${styles.unitCard} ${isSelected ? styles.unitCardSelected : ''}`}
                    onClick={() => handleSelectUnitType(unit.id)}
                  >
                    <div className={styles.unitCardHeader}>
                      <h4 className={styles.unitName}>{unit.name}</h4>
                      <span className={styles.unitPrice}>
                        {formatCurrency(minRate)}/noche
                      </span>
                    </div>
                    <p className={styles.unitDesc}>
                      {unit.description || 'Equipada con todas las comodidades del recinto.'}
                    </p>
                    <div className={styles.unitMeta}>
                      <span className={styles.metaBadge}>
                        <Users size={11} /> Máx {unit.maxOccupancy} p.
                      </span>
                      <span className={styles.metaBadge}>
                        {unit.rooms.length} disp.
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: ULTRA COMPACT CALENDAR & DIRECT DATE INPUTS */}
          <div className={styles.cardCompact}>
            <h3 className={styles.cardHeaderTitle}>
              <span className={styles.stepBadge}>2</span>
              Fechas de Estancia y Calendario
            </h3>

            {/* DIRECT DATE INPUTS & OCCUPANTS ROW */}
            <div className={styles.dateInputsRow}>
              <div className={styles.inputControl}>
                <label>Check-In</label>
                <input
                  type="date"
                  min={todayStr}
                  value={arrivalDate ? format(arrivalDate, 'yyyy-MM-dd') : ''}
                  onChange={handleArrivalInputChange}
                />
              </div>

              <div className={styles.inputControl}>
                <label>Check-Out</label>
                <input
                  type="date"
                  min={arrivalDate ? format(arrivalDate, 'yyyy-MM-dd') : todayStr}
                  value={departureDate ? format(departureDate, 'yyyy-MM-dd') : ''}
                  onChange={handleDepartureInputChange}
                />
              </div>

              <div className={styles.inputControl}>
                <label>Adultos</label>
                <select value={adults} onChange={e => setAdults(Number(e.target.value))}>
                  {Array.from({ length: selectedUnitType?.maxOccupancy || 6 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Adulto(s)</option>
                  ))}
                </select>
              </div>

              <div className={styles.inputControl}>
                <label>Niños</label>
                <select value={children} onChange={e => setChildren(Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} Niño(s)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* MONTHLY CALENDAR CONTROL */}
            <div className={styles.calendarNav}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span className={styles.monthTitle}>
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <button
                type="button"
                className={styles.navBtn}
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                Siguiente <ChevronRight size={13} />
              </button>
            </div>

            <div className={styles.legendBar}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span className={`${styles.legendDot} ${styles.dotGreen}`} /> Libre
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span className={`${styles.legendDot} ${styles.dotRed}`} /> Agotado
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span className={`${styles.legendDot} ${styles.dotBrand}`} /> Selección
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <span className={`${styles.legendDot} ${styles.dotPast}`} /> Pasado
              </span>
            </div>

            {/* MONTH GRID ULTRA COMPACT */}
            <div className={styles.monthGrid}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className={styles.dayHeader}>{d}</div>
              ))}

              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {daysInMonth.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isPast = isBefore(day, today)
                const dayAvail = availability[dateStr]
                const isAvailable = !isPast && (dayAvail?.available !== false)

                const isStart = arrivalDate ? isSameDay(day, arrivalDate) : false
                const isEnd = departureDate ? isSameDay(day, departureDate) : false
                const isSingleSelected = isStart && isEnd

                const isInRange = arrivalDate && departureDate && isAfter(day, arrivalDate) && isBefore(day, departureDate)
                const isHoverRange = arrivalDate && !departureDate && hoverDate && isAfter(hoverDate, arrivalDate) && isAfter(day, arrivalDate) && (isBefore(day, hoverDate) || isSameDay(day, hoverDate))

                let cellClass = styles.dayCell
                if (isPast) cellClass += ` ${styles.dayPast}`
                else if (isSingleSelected) cellClass += ` ${styles.daySingleSelected}`
                else if (isStart) cellClass += ` ${styles.daySelectedStart}`
                else if (isEnd) cellClass += ` ${styles.daySelectedEnd}`
                else if (isInRange || isHoverRange) cellClass += ` ${styles.dayInRange}`
                else if (isAvailable) cellClass += ` ${styles.dayAvailable}`
                else cellClass += ` ${styles.daySoldOut}`

                return (
                  <div
                    key={dateStr}
                    className={cellClass}
                    onClick={() => handleDayClick(day, dayAvail)}
                    onMouseEnter={() => handleMouseEnterDay(day)}
                  >
                    {/* Drag Handle Start */}
                    {isStart && departureDate && (
                      <span
                        className={styles.dragHandleLeft}
                        title="Arrastra para ajustar fecha de llegada"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setDragSide('start')
                        }}
                      />
                    )}

                    <span>{format(day, 'd')}</span>

                    {!isPast && isAvailable && !isStart && !isEnd && !isInRange && (
                      <span className={styles.cellBadge}>
                        {dayAvail?.freeCount ?? 1} lib.
                      </span>
                    )}

                    {/* Drag Handle End */}
                    {isEnd && arrivalDate && (
                      <span
                        className={styles.dragHandleRight}
                        title="Arrastra para ajustar fecha de salida"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setDragSide('end')
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── STEP 2: LIVE QUOTATION BAR & PROCEED BUTTON ────────────────── */}
        {quotation && nights > 0 && (
          <div className={styles.quotationBar}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <div>
                <span className={styles.quoteDetailsText}>
                  {selectedUnitType.name} • {nights} noche(s) ({format(arrivalDate!, 'dd/MM')} al {format(departureDate!, 'dd/MM')})
                </span>
                <div className={styles.quoteMainAmount}>
                  {formatCurrency(quotation.totalPrice)}
                </div>
              </div>
            </div>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleProceedToGuestForm}
            >
              Ingresar Datos del Huésped <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 3: GUEST INFORMATION FORM (CONDITIONAL) ───────────────── */}
        {showGuestForm && (
          <div className={styles.guestSection} ref={guestFormRef}>
            <h3 className={styles.cardHeaderTitle}>
              <span className={styles.stepBadge}>3</span>
              Ingresar Datos del Huésped
            </h3>

            <form onSubmit={handleSubmitBooking}>
              <div className={styles.formGrid}>
                <div className={styles.formControl}>
                  <label>Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className={styles.formControl}>
                  <label>Apellido *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pérez"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formControl}>
                  <label>RUT / Pasaporte</label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                  />
                </div>
                <div className={styles.formControl}>
                  <label>Nacionalidad</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={e => setNationality(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formControl}>
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="juan@ejemplo.cl"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className={styles.formControl}>
                  <label>Teléfono Móvil / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+56 9 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formControl}>
                <label>Notas / Solicitudes Especiales</label>
                <textarea
                  rows={2}
                  placeholder="Hora estimada de llegada, requerimientos especiales..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* SUMMARY BOX */}
              <div className={styles.summaryBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span>Reserva en: <strong>{org.name}</strong> ({selectedUnitType.name})</span>
                  <span><strong>{nights} noche(s)</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>Total Estancia:</span>
                  <span>{quotation ? formatCurrency(quotation.totalPrice) : ''}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  {isSubmitting ? (
                    'Procesando Reserva...'
                  ) : (
                    <>
                      <Sparkles size={15} /> Confirmar Reserva Ahora
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
