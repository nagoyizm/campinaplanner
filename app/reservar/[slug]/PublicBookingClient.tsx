'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  format, addMonths, addDays, parseISO,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, isAfter, differenceInDays, getDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users, CheckCircle2, ChevronLeft, ChevronRight,
  CreditCard, Copy, Sparkles, Check, Calendar as CalendarIcon,
  Sun, Moon
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './PublicBooking.module.css'

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=80',
]

interface Rate {
  id: string
  name: string
  rackRate: number
  includedOccupants: number
  extraPersonAdult: number
  extraPersonChild: number
  weekendSurcharge: number
  petFee: number
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
  imageUrl?: string | null
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
  // Initially null so calendar is hidden from start
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<string | null>(null)

  // Light / dark mode toggle — persists in localStorage
  const [lightMode, setLightMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('agendio-reservas-theme') === 'light'
  })
  const toggleTheme = () => {
    setLightMode(prev => {
      const next = !prev
      localStorage.setItem('agendio-reservas-theme', next ? 'light' : 'dark')
      return next
    })
  }

  // Header scroll state for smooth hide on scroll down
  const [scrolled, setScrolled] = useState(false)

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

  // Form reference
  const guestFormRef = useRef<HTMLDivElement>(null)

  // Guest details form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [docType, setDocType] = useState<'rut' | 'passport'>('rut')
  const [docValue, setDocValue] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('Chile')
  const [notes, setNotes] = useState('')

  // Pet state
  const [hasPet, setHasPet] = useState<boolean | null>(null)
  const [petCount, setPetCount] = useState<number>(1)

  // State & Availability
  const [availability, setAvailability] = useState<Record<string, { available: boolean; freeCount: number; totalRooms: number }>>({})
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null)

  const selectedUnitType = useMemo(() => {
    if (!selectedUnitTypeId) return null
    return org.unitTypes.find(u => u.id === selectedUnitTypeId) || null
  }, [org, selectedUnitTypeId])

  const hasDatesSelected = Boolean(arrivalDate && departureDate)

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

  // Scroll listener for smooth header disappearance when scrolling down
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Today at midnight
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // ── RUT formatter: produces XXXXXXXX-X (no dots) ────────────────────
  const formatRut = (raw: string): string => {
    const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
    if (clean.length === 0) return ''
    if (clean.length === 1) return clean
    const body = clean.slice(0, -1)
    const dv   = clean.slice(-1)
    return `${body}-${dv}`
  }

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (docType === 'rut') {
      setDocValue(formatRut(e.target.value))
    } else {
      setDocValue(e.target.value)
    }
  }

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
          `/api/public/disponibilidad?slug=${org.slug}&unitTypeId=${selectedUnitType!.id}&year=${year}&month=${month}`
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

  // Select Unit Type Card
  const handleSelectUnitType = (id: string) => {
    setSelectedUnitTypeId(id)
    setArrivalDate(null)
    setDepartureDate(null)
  }

  const handleDocTypeChange = (type: 'rut' | 'passport') => {
    setDocType(type)
    setDocValue('')
    if (type === 'rut') setNationality('Chile')
    else setNationality('')
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

  // Mouse Enter during Dragging or Hover
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

  // Calendar Day Click
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
    } else {
      if (isSameDay(day, arrivalDate)) {
        setArrivalDate(null)
        setDepartureDate(null)
        setHoverDate(null)
      } else if (isBefore(day, arrivalDate)) {
        setArrivalDate(day)
        setDepartureDate(null)
        setHoverDate(null)
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
  }

  // Direct Date Input Change (Check-Out)
  const handleDepartureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) {
      setDepartureDate(null)
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

  // Handle Form Submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUnitType) return

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

    if (hasPet === null) {
      toast.error('Por favor indica si traes mascota o no.')
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
          pets: hasPet ? petCount : 0,
          guest: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            rut: docType === 'rut' ? docValue.trim() : null,
            passport: docType === 'passport' ? docValue.trim() : null,
            docType,
            email: email.trim(),
            phone: phone.trim(),
            nationality: nationality.trim() || (docType === 'rut' ? 'Chile' : ''),
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
      <div className={`${styles.container} ${paletteClass} ${lightMode ? styles.lightMode : ''}`}>
        <div className={styles.bgDecor1} />
        <div className={styles.bgDecor2} />
        <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
          <div className={styles.headerContent}>
            <div className={styles.brand}>
              {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.logo} />}
              <div className={styles.titleContainerInline}>
                <h1 className={styles.orgTitle}>{org.name}</h1>
                <span className={styles.orgSubtitleInline}>• Reserva Confirmada</span>
              </div>
            </div>
            <button
              className={styles.themeToggleBtn}
              onClick={toggleTheme}
              title={lightMode ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              aria-label={lightMode ? 'Modo oscuro' : 'Modo claro'}
            >
              {lightMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>
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

            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.25)', padding: '0.85rem', margin: '0.85rem 0', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '0.8rem' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Huésped:</strong> {bookingSuccess.guest.firstName} {bookingSuccess.guest.lastName}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-In:</strong> {bookingSuccess.arrival}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-Out:</strong> {bookingSuccess.departure} ({bookingSuccess.nights} noche/s)</p>
              {bookingSuccess.pets > 0 && (
                <p style={{ margin: '0 0 0.3rem 0' }}><strong>🐾 Mascota(s):</strong> {bookingSuccess.pets}</p>
              )}
              <p style={{ margin: 0 }}><strong>Total Estadía:</strong> {formatCurrency(bookingSuccess.unitTotal)}</p>
            </div>

            {bookingSuccess.bankAccounts && (
              <div className={styles.bankBox}>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#ffffff' }}>
                  <CreditCard size={15} style={{ display: 'inline', marginRight: '4px' }} />
                  Datos Bancarios para Garantía / Transferencia:
                </div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.45', color: 'rgba(255,255,255,0.7)' }}>
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
    <div className={`${styles.container} ${paletteClass} ${lightMode ? styles.lightMode : ''}`}>
      {/* Background Ambient Orbs (Login Aesthetic) */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />

      {/* ── HEADER (Smooth fade out on scroll) ─────────────────────────── */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.logo} />}
            <div className={styles.titleContainerInline}>
              <h1 className={styles.orgTitle}>{org.name}</h1>
              <span className={styles.orgSubtitleInline}>• Reservas & Cotización Directa</span>
            </div>
          </div>
          <button
            className={styles.themeToggleBtn}
            onClick={toggleTheme}
            title={lightMode ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label={lightMode ? 'Modo oscuro' : 'Modo claro'}
          >
            {lightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className={styles.main}>
        <div className={styles.hero}>
          <h2 className={styles.title}>Cotiza y Reserva tu Estancia</h2>
          <p className={styles.subtitle}>
            {selectedUnitType
              ? 'Elige tus fechas en el calendario para cotizar y completar la reserva.'
              : 'Selecciona una de nuestras opciones de alojamiento para ver la disponibilidad.'}
          </p>
        </div>

        {/* ── UNIFIED WRAPPER (CONTINUOUS DOM FOR 60FPS MORPHING TRANSITION) ─ */}
        <div className={styles.flowWrapper}>
          
          {/* INITIAL PROMPT BADGE */}
          {!selectedUnitType && (
            <div className={styles.initialPromptBadge}>
              <CalendarIcon size={15} />
              Haz clic en una opción para desplegar el calendario de disponibilidad
            </div>
          )}

          {/* DYNAMIC COMBINED CONTAINER */}
          <div className={styles.unifiedLayoutContainer}>
            
            {/* CARDS CONTAINER (PERSISTENT NODE THAT MORPHS STATE) */}
            <aside className={selectedUnitType ? styles.cardsContainerSidebar : styles.cardsContainerCentered}>
              {selectedUnitType && (
                <div className={styles.cardsSidebarHeader}>
                  <span>Alojamiento</span>
                  <span className={styles.metaBadge}>{org.unitTypes.length} opc.</span>
                </div>
              )}

              <div className={selectedUnitType ? styles.cardsSidebarList : styles.unitCardsRowCentered}>
                {org.unitTypes.map((unit, index) => {
                  const isSelected = unit.id === selectedUnitType?.id
                  const minRate = unit.rates[0]?.rackRate || 0
                  const imgSrc = unit.imageUrl || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]

                  {/* INITIAL STATE: COMPACT HORIZONTAL GRID CARDS */}
                  if (!selectedUnitType) {
                    return (
                      <div
                        key={unit.id}
                        className={styles.unitCardCompact}
                        onClick={() => handleSelectUnitType(unit.id)}
                      >
                        <div className={styles.cardImageWrapper}>
                          <img
                            src={imgSrc}
                            alt={unit.name}
                            className={styles.cardImage}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallbackEl = (e.target as HTMLElement).nextElementSibling;
                              if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className={styles.cardImageFallback} style={{ display: 'none' }}>
                            <span>{unit.name}</span>
                          </div>
                        </div>
                        <div className={styles.cardBody}>
                          <h4 className={styles.unitName}>{unit.name}</h4>
                          <p className={styles.unitDesc}>
                            {unit.description || 'Equipada con todas las comodidades del recinto.'}
                          </p>
                          <div className={styles.cardFooterRow}>
                            <div className={styles.metaBadge}>
                              <Users size={11} /> Máx {unit.maxOccupancy} p.
                            </div>
                            <div className={styles.unitPrice}>
                              {formatCurrency(minRate)} <span className={styles.perNight}>/ noche</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  {/* SELECTED STATE: EXPANDED CARD */}
                  if (isSelected) {
                    return (
                      <div key={unit.id} className={styles.sidebarCardExpanded}>
                        <div className={styles.cardImageWrapper}>
                          <img
                            src={imgSrc}
                            alt={unit.name}
                            className={styles.cardImage}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallbackEl = (e.target as HTMLElement).nextElementSibling;
                              if (fallbackEl) (fallbackEl as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className={styles.cardImageFallback} style={{ display: 'none' }}>
                            <span>{unit.name}</span>
                          </div>
                          <span className={styles.selectedBadge}>
                            <Check size={11} /> Elegido
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <h4 className={styles.unitName}>{unit.name}</h4>
                          <p className={styles.unitDesc}>
                            {unit.description || 'Equipada con todas las comodidades.'}
                          </p>
                          <div className={styles.cardFooterRow}>
                            <div className={styles.metaBadge}>
                              <Users size={11} /> Máx {unit.maxOccupancy} p.
                            </div>
                            <div className={styles.unitPrice}>
                              {formatCurrency(minRate)} <span className={styles.perNight}>/ noche</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  {/* SELECTED STATE: UNSELECTED COLLAPSED CARD */}
                  return (
                    <div
                      key={unit.id}
                      className={styles.sidebarCardCollapsed}
                      onClick={() => handleSelectUnitType(unit.id)}
                      title={`Cambiar a ${unit.name}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                        <h5 className={styles.collapsedTitle}>{unit.name}</h5>
                      </div>
                      <span className={styles.collapsedPrice}>{formatCurrency(minRate)}</span>
                    </div>
                  )
                })}
              </div>
            </aside>

            {/* CALENDAR & FORM AREA (COUPLES SMOOTHLY WHEN A CARD IS PRESSED) */}
            {selectedUnitType && (
              <div className={`${styles.calendarAndFormArea} ${styles.areaVisible}`}>
                
                {/* CALENDAR CARD */}
                <div className={`${styles.calendarCard} ${hasDatesSelected ? styles.calendarCardShrunk : ''}`}>
                  <h3 className={styles.cardHeaderTitle}>
                    Disponibilidad — {selectedUnitType.name}
                  </h3>

                  {/* DATE INPUTS & OCCUPANTS ROW */}
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
                      <span className={`${styles.legendDot} ${styles.dotRed}`} /> Ocupado
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className={`${styles.legendDot} ${styles.dotBrand}`} /> Selección
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className={`${styles.legendDot} ${styles.dotPast}`} /> Pasado
                    </span>
                  </div>

                  {/* MONTH GRID */}
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
                          {isStart && departureDate && (
                            <span
                              className={styles.dragHandleLeft}
                              title="Arrastra para ajustar llegada"
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

                          {isEnd && arrivalDate && (
                            <span
                              className={styles.dragHandleRight}
                              title="Arrastra para ajustar salida"
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

                {/* GUEST FORM (SLIDES IN BESIDE CALENDAR WHEN DATES ARE SELECTED) */}
                {hasDatesSelected && (
                  <div className={styles.guestFormCardAnimated} ref={guestFormRef}>
                    <h3 className={styles.cardHeaderTitle}>
                      Datos del Huésped & Confirmación
                    </h3>

                    {quotation && (
                      <div className={styles.quotationHeaderBox}>
                        <div>
                          <span className={styles.quoteDetailsText}>
                            {selectedUnitType.name} • {nights} noche(s) ({format(arrivalDate!, 'dd/MM')} al {format(departureDate!, 'dd/MM')})
                          </span>
                          <div className={styles.quoteMainAmount}>
                            {formatCurrency(quotation.totalPrice)}
                          </div>
                        </div>
                      </div>
                    )}

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

                      {/* DOCUMENT TYPE SELECTOR (ROUNDED 10PX) */}
                      <div className={styles.formControl}>
                        <label>Tipo de Documento</label>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleDocTypeChange('rut')}
                            style={{
                              flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid',
                              borderColor: docType === 'rut' ? 'var(--primary-color)' : 'var(--border-color)',
                              background: docType === 'rut' ? 'var(--primary-color)' : 'transparent',
                              color: docType === 'rut' ? '#09140e' : 'rgba(255,255,255,0.7)',
                              fontWeight: docType === 'rut' ? 800 : 500,
                              borderRadius: '10px',
                              cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s'
                            }}
                          >
                            RUT Chile
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocTypeChange('passport')}
                            style={{
                              flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid',
                              borderColor: docType === 'passport' ? 'var(--primary-color)' : 'var(--border-color)',
                              background: docType === 'passport' ? 'var(--primary-color)' : 'transparent',
                              color: docType === 'passport' ? '#09140e' : 'rgba(255,255,255,0.7)',
                              fontWeight: docType === 'passport' ? 800 : 500,
                              borderRadius: '10px',
                              cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s'
                            }}
                          >
                            Pasaporte / ID
                          </button>
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.formControl}>
                          <label>{docType === 'rut' ? 'RUT *' : 'Pasaporte / ID *'}</label>
                          <input
                            type="text"
                            required
                            placeholder={docType === 'rut' ? '12345678-9 (sin puntos)' : 'Ej. AB123456'}
                            value={docValue}
                            onChange={handleDocChange}
                            maxLength={docType === 'rut' ? 10 : 30}
                            inputMode={docType === 'rut' ? 'numeric' : 'text'}
                            style={{ letterSpacing: docType === 'rut' ? '0.05em' : 'normal', fontFamily: docType === 'rut' ? 'monospace' : 'inherit' }}
                          />
                          {docType === 'rut' && docValue && docValue.length < 8 && (
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'block' }}>
                              Formato: sin puntos, con guión (ej: 12345678-9)
                            </span>
                          )}
                        </div>
                        <div className={styles.formControl}>
                          <label>Nacionalidad</label>
                          <input
                            type="text"
                            value={nationality}
                            placeholder={docType === 'rut' ? 'Chile' : 'Ej. Argentina, EE.UU...'}
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

                      {/* PET TOGGLE (ROUNDED 10PX) */}
                      <div className={styles.formControl}>
                        <label>🐾 ¿Viajan con mascota?</label>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setHasPet(false)}
                            style={{
                              flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid',
                              borderColor: hasPet === false ? 'var(--primary-color)' : 'var(--border-color)',
                              background: hasPet === false ? 'var(--primary-color)' : 'transparent',
                              color: hasPet === false ? '#09140e' : 'rgba(255,255,255,0.7)',
                              fontWeight: hasPet === false ? 800 : 500,
                              borderRadius: '10px',
                              cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s'
                            }}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            onClick={() => setHasPet(true)}
                            style={{
                              flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid',
                              borderColor: hasPet === true ? 'var(--primary-color)' : 'var(--border-color)',
                              background: hasPet === true ? 'var(--primary-color)' : 'transparent',
                              color: hasPet === true ? '#09140e' : 'rgba(255,255,255,0.7)',
                              fontWeight: hasPet === true ? 800 : 500,
                              borderRadius: '10px',
                              cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s'
                            }}
                          >
                            Sí, con mascota 🐶🐱
                          </button>
                          {hasPet === true && (
                            <select
                              value={petCount}
                              onChange={e => setPetCount(Number(e.target.value))}
                              style={{ width: '90px', padding: '0.45rem', border: '1.5px solid var(--border-color)', borderRadius: '10px', fontSize: '0.78rem' }}
                            >
                              {[1, 2, 3].map(n => (
                                <option key={n} value={n}>{n} mascota{n > 1 ? 's' : ''}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {hasPet === null && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '3px', display: 'block' }}>
                            Requerido — indica si llevarás mascota a la estadía
                          </span>
                        )}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.88rem' }}>
                          <span>Total Estancia:</span>
                          <span>{quotation ? formatCurrency(quotation.totalPrice) : ''}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={isSubmitting}
                        style={{ width: '100%', padding: '0.75rem' }}
                      >
                        {isSubmitting ? 'Procesando Reserva...' : 'Confirmar Reserva Ahora'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
