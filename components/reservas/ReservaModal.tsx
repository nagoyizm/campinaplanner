'use client'

import { useState, useEffect } from 'react'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  X, Plus, Trash2, Loader2, Save,
  LogIn, LogOut
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './ReservaModal.module.css'

// ── Types ────────────────────────────────────────────────────────
interface Room { id: string; code: string; name: string; unitType: { name: string }; defaultRate?: { id: string; name: string; rackRate: number } | null }
interface Rate { id: string; name: string; rackRate: number; includedOccupants: number; extraPersonAdult: number; extraPersonChild: number }
interface Guest { id: string; firstName: string; lastName: string; rut?: string; email?: string; phone?: string; nationality?: string; referral?: string }

interface ReservationRoomLine {
  id?: string
  roomId: string
  rateId: string
  arrival: string
  departure: string
  nights: number
  adults: number
  children: number
  unitRate: number
  unitTotal: number
}

interface Extra {
  id?: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes?: string
  paymentMethod?: string
}

const PAYMENT_METHODS = [
  'Transferencia', 'Efectivo', 'POS Tarjeta Crédito', 'POS Tarjeta Débito', 'Link Pago Tarjeta Crédito', 'Link Pago Tarjeta Débito'
]

const ACCOUNT_CODES = [
  'Santander', 'Scotiabank', 'Banco de Chile', 'BE Chequera', 'BE Rut', 'BE Turismo', 'BE Turismo (POS/LP)', 'BCI/MACH', 'Caja'
]

const DTE_OPTIONS = [
  'Hacer Boleta', 'Boleta', 'NB/F', 'Hacer Factura', 'Factura', 'Nota de Crédito'
]

const NATIONALITIES = [
  'Chile', 'Argentina', 'Brasil', 'Colombia', 'Perú', 'Uruguay', 'Venezuela', 'Ecuador',
  'Bolivia', 'Paraguay', 'México', 'España', 'Estados Unidos', 'Otra'
]

const STATUS_OPTIONS = [
  { value: 'booked',      label: 'Reservado',   color: '#3b82f6' },
  { value: 'confirmed',   label: 'Confirmado',   color: '#10b981' },
  { value: 'checked_in',  label: 'Check-In',     color: '#f59e0b' },
  { value: 'checked_out', label: 'Check-Out',    color: '#6b7280' },
  { value: 'blocked',     label: 'Bloqueado',    color: '#1f2937' },
  { value: 'cancelled',   label: 'Cancelado',    color: '#ef4444' },
  { value: 'no_show',     label: 'No Show',      color: '#8b5cf6' },
]

// ── Format CLP ───────────────────────────────────────────────────
function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

// ── Main Component ────────────────────────────────────────────────
interface ReservaModalProps {
  reservaId: number | null
  defaultRoomId?: string
  defaultArrival?: Date
  defaultDeparture?: Date
  onClose: () => void
  onSave: () => void
}

export default function ReservaModal({
  reservaId: initialReservaId,
  defaultRoomId,
  defaultArrival,
  defaultDeparture,
  onClose,
  onSave,
}: Readonly<ReservaModalProps>) {
  const [currentResId, setCurrentResId] = useState<number | null>(initialReservaId)
  const [tab, setTab] = useState<'reserva' | 'billing' | 'historial' | 'huesped'>('reserva')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [rates, setRates] = useState<Rate[]>([])
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState<Guest[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])

  // ── Form state ───────────────────────────────────────────────
  const [status, setStatus] = useState('booked')
  const [guestId, setGuestId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('+56')
  const [nationality, setNationality] = useState('Chile')
  const [source, setSource] = useState('Directa')
  const [createdByName, setCreatedByName] = useState('')
  const [address, setAddress] = useState('')
  const [guestNotes, setGuestNotes] = useState('')
  const [referral, setReferral] = useState('')

  // Tags
  const [isVip, setIsVip] = useState(false)
  const [isNoisy, setIsNoisy] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isDifficult, setIsDifficult] = useState(false)
  const [isNewPax, setIsNewPax] = useState(true)
  const [isRecurring, setIsRecurring] = useState(false)
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [lateCheckoutHrs, setLateCheckoutHrs] = useState<number | ''>('')
  const [earlyCheckinHrs, setEarlyCheckinHrs] = useState<number | ''>('')

  // PAX
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [pets, setPets] = useState(0)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [totalPaid, setTotalPaid] = useState(0)

  // Extra info
  const [lostItems, setLostItems] = useState('')
  const [notes, setNotes] = useState('')
  const [dte, setDte] = useState('')
  const [guaranteeRsv, setGuaranteeRsv] = useState('')
  const [guaranteeGames, setGuaranteeGames] = useState('')

  // Room lines
  const [roomLines, setRoomLines] = useState<ReservationRoomLine[]>([])

  // Financial
  const [discounts, setDiscounts] = useState(0)
  const [extras, setExtras] = useState<Extra[]>([])
  const [tax, setTax] = useState(0)
  
  // Catalogs for Extras and Payments
  const [extraCatalog, setExtraCatalog] = useState<{name: string, price: number}[]>([])
  const [paymentOptions, setPaymentOptions] = useState<{methods: string[], accounts: string[], dtes: string[]}>({
    methods: PAYMENT_METHODS,
    accounts: ACCOUNT_CODES,
    dtes: DTE_OPTIONS,
  })

  // ── Load data ─────────────────────────────────────────────────
  const safeFetchJson = async (url: string, fallback: any) => {
    try {
      const res = await fetch(url)
      return await res.json()
    } catch {
      return fallback
    }
  }

  const setDefaultRoomLine = (roomsData: any[], ratesData: any[]) => {
    const defaultRoom = roomsData.find((r: Room) => r.id === defaultRoomId) || roomsData[0]
    const defaultRate = defaultRoom?.defaultRate || ratesData[0]
    const arr = defaultArrival ? format(defaultArrival, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const dep = defaultDeparture ? format(defaultDeparture, 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const nights = differenceInDays(new Date(dep), new Date(arr)) || 1

    setRoomLines([{
      roomId: defaultRoom?.id || '',
      rateId: defaultRate?.id || '',
      arrival: arr,
      departure: dep,
      nights,
      adults: 2,
      children: 0,
      unitRate: defaultRate?.rackRate || 0,
      unitTotal: (defaultRate?.rackRate || 0) * nights,
    }])
  }

  const populateExistingReservation = (data: any) => {
    setStatus(data.status)
    setGuestId(data.guestId)
    setFirstName(data.guest.firstName)
    setLastName(data.guest.lastName)
    setRut(data.guest.rut || '')
    setSource(data.source || 'Directa')
    setCreatedByName(data.createdByName || '')
    setEmail(data.guest.email || '')
    setPhone(data.guest.phone || '+56')
    setNationality(data.guest.nationality || 'Chile')
    setAddress(data.guest.address || '')
    setGuestNotes(data.guest.notes || '')
    setReferral(data.guest.referral || '')
    setIsVip(data.isVip)
    setIsNoisy(data.isNoisy)
    setIsDirty(data.isDirty)
    setIsDifficult(data.isDifficult)
    setIsNewPax(data.isNewPax)
    setIsRecurring(data.isRecurring)
    setIsWalkIn(data.isWalkIn)
    setLateCheckoutHrs(data.lateCheckoutHrs || '')
    setEarlyCheckinHrs(data.earlyCheckinHrs || '')
    setAdults(data.adults)
    setChildren(data.children)
    setPets(data.pets)
    setPaymentMethod(data.paymentMethod || '')
    setAccountCode(data.accountCode || '')
    setTotalPaid(data.totalPaid)
    setLostItems(data.lostItems || '')
    setNotes(data.notes || '')
    setDte(data.dte || '')
    setGuaranteeRsv(data.guaranteeRsv || '')
    setGuaranteeGames(data.guaranteeGames || '')
    setDiscounts(data.discounts)
    
    const parsedExtras = (data.extras || []).map((e: any) => {
      let extractedMethod = ''
      let extractedNotes = e.notes || ''
      const match = extractedNotes.match(/^\[Pago:\s(.*?)\]\s?(.*)$/)
      if (match) {
        extractedMethod = match[1]
        extractedNotes = match[2]
      }
      return { ...e, paymentMethod: extractedMethod, notes: extractedNotes }
    })
    setExtras(parsedExtras)
    
    setTax(data.tax)
    setAuditLog(data.auditLogs || [])
    setRoomLines(data.rooms.map((r: any) => ({
      id: r.id,
      roomId: r.roomId,
      rateId: r.rateId || '',
      arrival: r.arrival.split('T')[0],
      departure: r.departure.split('T')[0],
      nights: r.nights,
      adults: r.adults,
      children: r.children,
      unitRate: r.unitRate,
      unitTotal: r.unitTotal,
    })))
  }

  const resolvePaymentOptions = (pagosData: any) => {
    if (!pagosData) return
    setPaymentOptions({
      methods: pagosData.paymentMethods ? pagosData.paymentMethods.split(',') : PAYMENT_METHODS,
      accounts: pagosData.bankAccounts ? pagosData.bankAccounts.split(',') : ACCOUNT_CODES,
      dtes: pagosData.dteOptions ? pagosData.dteOptions.split(',') : DTE_OPTIONS,
    })
  }

  const buildCatalog = (invData: any, amData: any) => {
    const catalog = [
      ...((invData && !invData.error) ? invData.map((i: any) => ({ name: i.name, price: i.unitCost })) : []),
      ...((amData && !amData.error) ? amData.map((a: any) => ({ name: a.name, price: a.price })) : []),
    ]
    setExtraCatalog(catalog)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [roomsData, ratesData, invData, amData, pagosData] = await Promise.all([
          safeFetchJson('/api/rooms', []),
          safeFetchJson('/api/rates', []),
          safeFetchJson('/api/inventario', []),
          safeFetchJson('/api/setup/amenities', []),
          safeFetchJson('/api/setup/pagos', null),
        ])
        
        setRooms(roomsData)
        setRates(ratesData)

        resolvePaymentOptions(pagosData)
        buildCatalog(invData, amData)

        if (currentResId) {
          const data = await safeFetchJson(`/api/reservas/${currentResId}`, null)
          if (data) populateExistingReservation(data)
        } else {
          setDefaultRoomLine(roomsData, ratesData)
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error cargando datos')
      }
      setLoading(false)
    }
    loadData()
  }, [currentResId])

  // ── Guest search ──────────────────────────────────────────────
  useEffect(() => {
    if (guestSearch.length < 2) { setGuestResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/huespedes?q=${encodeURIComponent(guestSearch)}&limit=5`)
      const data = await res.json()
      setGuestResults(data)
    }, 300)
    return () => clearTimeout(t)
  }, [guestSearch])

  // Sincronizar automáticamente total de adultos y niños desde la selección de habitaciones
  useEffect(() => {
    const totalAdults = roomLines.reduce((sum, line) => sum + line.adults, 0)
    const totalChildren = roomLines.reduce((sum, line) => sum + line.children, 0)
    setAdults(totalAdults)
    setChildren(totalChildren)
  }, [roomLines])

  const selectGuest = (g: Guest) => {
    setGuestId(g.id)
    setFirstName(g.firstName)
    setLastName(g.lastName)
    setRut(g.rut || '')
    setEmail(g.email || '')
    setPhone(g.phone || '+56')
    setNationality(g.nationality || 'Chile')
    setReferral(g.referral || '')
    setGuestSearch('')
    setGuestResults([])
    setIsNewPax(false)
    toast.success(`Huésped: ${g.firstName} ${g.lastName}`)
  }

  // ── Room line management ──────────────────────────────────────
  const addRoomLine = () => {
    const firstLine = roomLines[0]
    setRoomLines(prev => [...prev, {
      roomId: rooms[0]?.id || '',
      rateId: rates[0]?.id || '',
      arrival: firstLine?.arrival || format(new Date(), 'yyyy-MM-dd'),
      departure: firstLine?.departure || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      nights: firstLine?.nights || 1,
      adults: 2,
      children: 0,
      unitRate: rates[0]?.rackRate || 0,
      unitTotal: (rates[0]?.rackRate || 0) * (firstLine?.nights || 1),
    }])
  }

  const updateRoomLine = (idx: number, field: keyof ReservationRoomLine, value: any) => {
    setRoomLines(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }

      // Recalculate nights and total
      if (field === 'arrival' || field === 'departure') {
        const arr = new Date(field === 'arrival' ? value : updated[idx].arrival)
        const dep = new Date(field === 'departure' ? value : updated[idx].departure)
        const nights = Math.max(1, differenceInDays(dep, arr))
        updated[idx].nights = nights
        updated[idx].unitTotal = updated[idx].unitRate * nights
      }
      if (field === 'rateId') {
        const rate = rates.find(r => r.id === value)
        if (rate) {
          updated[idx].unitRate = rate.rackRate
          updated[idx].unitTotal = rate.rackRate * updated[idx].nights
        }
      }
      if (field === 'roomId') {
        const room = rooms.find(r => r.id === value)
        if (room?.defaultRate) {
          updated[idx].rateId = room.defaultRate.id
          updated[idx].unitRate = room.defaultRate.rackRate
          updated[idx].unitTotal = room.defaultRate.rackRate * updated[idx].nights
        }
      }
      return updated
    })
  }

  const removeRoomLine = (idx: number) => {
    if (roomLines.length === 1) return
    setRoomLines(prev => prev.filter((_, i) => i !== idx))
  }

  const handleTotalAdultsChange = (val: number) => {
    if (roomLines.length === 0) return
    const otherRoomsSum = roomLines.slice(1).reduce((s, r) => s + r.adults, 0)
    const newFirstRoomVal = Math.max(1, val - otherRoomsSum)
    updateRoomLine(0, 'adults', newFirstRoomVal)
  }

  const handleTotalChildrenChange = (val: number) => {
    if (roomLines.length === 0) return
    const otherRoomsSum = roomLines.slice(1).reduce((s, r) => s + r.children, 0)
    const newFirstRoomVal = Math.max(0, val - otherRoomsSum)
    updateRoomLine(0, 'children', newFirstRoomVal)
  }

  // ── Calculations ──────────────────────────────────────────────
  // ── Extra line management ──────────────────────────────────────
  const addExtraLine = () => {
    setExtras(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  const updateExtraLine = (idx: number, field: keyof Extra, value: any) => {
    setExtras(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }

      if (field === 'name') {
        const item = extraCatalog.find(i => i.name === value)
        if (item) {
          updated[idx].unitPrice = item.price
          updated[idx].total = item.price * updated[idx].quantity
        }
      }

      if (field === 'quantity' || field === 'unitPrice') {
        updated[idx].total = updated[idx].quantity * updated[idx].unitPrice
      }

      return updated
    })
  }

  const removeExtraLine = (idx: number) => {
    setExtras(prev => prev.filter((_, i) => i !== idx))
  }

  const additionalServicesTotal = extras.reduce((sum, ext) => sum + ext.total, 0)
  const unitTotal = roomLines.reduce((sum, line) => sum + line.unitTotal, 0)
  const preTaxTotal = unitTotal + additionalServicesTotal - discounts
  const postTaxTotal = preTaxTotal + tax
  const amountDue = postTaxTotal - totalPaid

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva permanentemente?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/reservas/${currentResId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar reserva')
      toast.success('Reserva eliminada exitosamente')
      onSave()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar la reserva')
    }
    setDeleting(false)
  }

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async (closeOnSuccess: boolean = true, newStatus?: string) => {
    if (!firstName || !lastName) {
      toast.error('Nombre y apellido son requeridos')
      return
    }
    if (roomLines.length === 0 || !roomLines[0].roomId) {
      toast.error('Agrega al menos una habitación')
      return
    }

    setSaving(true)
    try {
      const payload = {
        reservaId: currentResId,
        status: newStatus || status,
        source,
        guest: { id: guestId || null, firstName, lastName, rut, email, phone, nationality, address, notes: guestNotes, referral },
        isVip, isNoisy, isDirty, isDifficult, isNewPax, isRecurring, isWalkIn,
        lateCheckoutHrs: lateCheckoutHrs || null,
        earlyCheckinHrs: earlyCheckinHrs || null,
        adults, children, pets,
        paymentMethod, accountCode, totalPaid,
        lostItems, notes, dte, guaranteeRsv, guaranteeGames,
        unitTotal, additionalServices: additionalServicesTotal, discounts, tax,
        rooms: roomLines,
        extras: extras.map(ext => {
          let combinedNotes = ext.notes || ''
          if (ext.paymentMethod) {
            combinedNotes = `[Pago: ${ext.paymentMethod}] ${combinedNotes}`.trim()
          }
          return {
            id: ext.id,
            name: ext.name,
            quantity: ext.quantity,
            unitPrice: ext.unitPrice,
            total: ext.total,
            notes: combinedNotes
          }
        }),
      }

      const res = await fetch('/api/reservas', {
        method: currentResId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Error guardando reserva')

      const savedData = await res.json()
      if (!currentResId && savedData.id) {
        setCurrentResId(savedData.id)
      }

      toast.success(currentResId ? 'Reserva actualizada' : 'Reserva guardada exitosamente')
      if (closeOnSuccess) {
        onSave()
      } else {
        // Just trigger refresh in parent without closing if possible? 
        // Wait, parent's onSave might close it automatically if the parent is managing modal state!
        // We need to just NOT call onSave if we don't want to close it, OR we need the parent to know.
        // For now, if we don't call onSave, the data is saved in DB, and local state is updated.
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar la reserva')
    }
    setSaving(false)
  }

  // ── Quick status buttons ──────────────────────────────────────
  const quickStatus = (s: string) => handleSave(true, s)

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal modal-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-500)' }} />
            <p className="text-muted">Cargando reserva...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <button 
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 'none', cursor: 'default' }}
        aria-label="Cerrar modal"
        tabIndex={-1}
      />
      <div className={`modal modal-xl ${styles.modal}`} style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Modal Header ── */}
        <div className="modal-header">
          <div className={styles.headerLeft}>
            <div className={styles.rsvBadge}>
              {currentResId ? `Rsv #${currentResId}` : 'Nueva Reserva'}
            </div>
            <div>
              {(firstName || lastName) && (
                <p className={styles.headerGuest}>{firstName} {lastName}</p>
              )}
              <div className={styles.headerInfo}>
                {roomLines.length > 0 && (
                  <span>{roomLines.reduce((s, r) => s + r.nights, 0)} noche(s)</span>
                )}
                {currentResId && (
                  <>
                    <span className={styles.headerDot}>·</span>
                    <span style={{color: 'var(--brand-500)', fontWeight: 500}}>Creada por {createdByName || 'Usuario'} vía {source || 'Directa'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            {/* Quick actions */}
            {currentResId && status !== 'checked_in' && (
              <button className="btn btn-sm" style={{background:'#f59e0b',color:'#fff'}} onClick={() => quickStatus('checked_in')}>
                <LogIn size={13} /> Check-In
              </button>
            )}
            {currentResId && status === 'checked_in' && (
              <button className="btn btn-sm" style={{background:'#6b7280',color:'#fff'}} onClick={() => quickStatus('checked_out')}>
                <LogOut size={13} /> Check-Out
              </button>
            )}
            {/* Status selector */}
            <select
              className="input"
              style={{ width: 140, fontSize: 12 }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {(['reserva', 'billing', 'historial', 'huesped'] as const).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'reserva' && '🏠 Reserva'}
              {t === 'billing' && '💰 Billing'}
              {t === 'historial' && '📋 Historial'}
              {t === 'huesped' && '👤 Huésped'}
            </button>
          ))}
        </div>

        {/* ── Modal Body ── */}
        <div className="modal-body">

          {/* ══ TAB: RESERVA ══ */}
          {tab === 'reserva' && (
            <div className={styles.tabContent}>
              {/* Room Selection Table */}
              <div className={styles.sectionTitle}>Selección de Habitaciones</div>
              <div className="table-container" style={{ marginBottom: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Llegada</th>
                      <th>Noches</th>
                      <th>Salida</th>
                      <th>Habitación</th>
                      <th>Tarifa</th>
                      <th>Adultos</th>
                      <th>Niños</th>
                      <th>Tarifa/Noche</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomLines.map((line, idx) => (
                      <tr key={`${line.roomId}-${line.arrival}-${idx}`}>
                        <td>
                          <input
                            type="date"
                            className="input"
                            style={{ width: 130 }}
                            value={line.arrival}
                            onChange={e => updateRoomLine(idx, 'arrival', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input"
                            style={{ width: 60 }}
                            value={line.nights}
                            min={1}
                            readOnly
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            className="input"
                            style={{ width: 130 }}
                            value={line.departure}
                            onChange={e => updateRoomLine(idx, 'departure', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="input"
                            style={{ width: 160 }}
                            value={line.roomId}
                            onChange={e => updateRoomLine(idx, 'roomId', e.target.value)}
                          >
                            {rooms.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.code} — {r.name.replace(/^[a-z]-/i, '')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input"
                            style={{ width: 190 }}
                            value={line.rateId}
                            onChange={e => updateRoomLine(idx, 'rateId', e.target.value)}
                          >
                            {rates.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="number" className="input" style={{ width: 60 }} min={1} value={line.adults} onChange={e => updateRoomLine(idx, 'adults', +e.target.value)} />
                        </td>
                        <td>
                          <input type="number" className="input" style={{ width: 60 }} min={0} value={line.children} onChange={e => updateRoomLine(idx, 'children', +e.target.value)} />
                        </td>
                        <td className="currency">{formatCLP(line.unitRate)}</td>
                        <td className="currency font-semibold">{formatCLP(line.unitTotal)}</td>
                        <td>
                          {roomLines.length > 1 && (
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeRoomLine(idx)}>
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addRoomLine} id="modal-add-room">
                <Plus size={14} /> Agregar Habitación
              </button>

              <div className={styles.divider} />

              {/* Guest Info + Booking Summary side by side */}
              <div className={styles.twoCol}>
                <div>
                  {/* Guest Search */}
                  <div className={styles.sectionTitle}>Información del Huésped</div>
                  <div className={styles.guestSearchWrapper}>
                    <input
                      className="input"
                      placeholder="Buscar huésped existente..."
                      value={guestSearch}
                      onChange={e => setGuestSearch(e.target.value)}
                    />
                    {guestResults.length > 0 && (
                      <div className={styles.guestDropdown}>
                        {guestResults.map(g => (
                          <button key={g.id} className={styles.guestOption} onClick={() => selectGuest(g)}>
                            <strong>{g.firstName} {g.lastName}</strong>
                            <span>{g.rut} · {g.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.guestGrid}>
                    <div className="form-group">
                      <label htmlFor="form-control-1" className="form-label required">Nombre</label>
                      <input id="form-control-1" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-2" className="form-label required">Apellido</label>
                      <input id="form-control-2" className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Pérez" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-3" className="form-label">RUT</label>
                      <input id="form-control-3" className="input" value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-9" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-4" className="form-label">Email</label>
                      <input id="form-control-4" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.cl" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-5" className="form-label">Celular</label>
                      <input id="form-control-5" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+569..." />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-6" className="form-label">Nacionalidad</label>
                      <select id="form-control-6" className="select" value={nationality} onChange={e => setNationality(e.target.value)}>
                        {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="form-control-7" className="form-label">Dirección</label>
                      <input id="form-control-7" className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, ciudad" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-8" className="form-label">Origen (Canal)</label>
                      <select id="form-control-8" className="select" value={source} onChange={e => setSource(e.target.value)}>
                        <option value="Directa">Directa (Recepción/Web)</option>
                        <option value="Booking.com">Booking.com</option>
                        <option value="Airbnb">Airbnb</option>
                        <option value="Expedia">Expedia</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Whatsapp">WhatsApp</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-9" className="form-label">Referencia / Convenio</label>
                      <input id="form-control-9" className="input" value={referral} onChange={e => setReferral(e.target.value)} placeholder="Ej: Municipalidad..." />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Características del Huésped</div>
                  <div className={styles.tagsRow}>
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
                        type="button"
                        className={`chip ${tag.cls}`}
                        style={{ 
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

                  {/* Special hours */}
                  <div className={styles.specialHours}>
                    <div className="form-group">
                      <label htmlFor="form-control-10" className="form-label">🕐 Late Check-out (hrs)</label>
                      <input id="form-control-10" type="number" className="input" min={0} max={12} value={lateCheckoutHrs} onChange={e => setLateCheckoutHrs(e.target.value ? +e.target.value : '')} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-11" className="form-label">🌅 Early Check-in (hrs)</label>
                      <input id="form-control-11" type="number" className="input" min={0} max={12} value={earlyCheckinHrs} onChange={e => setEarlyCheckinHrs(e.target.value ? +e.target.value : '')} placeholder="0" />
                    </div>
                  </div>

                  {/* PAX */}
                  <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Pasajeros y Mascotas</div>
                  <div className={styles.paxRow}>
                    <div className="form-group">
                      <label htmlFor="form-control-12" className="form-label">Total Adultos</label>
                      <input id="form-control-12" type="number" className="input" min={1} value={adults} onChange={e => handleTotalAdultsChange(+e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-13" className="form-label">Total Niños</label>
                      <input id="form-control-13" type="number" className="input" min={0} value={children} onChange={e => handleTotalChildrenChange(+e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-14" className="form-label">🐕 Mascotas</label>
                      <input id="form-control-14" type="number" className="input" min={0} value={pets} onChange={e => setPets(+e.target.value)} />
                    </div>
                  </div>

                  {/* Payment + Notes */}
                  <div className={styles.sectionTitle} style={{ marginTop: 16 }}>PAGOS, GARANTÍAS y NOTAS</div>
                  <div className={styles.twoColSmall}>
                    <div className="form-group">
                      <label htmlFor="form-control-15" className="form-label">Forma de pago</label>
                      <select id="form-control-15" className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {paymentOptions.methods.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-16" className="form-label">CUENTA DESTINO</label>
                      <select id="form-control-16" className="select" value={accountCode} onChange={e => setAccountCode(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {paymentOptions.accounts.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={styles.twoColSmall} style={{ marginTop: 12 }}>
                    <div className="form-group">
                      <label htmlFor="form-control-17" className="form-label">DTE</label>
                      <select id="form-control-17" className="select" value={dte} onChange={e => setDte(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {paymentOptions.dtes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-18" className="form-label">Objeto perdido</label>
                      <input id="form-control-18" className="input" value={lostItems} onChange={e => setLostItems(e.target.value)} placeholder="Descripción..." />
                    </div>
                  </div>
                  <div className={styles.twoColSmall} style={{ marginTop: 12 }}>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
                      <input 
                        type="checkbox" 
                        id="garantia-rsv"
                        checked={guaranteeRsv === 'true'} 
                        onChange={e => setGuaranteeRsv(e.target.checked ? 'true' : 'false')} 
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <label htmlFor="garantia-rsv" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>GARANTÍA RSV</label>
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-control-19" className="form-label">GARANTÍA JUEGOS</label>
                      <input id="form-control-19" className="input" value={guaranteeGames} onChange={e => setGuaranteeGames(e.target.value)} placeholder="Ej: Efectivo $10.000..." />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label htmlFor="form-control-20" className="form-label">Notas adicionales</label>
                    <textarea id="form-control-20" className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas, instrucciones especiales..." style={{ minHeight: 60 }} />
                  </div>
                </div>

                {/* ── Booking Summary ── */}
                <div className={styles.bookingSummary}>
                  <div className={styles.summaryTitle}>Resumen de Reserva</div>
                  <div className={styles.summaryRow}>
                    <span>Total Unidades</span>
                    <span className="currency">{formatCLP(unitTotal)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Cargos Adicionales</span>
                    <span className="currency">{formatCLP(additionalServicesTotal)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Descuentos</span>
                    <span className="currency" style={{ color: '#ef4444' }}>-{formatCLP(discounts)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Impuestos</span>
                    <span className="currency">{formatCLP(tax)}</span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                    <span>Total</span>
                    <span className="currency">{formatCLP(postTaxTotal)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Total Pagado</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: 120, textAlign: 'right' }}
                      value={totalPaid}
                      min={0}
                      onChange={e => setTotalPaid(+e.target.value)}
                    />
                  </div>
                  <div className={`${styles.summaryRow} ${styles.summaryDue} ${amountDue > 0 ? styles.due : styles.paid}`}>
                    <span>Monto Adeudado</span>
                    <span className="currency">{formatCLP(amountDue)}</span>
                  </div>
                  {amountDue > 0 && (
                    <button className="btn btn-primary w-full" style={{ marginTop: 12 }} onClick={() => setTotalPaid(postTaxTotal)}>
                      Marcar como Pagado
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: BILLING ══ */}
          {tab === 'billing' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Gestión de Cargos y Descuentos</div>
              
              <div style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--surface-2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontWeight: 600 }}>Cargos Adicionales</h4>
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={addExtraLine}>
                    <Plus size={14} /> Agregar Cargo
                  </button>
                </div>
                {extras.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No hay cargos adicionales.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {extras.map((ext, idx) => (
                      <div key={`extra-edit-${ext.name}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'center', backgroundColor: 'var(--surface-1)', padding: 8, borderRadius: 6 }}>
                        <select className="select" style={{ width: 160, padding: '4px 8px', height: 32 }} value={ext.name} onChange={e => updateExtraLine(idx, 'name', e.target.value)}>
                          <option value="">Elegir cargo...</option>
                          {extraCatalog.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                        </select>
                        <input type="number" className="input" style={{ width: 60, padding: '4px 8px', height: 32 }} value={ext.quantity} min={1} placeholder="Cant" onChange={e => updateExtraLine(idx, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))} />
                        <input type="number" className="input" style={{ width: 90, padding: '4px 8px', height: 32 }} value={ext.unitPrice} placeholder="Precio" onChange={e => updateExtraLine(idx, 'unitPrice', e.target.value === '' ? 0 : Number(e.target.value))} />
                        <input type="text" className="input" style={{ flex: 1, padding: '4px 8px', height: 32 }} value={ext.notes || ''} placeholder="Nota..." onChange={e => updateExtraLine(idx, 'notes', e.target.value)} />
                        <select className="select" style={{ width: 140, padding: '4px 8px', height: 32 }} value={ext.paymentMethod || ''} onChange={e => updateExtraLine(idx, 'paymentMethod', e.target.value)}>
                          <option value="">Pago (Opcional)</option>
                          {paymentOptions.methods.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span style={{ width: 80, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{formatCLP(ext.total)}</span>
                        <button className="btn btn-ghost" style={{ padding: 4, color: '#ef4444', height: 32 }} onClick={() => removeExtraLine(idx)}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}

                <hr style={{ margin: '16px 0', borderColor: 'var(--border-color)' }} />
                
                <div style={{ display: 'flex', gap: 32 }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Descuentos Generales</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 70, textAlign: 'right', padding: '6px 8px' }}
                        placeholder="%"
                        min={0}
                        max={100}
                        onChange={e => {
                          const pct = e.target.value === '' ? 0 : Number(e.target.value)
                          if (pct >= 0) setDiscounts(Math.round(unitTotal * (pct / 100)))
                        }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
                      <span style={{ color: '#ef4444', marginLeft: 8, fontWeight: 600 }}>−$</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 120, textAlign: 'right', padding: '6px 8px' }}
                        value={discounts || ''}
                        placeholder="0"
                        min={0}
                        onChange={e => setDiscounts(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Impuestos / IVA</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>+$</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 120, textAlign: 'right', padding: '6px 8px' }}
                        value={tax || ''}
                        placeholder="0"
                        min={0}
                        onChange={e => setTax(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.sectionTitle}>Folio / Desglose de Cuenta</div>
              
              <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Nro</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Descripción</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Precio Unit.</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Cargos</th>
                      <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Pagos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Habitaciones */}
                    {roomLines.map((room, idx) => (
                      <tr key={`room-billing-${room.roomId}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>Habitación {room.roomId} ({room.arrival} a {room.departure})</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{room.nights}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCLP(room.unitRate)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{formatCLP(room.unitTotal)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                      </tr>
                    ))}

                    {/* Extras */}
                    {extras.map((ext, idx) => (
                      <tr key={`extra-billing-${ext.name}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{roomLines.length + idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>{ext.name || 'Extra sin nombre'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{ext.quantity}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCLP(ext.unitPrice)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{formatCLP(ext.total)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                      </tr>
                    ))}

                    {/* Descuentos */}
                    {discounts > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>-</td>
                        <td style={{ padding: '12px 16px' }}>Descuento aplicado</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>1</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>-{formatCLP(discounts)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#ef4444' }}>-{formatCLP(discounts)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                      </tr>
                    )}

                    {/* Impuestos */}
                    {tax > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>-</td>
                        <td style={{ padding: '12px 16px' }}>Impuestos / IVA</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>1</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCLP(tax)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>{formatCLP(tax)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                      </tr>
                    )}

                    {/* Pagos */}
                    {totalPaid > 0 && (
                      <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>-</td>
                        <td style={{ padding: '12px 16px' }}>
                          Pago: {paymentMethod || 'No especificado'} {accountCode ? `(${accountCode})` : ''}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>1</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCLP(totalPaid)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}></td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatCLP(totalPaid)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--surface-2)', fontWeight: 600 }}>
                      <td colSpan={4} style={{ padding: '16px', textAlign: 'right' }}>Totales:</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-base)' }}>{formatCLP(postTaxTotal)}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#10b981' }}>{formatCLP(totalPaid)}</td>
                    </tr>
                    <tr>
                      <td colSpan={6} style={{ padding: '16px', textAlign: 'right', fontSize: '1.1rem' }}>
                        Monto Adeudado (Amount Due): <strong style={{ color: amountDue > 0 ? '#ef4444' : '#10b981', marginLeft: '8px' }}>{formatCLP(amountDue)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ══ TAB: HISTORIAL ══ */}
          {tab === 'historial' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Historial de Cambios</div>
              {auditLog.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '32px 0' }}>
                  Sin historial disponible
                </p>
              ) : (
                <div className={styles.auditList}>
                  {auditLog.map((log: any) => (
                    <div key={log.id} className={styles.auditItem}>
                      <div className={styles.auditDot} />
                      <div>
                        <p className={styles.auditAction}>{log.action}</p>
                        {log.details && <p className={styles.auditDetail}>{log.details}</p>}
                        <p className={styles.auditTime}>
                          {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                          {log.user && ` · ${log.user.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: HUÉSPED ══ */}
          {tab === 'huesped' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Notas del Huésped</div>
              <div className="form-group">
                <label htmlFor="form-control-21" className="form-label">Notas internas del huésped</label>
                <textarea id="form-control-21"
                  className="textarea"
                  value={guestNotes}
                  onChange={e => setGuestNotes(e.target.value)}
                  placeholder="Historial, preferencias, observaciones..."
                  style={{ minHeight: 120 }}
                />
              </div>
            </div>
          )}

        </div>

        {/* ── Modal Footer ── */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {currentResId && (
              <button
                className="btn"
                style={{ backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Eliminando...</>
                ) : (
                  <><Trash2 size={14} /> Eliminar Reserva</>
                )}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button
              className="btn btn-secondary"
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              <Save size={14} /> Guardar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSave(true)}
              disabled={saving}
              id="modal-save-reservation"
            >
              {saving ? (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
              ) : (
                <><Save size={14} /> {currentResId ? 'Actualizar y Cerrar' : 'Crear y Cerrar'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
