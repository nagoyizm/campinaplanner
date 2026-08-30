'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, addMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isBefore, isAfter, isSameDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Users, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight,
  CreditCard, Copy, Check, PawPrint, Sun, Moon,
} from 'lucide-react'
import Icon from '@/components/ui/Icon'
import toast from 'react-hot-toast'
// Réplica exacta: reutiliza el CSS module de la página pública real
import styles from '@/app/reservar/[slug]/PublicBooking.module.css'
import narratorStyles from './narrator.module.css'
import { TOTAL_DEMO_STEPS, getDemoTheme, getStoredStep, storeDemoTheme, storeStep, resetDemo } from '../demo-flow'
import { DEFAULT_AGENDIO_TEXTS, mergeAgendio, type AgendioText } from '../demo-texts'

/* ── Datos ficticios y genéricos de la demo ── */
const svgImg = (a: string, b: string, t: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='260' fill='url(#g)'/><text x='50%' y='55%' font-family='sans-serif' font-size='40' font-weight='700' fill='rgba(255,255,255,0.85)' text-anchor='middle'>${t}</text></svg>`
  )}`

const UNIT_TYPES = [
  {
    id: 'c1', name: 'Tu Cabaña 1', maxOccupancy: 4,
    description: '2 dormitorios · quincho privado',
    imageUrl: svgImg('#33603F', '#5d8a67', 'Cabaña 1'),
    rates: [{ rackRate: 45000, includedOccupants: 2, extraPersonAdult: 10000, extraPersonChild: 5000 }],
  },
  {
    id: 'c2', name: 'Tu Cabaña 2', maxOccupancy: 2,
    description: '1 dormitorio · tinaja exterior',
    imageUrl: svgImg('#52796F', '#84a98c', 'Cabaña 2'),
    rates: [{ rackRate: 38000, includedOccupants: 2, extraPersonAdult: 10000, extraPersonChild: 5000 }],
  },
  {
    id: 'd1', name: 'Tu Domo 1', maxOccupancy: 2,
    description: 'Domo geodésico · terraza panorámica',
    imageUrl: svgImg('#355070', '#6d597a', 'Domo 1'),
    rates: [{ rackRate: 55000, includedOccupants: 2, extraPersonAdult: 12000, extraPersonChild: 6000 }],
  },
]

const GUEST = {
  firstName: 'Tu', lastName: 'Huésped',
  rut: '16234567-8', email: 'huesped@correo.com', phone: '+56 9 1234 5678',
  notes: 'Llegamos cerca de las 20:00 hrs.',
}
const CODE_ID = 2481

export default function DemoAgendioPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [steps, setSteps] = useState<AgendioText[]>(DEFAULT_AGENDIO_TEXTS)
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setTheme(getDemoTheme()) }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') storeDemoTheme(theme)
  }, [theme])

  /* Estados idénticos a la página real */
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState<string | null>(null)
  const [arrivalDate, setArrivalDate] = useState<Date | null>(null)
  const [departureDate, setDepartureDate] = useState<Date | null>(null)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [docType] = useState<'rut' | 'passport'>('rut')
  const [docValue, setDocValue] = useState('')
  const [nationality, setNationality] = useState('Chile')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [hasPet, setHasPet] = useState<boolean | null>(null)
  const [petCount, setPetCount] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null)

  /* Mes próximo: llegada 15, salida 18 */
  const { arrival, departure } = useMemo(() => {
    const n = addMonths(new Date(), 1)
    return { arrival: new Date(n.getFullYear(), n.getMonth(), 15), departure: new Date(n.getFullYear(), n.getMonth(), 18) }
  }, [])
  const currentMonth = useMemo(() => new Date(arrival.getFullYear(), arrival.getMonth(), 1), [arrival])

  const selectedUnitType = useMemo(() => UNIT_TYPES.find(u => u.id === selectedUnitTypeId) || null, [selectedUnitTypeId])
  const hasDatesSelected = Boolean(arrivalDate && departureDate)

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const todayStr = format(today, 'yyyy-MM-dd')

  /* Disponibilidad ficticia: un fin de semana completo ocupado para realismo */
  const SOLD_OUT = useMemo(() => {
    const set = new Set<string>()
    for (const d of [26, 27]) set.add(format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), 'yyyy-MM-dd'))
    return set
  }, [currentMonth])
  const dayAvail = useCallback((day: Date) => {
    const key = format(day, 'yyyy-MM-dd')
    if (SOLD_OUT.has(key)) return { available: false, freeCount: 0, totalRooms: 3 }
    return { available: true, freeCount: (day.getDate() % 3) || 1, totalRooms: 3 }
  }, [SOLD_OUT])

  const nights = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0
    return Math.max(0, Math.round((departureDate.getTime() - arrivalDate.getTime()) / 86400000))
  }, [arrivalDate, departureDate])

  /* Cotización igual a la real */
  const quotation = useMemo(() => {
    if (!selectedUnitType || nights <= 0) return null
    const rate = selectedUnitType.rates[0]
    const included = rate.includedOccupants
    const extraAdults = Math.max(0, adults - included)
    const extraChildren = extraAdults > 0 ? children : Math.max(0, adults + children - included)
    const nightExtraCharge = extraAdults * rate.extraPersonAdult + extraChildren * rate.extraPersonChild
    return { unitRate: rate.rackRate + nightExtraCharge, totalPrice: (rate.rackRate + nightExtraCharge) * nights }
  }, [selectedUnitType, nights, adults, children])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val || 0)

  /* Autocompleta el formulario con el huésped ficticio "Tu Huésped" */
  const fillGuest = useCallback(() => {
    setFirstName(GUEST.firstName); setLastName(GUEST.lastName); setDocValue(GUEST.rut)
    setEmail(GUEST.email); setPhone(GUEST.phone); setNotes(GUEST.notes); setHasPet(true); setPetCount(1)
  }, [])

  /* Clic en una cabaña: además avanza del paso 1 al 2 si estamos al inicio */
  const handleUnitClick = useCallback((id: string) => {
    setSelectedUnitTypeId(id)
    if (step === 0) setStep(1)
  }, [step])

  /* Clic en día: misma lógica que la página real + sincroniza los pasos de la demo */
  const handleDayClick = useCallback((day: Date) => {
    if (isBefore(day, today)) { toast.error('No se pueden seleccionar días pasados.'); return }
    if (dayAvail(day).available === false) { toast.error('Esta fecha se encuentra totalmente ocupada para este tipo de estancia.'); return }
    if (!arrivalDate || (arrivalDate && departureDate)) {
      // Inicio (o reinicio) de rango: esta es la llegada
      setArrivalDate(day); setDepartureDate(null)
      if (step <= 1) setStep(2)
    } else if (isSameDay(day, arrivalDate)) {
      setArrivalDate(null); setDepartureDate(null)
      if (step <= 2) setStep(1)
    } else if (isBefore(day, arrivalDate)) {
      setArrivalDate(day); setDepartureDate(null)
      if (step <= 1) setStep(2)
    } else {
      // Rango completo: el formulario aparece ya con los datos del huésped ficticio
      setDepartureDate(day)
      fillGuest()
      if (step <= 3) setStep(3)
    }
  }, [arrivalDate, departureDate, today, dayAvail, step, fillGuest])

  /* Acción determinista del paso i — sirve para avanzar y para reconstruir estado al volver atrás */
  const applyStepAction = useCallback((i: number, live: boolean) => {
    switch (i) {
      case 0: setSelectedUnitTypeId('c1'); break
      case 1: setArrivalDate(arrival); break
      case 2: setDepartureDate(departure); fillGuest(); break
      case 3: fillGuest(); break
      case 4:
        if (!live) {
          setBookingSuccess({
            status: 'on_hold', reservationId: CODE_ID, unitType: UNIT_TYPES[0].name, assignedRoom: UNIT_TYPES[0].name,
            arrival: format(arrival, 'yyyy-MM-dd'), departure: format(departure, 'yyyy-MM-dd'), nights: 3,
            pets: 1, unitTotal: 150000,
            guest: { firstName: GUEST.firstName, lastName: GUEST.lastName },
            confirmationMessage: 'Te enviaremos un correo cuando la reserva sea confirmada.',
            bankAccounts: 'Banco Estado · Cuenta RUT\n1536-2248-9107\nTu Recinto Ltda.',
          })
          return
        }
        setIsSubmitting(true)
        submitTimer.current = setTimeout(() => {
          setIsSubmitting(false)
          applyStepAction(4, false)
          toast.success('¡Reserva registrada exitosamente!')
        }, 900)
        break
    }
  }, [arrival, departure, fillGuest])

  /* Volver al paso k: limpia todo y repite las acciones 0..k-1 */
  const restoreTo = useCallback((k: number) => {
    if (submitTimer.current) { clearTimeout(submitTimer.current); submitTimer.current = null }
    setIsSubmitting(false)
    setSelectedUnitTypeId(null); setArrivalDate(null); setDepartureDate(null)
    setFirstName(''); setLastName(''); setDocValue(''); setEmail(''); setPhone('')
    setNotes(''); setHasPet(null); setPetCount(1); setBookingSuccess(null)
    for (let i = 0; i < k; i++) applyStepAction(i, false)
    setStep(k)
  }, [applyStepAction])

  /* Al montar: retoma el recorrido donde estaba y aplica el tema */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', getDemoTheme())
    const stored = getStoredStep()
    if (stored > 0 && stored < DEFAULT_AGENDIO_TEXTS.length) restoreTo(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Carga textos editados desde el panel SaaS */
  useEffect(() => {
    fetch('/api/public/demo-texts')
      .then(r => r.json())
      .then(data => { if (data.agendio) setSteps(mergeAgendio(data.agendio)) })
      .catch(() => { /* defaults */ })
  }, [])

  useEffect(() => { storeStep(step) }, [step])
  useEffect(() => () => { if (submitTimer.current) clearTimeout(submitTimer.current) }, [])

  /* Avanzar guiado: cada ESPACIO ejecuta la acción real de un usuario */
  const advance = useCallback(() => {
    if (isSubmitting) return
    if (step >= steps.length - 1) { router.push('/demo/planner'); return }
    applyStepAction(step, true)
    setStep(s => s + 1)
  }, [step, isSubmitting, steps.length, applyStepAction, router])

  const back = useCallback(() => {
    if (step <= 0) return
    restoreTo(step - 1)
  }, [step, restoreTo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((typing || tag === 'BUTTON') && e.code === 'Space') return
      if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); advance() }
      if (e.code === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back])

  /* Render del mes: idéntico a la página real */
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  /* ── Pantalla de éxito (idéntica a la real) ── */
  if (bookingSuccess) {
    return (
<div className={styles.container} data-theme={theme}>
        <div className={styles.bgDecor1} /><div className={styles.bgDecor2} />
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.brand}>
              <div className={styles.titleContainerInline}>
                <h1 className={styles.orgTitle}>Tu Recinto</h1>
                <span className={styles.orgSubtitleInline}>• Reserva Por Confirmar</span>
              </div>
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.confirmCard}>
            <div className={styles.iconSuccess}><Icon icon={CheckCircle2} size="3xl" /></div>
            <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem' }}>¡Tu Reserva quedó Registrada!</h2>
            <p className={styles.orgSubtitle}>
              Tu estancia en <strong>{bookingSuccess.unitType}</strong> ({bookingSuccess.assignedRoom}) fue registrada y queda <strong>por confirmar</strong>. Te avisaremos cuando esté confirmada.
            </p>
            {bookingSuccess.confirmationMessage && <div className={styles.confirmNote}>{bookingSuccess.confirmationMessage}</div>}
            <div className={styles.refBadge}>Reserva N° #{bookingSuccess.reservationId}</div>
            <div style={{ textAlign: 'left', background: 'var(--subtle-bg)', padding: '0.85rem', margin: '0.85rem 0', border: '1px solid var(--border-color)', borderRadius: '2px', fontSize: '0.8rem', color: 'var(--primary-950)' }}>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Huésped:</strong> {bookingSuccess.guest.firstName} {bookingSuccess.guest.lastName}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-In:</strong> {bookingSuccess.arrival}</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Check-Out:</strong> {bookingSuccess.departure} ({bookingSuccess.nights} noche/s)</p>
              <p style={{ margin: '0 0 0.3rem 0' }}><strong>Mascota(s):</strong> {bookingSuccess.pets}</p>
              <p style={{ margin: 0 }}><strong>Total Estadía:</strong> {formatCurrency(bookingSuccess.unitTotal)}</p>
            </div>
            <div className={styles.bankBox}>
              <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--primary-950)' }}>
                <Icon icon={CreditCard} size="sm" style={{ display: 'inline', marginRight: '4px' }} />
                Datos Bancarios para Garantía / Transferencia:
              </div>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.45', color: 'var(--text-sub)' }}>{bookingSuccess.bankAccounts}</div>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                navigator.clipboard.writeText(`Reserva #${CODE_ID} en Tu Recinto`).catch(() => {})
                toast.success('Resumen de reserva copiado al portapapeles')
              }}
            >
              <Icon icon={Copy} size="sm" style={{ display: 'inline', marginRight: '4px' }} />
              Copiar Resumen de Reserva
            </button>
          </div>
        </main>
        <Narrator step={Math.min(step, steps.length - 1)} steps={steps} onBack={back} onAdvance={advance} />
      </div>
    )
  }

  /* ── Página principal (idéntica a la real) ── */
  return (
    <div className={styles.container} data-theme={theme} style={{ paddingBottom: 200 }}>
      <div className={styles.bgDecor1} /><div className={styles.bgDecor2} />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <div className={styles.titleContainerInline}>
              <h1 className={styles.orgTitle}>Tu Recinto</h1>
              <span className={styles.orgSubtitleInline}>• Reservas & Cotización Directa</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.themeToggleBtn}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          >
            <Icon icon={theme === 'dark' ? Sun : Moon} size="md" />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h2 className={styles.title}>Cotiza y Reserva tu Estancia</h2>
          <p className={styles.subtitle}>
            {selectedUnitType
              ? 'Elige tus fechas en el calendario para cotizar y completar la reserva.'
              : 'Selecciona una de nuestras opciones de alojamiento para ver la disponibilidad.'}
          </p>
        </div>

        <div className={styles.flowWrapper}>
          {!selectedUnitType && (
            <div className={styles.initialPromptBadge}>
              <Icon icon={CalendarIcon} size="sm" />
              Haz clic en una opción para desplegar el calendario de disponibilidad
            </div>
          )}

          <div className={styles.unifiedLayoutContainer}>
            <aside className={selectedUnitType ? styles.cardsContainerSidebar : styles.cardsContainerCentered}>
              {selectedUnitType && (
                <div className={styles.cardsSidebarHeader}>
                  <span>Alojamiento</span>
                  <span className={styles.metaBadge}>{UNIT_TYPES.length} opc.</span>
                </div>
              )}
              <div className={selectedUnitType ? styles.cardsSidebarList : styles.unitCardsRowCentered}>
                {UNIT_TYPES.map(unit => {
                  const isSelected = unit.id === selectedUnitType?.id
                  const minRate = unit.rates[0].rackRate

                  if (!selectedUnitType) {
                    return (
                      <div key={unit.id} className={styles.unitCardCompact} onClick={() => handleUnitClick(unit.id)}>
                        <div className={styles.cardImageWrapper}>
                          <img src={unit.imageUrl} alt={unit.name} className={styles.cardImage} />
                        </div>
                        <div className={styles.cardBody}>
                          <h4 className={styles.unitName}>{unit.name}</h4>
                          <p className={styles.unitDesc}>{unit.description}</p>
                          <div className={styles.cardFooterRow}>
                            <div className={styles.metaBadge}><Icon icon={Users} size="xs" /> Máx {unit.maxOccupancy} p.</div>
                            <div className={styles.unitPrice}>{formatCurrency(minRate)} <span className={styles.perNight}>/ noche</span></div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  if (isSelected) {
                    return (
                      <div key={unit.id} className={styles.sidebarCardExpanded}>
                        <div className={styles.cardImageWrapper}>
                          <img src={unit.imageUrl} alt={unit.name} className={styles.cardImage} />
                          <span className={styles.selectedBadge}><Icon icon={Check} size="xs" /> Elegido</span>
                        </div>
                        <div className={styles.cardBody}>
                          <h4 className={styles.unitName}>{unit.name}</h4>
                          <p className={styles.unitDesc}>{unit.description}</p>
                          <div className={styles.cardFooterRow}>
                            <div className={styles.metaBadge}><Icon icon={Users} size="xs" /> Máx {unit.maxOccupancy} p.</div>
                            <div className={styles.unitPrice}>{formatCurrency(minRate)} <span className={styles.perNight}>/ noche</span></div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={unit.id}
                      className={styles.sidebarCardCollapsed}
                      onClick={() => handleUnitClick(unit.id)}
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

            {selectedUnitType && (
              <div className={`${styles.calendarAndFormArea} ${styles.areaVisible}`}>
                {/* CALENDARIO */}
                <div className={`${styles.calendarCard} ${hasDatesSelected ? styles.calendarCardShrunk : ''}`}>
                  <h3 className={styles.cardHeaderTitle}>Disponibilidad — {selectedUnitType.name}</h3>

                  <div className={styles.dateInputsRow}>
                    <div className={styles.inputControl}>
                      <label>Check-In</label>
                      <input type="date" min={todayStr} value={arrivalDate ? format(arrivalDate, 'yyyy-MM-dd') : ''} readOnly />
                    </div>
                    <div className={styles.inputControl}>
                      <label>Check-Out</label>
                      <input type="date" min={arrivalDate ? format(arrivalDate, 'yyyy-MM-dd') : todayStr} value={departureDate ? format(departureDate, 'yyyy-MM-dd') : ''} readOnly />
                    </div>
                    <div className={styles.inputControl}>
                      <label>Adultos</label>
                      <select value={adults} onChange={e => setAdults(Number(e.target.value))}>
                        {Array.from({ length: selectedUnitType.maxOccupancy }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} Adulto(s)</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.inputControl}>
                      <label>Niños</label>
                      <select value={children} onChange={e => setChildren(Number(e.target.value))}>
                        {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Niño(s)</option>)}
                      </select>
                    </div>
                  </div>

                  <div className={styles.calendarNav}>
                    <button type="button" className={styles.navBtn}><Icon icon={ChevronLeft} size="xs" /> Anterior</button>
                    <span className={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                    <button type="button" className={styles.navBtn}>Siguiente <Icon icon={ChevronRight} size="xs" /></button>
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

                  <div className={styles.monthGrid}>
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                      <div key={d} className={styles.dayHeader}>{d}</div>
                    ))}
                    {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
                    {daysInMonth.map(day => {
                      const isPast = isBefore(day, today)
                      const avail = dayAvail(day)
                      const isAvailable = !isPast && avail.available !== false
                      const isStart = arrivalDate ? isSameDay(day, arrivalDate) : false
                      const isEnd = departureDate ? isSameDay(day, departureDate) : false
                      const isInRange = arrivalDate && departureDate && isAfter(day, arrivalDate) && isBefore(day, departureDate)

                      let cellClass = styles.dayCell
                      if (isPast) cellClass += ` ${styles.dayPast}`
                      else if (isStart && isEnd) cellClass += ` ${styles.daySingleSelected}`
                      else if (isStart) cellClass += ` ${styles.daySelectedStart}`
                      else if (isEnd) cellClass += ` ${styles.daySelectedEnd}`
                      else if (isInRange) cellClass += ` ${styles.dayInRange}`
                      else if (isAvailable) cellClass += ` ${styles.dayAvailable}`
                      else cellClass += ` ${styles.daySoldOut}`

                      return (
                        <div key={format(day, 'yyyy-MM-dd')} className={cellClass} onClick={() => handleDayClick(day)}>
                          <span>{format(day, 'd')}</span>
                          {!isPast && isAvailable && !isStart && !isEnd && !isInRange && (
                            <span className={styles.cellBadge}>{avail.freeCount} lib.</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* FORMULARIO */}
                {hasDatesSelected && (
                  <div className={styles.guestFormCardAnimated}>
                    <h3 className={styles.cardHeaderTitle}>Datos del Huésped & Confirmación</h3>
                    {quotation && (
                      <div className={styles.quotationHeaderBox}>
                        <div>
                          <span className={styles.quoteDetailsText}>
                            {selectedUnitType.name} • {nights} noche(s) ({format(arrivalDate!, 'dd/MM')} al {format(departureDate!, 'dd/MM')})
                          </span>
                          <div className={styles.quoteMainAmount}>{formatCurrency(quotation.totalPrice)}</div>
                        </div>
                      </div>
                    )}
                    <form onSubmit={e => { e.preventDefault(); advance() }}>
                      <div className={styles.formGrid}>
                        <div className={styles.formControl}>
                          <label>Nombre *</label>
                          <input type="text" required placeholder="Ej. Juan" value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className={styles.formControl}>
                          <label>Apellido *</label>
                          <input type="text" required placeholder="Ej. Pérez" value={lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                      </div>

                      <div className={styles.formControl}>
                        <label>Tipo de Documento</label>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <button type="button" style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid', borderColor: docType === 'rut' ? 'var(--primary-color)' : 'var(--border-color)', background: docType === 'rut' ? 'var(--primary-strong)' : 'transparent', color: docType === 'rut' ? 'var(--on-primary)' : 'var(--text-sub)', fontWeight: docType === 'rut' ? 800 : 500, borderRadius: '2px', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s' }}>
                            RUT Chile
                          </button>
                          <button type="button" style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid', borderColor: 'var(--border-color)', background: 'transparent', color: 'var(--text-sub)', fontWeight: 500, borderRadius: '2px', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s' }}>
                            Pasaporte / ID
                          </button>
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.formControl}>
                          <label>RUT *</label>
                          <input type="text" required placeholder="12345678-9 (sin puntos)" value={docValue} onChange={e => setDocValue(e.target.value.replace(/[^0-9kK]/g, '').toUpperCase())} maxLength={10} inputMode="numeric" style={{ letterSpacing: '0.05em', fontFamily: 'monospace' }} />
                        </div>
                        <div className={styles.formControl}>
                          <label>Nacionalidad</label>
                          <input type="text" value={nationality} placeholder="Chile" onChange={e => setNationality(e.target.value)} />
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.formControl}>
                          <label>Correo Electrónico *</label>
                          <input type="email" required placeholder="juan@ejemplo.cl" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className={styles.formControl}>
                          <label>Teléfono Móvil / WhatsApp *</label>
                          <input type="tel" required placeholder="+56 9 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                      </div>

                      <div className={styles.formControl}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Icon icon={PawPrint} size="sm" style={{ display: 'inline' }} /> ¿Viajan con mascota?
                        </label>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button type="button" onClick={() => setHasPet(false)} style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid', borderColor: hasPet === false ? 'var(--primary-color)' : 'var(--border-color)', background: hasPet === false ? 'var(--primary-strong)' : 'transparent', color: hasPet === false ? 'var(--on-primary)' : 'var(--text-sub)', fontWeight: hasPet === false ? 800 : 500, borderRadius: '2px', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s' }}>
                            No
                          </button>
                          <button type="button" onClick={() => setHasPet(true)} style={{ flex: 1, padding: '0.45rem 0.65rem', border: '1.5px solid', borderColor: hasPet === true ? 'var(--primary-color)' : 'var(--border-color)', background: hasPet === true ? 'var(--primary-strong)' : 'transparent', color: hasPet === true ? 'var(--on-primary)' : 'var(--text-sub)', fontWeight: hasPet === true ? 800 : 500, borderRadius: '2px', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s' }}>
                            Sí, con mascota
                          </button>
                          {hasPet === true && (
                            <select value={petCount} onChange={e => setPetCount(Number(e.target.value))} style={{ width: '90px', padding: '0.45rem', border: '1.5px solid var(--border-color)', borderRadius: '2px', fontSize: '0.78rem', color: 'var(--primary-950)', background: 'var(--input-bg)' }}>
                              {[1, 2, 3].map(n => <option key={n} value={n}>{n} mascota{n > 1 ? 's' : ''}</option>)}
                            </select>
                          )}
                        </div>
                      </div>

                      <div className={styles.formControl}>
                        <label>Notas / Solicitudes Especiales</label>
                        <textarea rows={2} placeholder="Hora estimada de llegada, requerimientos especiales..." value={notes} onChange={e => setNotes(e.target.value)} />
                      </div>

                      <div className={styles.summaryBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span>Reserva en: <strong>Tu Recinto</strong> ({selectedUnitType.name})</span>
                          <span><strong>{nights} noche(s)</strong></span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.88rem' }}>
                          <span>Total Estancia:</span>
                          <span>{quotation ? formatCurrency(quotation.totalPrice) : ''}</span>
                        </div>
                      </div>

                      <button type="submit" className={styles.btnPrimary} disabled={isSubmitting} style={{ width: '100%', padding: '0.75rem' }}>
                        {isSubmitting ? 'Procesando Reserva...' : 'Reservar'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Narrator step={step} steps={steps} onBack={back} onAdvance={advance} />
    </div>
  )
}

function Narrator({ step, steps, onBack, onAdvance }: {
  step: number; steps: AgendioText[]; onBack: () => void; onAdvance: () => void
}) {
  const s = steps[Math.min(step, steps.length - 1)]
  return (
    <div className={narratorStyles.bar} role="status" aria-live="polite">
      <div className={narratorStyles.dots} aria-hidden>
        {Array.from({ length: TOTAL_DEMO_STEPS }).map((_, i) => (
          <span key={i} className={`${narratorStyles.dot} ${i <= step ? narratorStyles.dotOn : ''}`} />
        ))}
      </div>
      <div className={narratorStyles.textCol}>
        <p className={narratorStyles.title}><strong>Paso {step + 1} de {TOTAL_DEMO_STEPS}</strong> · {s.title}</p>
        <p className={narratorStyles.text}>{s.text}</p>
      </div>
      <div className={narratorStyles.actions}>
        <button type="button" className={narratorStyles.reset} onClick={resetDemo}>Reiniciar</button>
        <button type="button" className={narratorStyles.prev} onClick={onBack} disabled={step <= 0} aria-label="Paso anterior">
          <ChevronLeft size={15} aria-hidden />
        </button>
        <button type="button" className={step >= steps.length - 1 ? narratorStyles.nextFinal : narratorStyles.next} onClick={onAdvance}>
          {step >= steps.length - 1 ? <>Ir al planner <ChevronRight size={15} aria-hidden /></> : <>Siguiente <kbd>ESPACIO</kbd></>}
        </button>
      </div>
    </div>
  )
}
