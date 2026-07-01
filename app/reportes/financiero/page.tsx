'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search, FileSpreadsheet, Printer, Loader2,
  TrendingUp, DollarSign, CheckCircle, AlertCircle,
  Calendar, Star, Award, TrendingDown,
  Users, Ban, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './financiero.module.css'
import FinancialCharts from '@/components/reportes/FinancialCharts'

// ── Types ────────────────────────────────────────────────────────
interface ReportRow {
  reservationId: number
  guestFirstName: string
  guestLastName: string
  roomCode: string
  roomName: string
  unitType: string
  rateName: string
  arrival: string
  departure: string
  nights: number
  unitTotal: number
  discounts: number
  additionalServices: number
  tax: number
  total: number
  totalPaid: number
  amountDue: number
  status: string
  paymentMethod: string
  isRecurring: boolean
}

// ── Helpers ───────────────────────────────────────────────────────
const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length !== 3) return '—'
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  booked:      { label: 'Reservado',   color: '#1d4ed8', bg: '#dbeafe' },
  confirmed:   { label: 'Confirmado',  color: '#065f46', bg: '#d1fae5' },
  checked_in:  { label: 'Check-In',    color: '#92400e', bg: '#fef3c7' },
  checked_out: { label: 'Check-Out',   color: '#374151', bg: '#f3f4f6' },
  blocked:     { label: 'Bloqueado',   color: '#f9fafb', bg: '#1f2937' },
  cancelled:   { label: 'Cancelado',   color: '#991b1b', bg: '#fee2e2' },
  no_show:     { label: 'No Show',     color: '#5b21b6', bg: '#ede9fe' },
}

// ── Date presets ──────────────────────────────────────────────────
const today = new Date()
const DATE_PRESETS = [
  { label: 'Ayer',    start: subDays(today, 1), end: subDays(today, 1) },
  { label: 'Hoy',     start: today,              end: today             },
  { label: 'Mañana',  start: addDays(today, 1), end: addDays(today, 1) },
  { label: 'Este mes', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
]

// ── Main Component ────────────────────────────────────────────────
export default function ReporteFinancieroPage() {
  const [preset, setPreset] = useState<string | null>('Este mes')
  const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'))
  const [queryBy, setQueryBy] = useState<'arrival' | 'departure' | 'both'>('arrival')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [totalRooms, setTotalRooms] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filter, setFilter] = useState('')

  const [setupRooms, setSetupRooms] = useState<any[]>([])
  const [setupUnitTypes, setSetupUnitTypes] = useState<any[]>([])
  const [selectedUnitType, setSelectedUnitType] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState('all')

  useEffect(() => {
    fetch('/api/setup/rooms').then(r => r.json()).then(data => {
      setSetupRooms(data || [])
      const utMap = new Map()
      data?.forEach((r: any) => {
        if (r.unitType && !utMap.has(r.unitType.id)) {
          utMap.set(r.unitType.id, r.unitType)
        }
      })
      setSetupUnitTypes(Array.from(utMap.values()))
    }).catch(console.error)
  }, [])

  const handlePreset = (p: typeof DATE_PRESETS[0], label: string) => {
    setPreset(label)
    setStartDate(format(p.start, 'yyyy-MM-dd'))
    setEndDate(format(p.end, 'yyyy-MM-dd'))
  }

  const handleShow = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ 
        startDate, endDate, queryBy, 
        unitTypeId: selectedUnitType, 
        roomId: selectedRoom 
      })
      const res = await fetch(`/api/reportes/financiero?${params}`)
      if (!res.ok) throw new Error('Error cargando reporte')
      const data = await res.json()
      setRows(data.rows)
      setTotalRooms(data.totalActiveRooms)
    } catch {
      toast.error('Error al cargar el reporte')
    }
    setLoading(false)
  }

  useEffect(() => {
    handleShow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExcelExport = () => {
    const params = new URLSearchParams({ 
        startDate, endDate, queryBy, 
        unitTypeId: selectedUnitType, 
        roomId: selectedRoom 
      })
    window.open(`/api/reportes/financiero/excel?${params}`, '_blank')
  }

  const handlePrint = () => window.print()

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!filter) return rows
    const q = filter.toLowerCase()
    return rows.filter(r =>
      r.guestFirstName.toLowerCase().includes(q) ||
      r.guestLastName.toLowerCase().includes(q) ||
      r.roomName.toLowerCase().includes(q) ||
      String(r.reservationId).includes(q)
    )
  }, [rows, filter])

  // Totals
  const totals = useMemo(() => filteredRows.reduce(
    (acc, r) => ({
      unitTotal: acc.unitTotal + r.unitTotal,
      discounts: acc.discounts + r.discounts,
      additionalServices: acc.additionalServices + r.additionalServices,
      tax: acc.tax + r.tax,
      total: acc.total + r.total,
      totalPaid: acc.totalPaid + r.totalPaid,
      amountDue: acc.amountDue + r.amountDue,
    }),
    { unitTotal: 0, discounts: 0, additionalServices: 0, tax: 0, total: 0, totalPaid: 0, amountDue: 0 }
  ), [filteredRows])

  // Analytical Insights
  const insights = useMemo(() => {
    if (filteredRows.length === 0) return null

    // 1. Occupancy ranking
    const roomOccupancy: Record<string, number> = {}
    filteredRows.forEach(r => {
      roomOccupancy[r.roomName] = (roomOccupancy[r.roomName] || 0) + r.nights
    })
    const ranking = Object.entries(roomOccupancy).sort((a, b) => b[1] - a[1])

    // 2. Revenue by Day (based on arrival)
    const revenueByDay: Record<string, number> = {}
    filteredRows.forEach(r => {
      const date = r.arrival.split('T')[0]
      revenueByDay[date] = (revenueByDay[date] || 0) + r.total
    })
    
    let bestDay = { date: '', amount: -1 }
    let weakestDay = { date: '', amount: Infinity }
    
    Object.entries(revenueByDay).forEach(([date, amount]) => {
      if (amount > bestDay.amount) bestDay = { date, amount }
      if (amount < weakestDay.amount) weakestDay = { date, amount }
    })
    if (weakestDay.amount === Infinity) weakestDay.amount = 0

    // 3. Revenue by Week
    const getWeekKey = (dateStr: string) => {
      const d = new Date(dateStr)
      // basic calculation for week of the month
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
      const dayOfMonth = d.getDate()
      const weekNum = Math.ceil((dayOfMonth + startOfMonth.getDay() - 1) / 7)
      return `Sem. ${weekNum > 0 ? weekNum : 1} de ${format(d, 'MMMM', {locale: es})}`
    }

    const revenueByWeek: Record<string, number> = {}
    filteredRows.forEach(r => {
      const week = getWeekKey(r.arrival)
      revenueByWeek[week] = (revenueByWeek[week] || 0) + r.total
    })

    let bestWeek = { week: '', amount: -1 }
    Object.entries(revenueByWeek).forEach(([week, amount]) => {
      if (amount > bestWeek.amount) bestWeek = { week, amount }
    })

    // 4. Occupancy Percentage & RevPAR
    let occupancyPercent = 0
    let revPar = 0
    let alos = 0
    let cancellations = 0
    let recurringCustomersCount = 0

    const uniqueReservations = new Set(filteredRows.map(r => r.reservationId)).size
    cancellations = filteredRows.filter(r => r.status === 'cancelled').length
    
    const recurringSet = new Set(filteredRows.filter(r => r.isRecurring).map(r => `${r.guestFirstName} ${r.guestLastName}`))
    recurringCustomersCount = recurringSet.size

    const totalNightsSold = filteredRows.filter(r => r.status !== 'cancelled').reduce((acc, r) => acc + r.nights, 0)
    
    if (uniqueReservations > 0) {
      alos = Math.round((totalNightsSold / uniqueReservations) * 10) / 10
    }

    if (totalRooms > 0) {
      const startD = new Date(startDate)
      const endD = new Date(endDate)
      const daysInRange = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      
      const totalAvailableNights = totalRooms * daysInRange
      occupancyPercent = Math.round((totalNightsSold / totalAvailableNights) * 100)
      revPar = Math.round(filteredRows.reduce((acc, r) => acc + (r.status !== 'cancelled' ? r.total : 0), 0) / totalAvailableNights)
    }

    return { bestDay, weakestDay, bestWeek, ranking, occupancyPercent, revPar, alos, cancellations, recurringCustomersCount }
  }, [filteredRows, startDate, endDate, totalRooms])

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporte Financiero</h1>
          <p className="page-subtitle">Análisis de ingresos por período</p>
        </div>
        {searched && rows.length > 0 && (
          <div className={styles.actions}>
            <button className="btn btn-secondary btn-sm" onClick={handleExcelExport} id="export-excel">
              <FileSpreadsheet size={15} /> Exportar Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} id="export-print">
              <Printer size={15} /> Imprimir
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className={`card ${styles.filtersCard}`}>
        <div className="card-body">
          <div className={styles.filtersGrid}>
            {/* Date presets */}
            <div className={styles.filterGroup}>
              <p className="form-label">Fecha</p>
              <select
                className="input"
                value={preset || 'custom'}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'custom') {
                    setPreset('custom')
                  } else {
                    const p = DATE_PRESETS.find(x => x.label === val)
                    if (p) handlePreset(p, p.label)
                  }
                }}
              >
                {DATE_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Room Filters */}
            <div className={styles.filterGroup}>
              <p className="form-label">Grupo de Habitaciones</p>
              <select 
                className="input" 
                value={selectedUnitType} 
                onChange={e => { setSelectedUnitType(e.target.value); setSelectedRoom('all'); }}
              >
                <option value="all">Todos los grupos</option>
                {setupUnitTypes.map(ut => (
                  <option key={ut.id} value={ut.id}>{ut.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <p className="form-label">Habitación Específica</p>
              <select 
                className="input" 
                value={selectedRoom} 
                onChange={e => setSelectedRoom(e.target.value)}
                disabled={selectedUnitType !== 'all'}
              >
                <option value="all">Todas</option>
                {setupRooms
                  .filter(r => selectedUnitType === 'all' || r.unitTypeId === selectedUnitType)
                  .map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                  ))}
              </select>
            </div>

            {/* Date range */}
            <div className={styles.filterGroup}>
              <p className="form-label">Rango de fechas</p>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setPreset('custom') }}
                />
                <span className={styles.dateSep}>→</span>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setPreset('custom') }}
                />
              </div>
            </div>

            {/* Query by */}
            <div className={styles.filterGroup}>
              <p className="form-label">Consultar por</p>
              <select
                className="input"
                value={queryBy}
                onChange={(e) => setQueryBy(e.target.value as any)}
              >
                <option value="arrival">Fecha Llegada</option>
                <option value="departure">Fecha Salida</option>
                <option value="both">Ambas</option>
              </select>
            </div>

            {/* Show button */}
            <div className={styles.filterGroup} style={{ marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'flex-end', display: 'flex' }}>
              <button
                className="btn btn-primary"
                onClick={handleShow}
                disabled={loading}
                id="report-show"
                style={{ minWidth: 120 }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...</>
                  : 'Mostrar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <>
          {/* KPI Summary */}
          {rows.length > 0 && (
            <div className={styles.kpiRow}>
              {[
                { label: 'Registros',      value: String(filteredRows.length),   icon: TrendingUp,   color: '#3b82f6' },
                { label: 'Total Facturado', value: formatCLP(totals.total),       icon: DollarSign,   color: '#10b981' },
                { label: 'Total Pagado',   value: formatCLP(totals.totalPaid),   icon: CheckCircle,  color: '#059669' },
                { label: 'Adeudado',       value: formatCLP(totals.amountDue),   icon: AlertCircle,  color: totals.amountDue > 0 ? '#ef4444' : '#10b981' },
              ].map(kpi => (
                <div key={kpi.label} className={`card ${styles.kpiCard}`}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                    <div className={styles.kpiIcon} style={{ background: kpi.color + '18', color: kpi.color }}>
                      <kpi.icon size={20} />
                    </div>
                    <div>
                      <p className={styles.kpiLabel}>{kpi.label}</p>
                      <p className={styles.kpiValue}>{kpi.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analytical Insights Row */}
          {insights && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Award size={16} color="#d97706" />
                  <p style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Mejor Semana</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{formatCLP(insights.bestWeek.amount)}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>{insights.bestWeek.week}</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Star size={16} color="#059669" />
                  <p style={{ color: '#047857', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Mejor Día</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{formatCLP(insights.bestDay.amount)}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{fmtDate(insights.bestDay.date)}</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingDown size={16} color="#dc2626" />
                  <p style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Día Más Débil</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{formatCLP(insights.weakestDay.amount)}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{insights.weakestDay.date ? fmtDate(insights.weakestDay.date) : '—'}</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #c7d2fe', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TrendingUp size={16} color="#4f46e5" />
                  <p style={{ color: '#4338ca', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Ocupación / RevPAR</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{insights.occupancyPercent}%</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{formatCLP(insights.revPar)} RevPAR</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #fbcfe8', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={16} color="#db2777" />
                  <p style={{ color: '#be185d', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Promedio Estancia</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{insights.alos} Noches</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Por reserva (ALOS)</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Users size={16} color="#4b5563" />
                  <p style={{ color: '#374151', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Recurrentes</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{insights.recurringCustomersCount}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Huéspedes Fieles</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Ban size={16} color="#dc2626" />
                  <p style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Cancelaciones</p>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-base)', margin: '0 0 4px 0' }}>{insights.cancellations}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Reservas Caídas</p>
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={16} color="#4b5563" />
                  <p style={{ color: '#374151', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Top Habitaciones</p>
                </div>
                {insights.ranking.slice(0, 2).map(([room, nights], idx) => (
                  <div key={room} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-base)' }}>#{idx + 1} {room}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{nights} Noches</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashboards & Charts */}
          {rows.length > 0 && (
            <FinancialCharts rows={filteredRows} startDate={startDate} endDate={endDate} />
          )}

          {/* Filter + Table */}
          {rows.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <span className={styles.resultCount}>
                  {filteredRows.length} de {rows.length} registros
                </span>
                <div style={{ position: 'relative', width: 240 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 32 }}
                    placeholder="Filtrar resultados..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Rsv #</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Hab.</th>
                      <th>Llegada</th>
                      <th>Salida</th>
                      <th>N</th>
                      <th>Total Hab.</th>
                      <th>Desctos.</th>
                      <th>Serv. Adic.</th>
                      <th>Impuesto</th>
                      <th>Total</th>
                      <th>Pagado</th>
                      <th>Adeudado</th>
                      <th>Estado</th>
                      <th>Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => {
                      const st = STATUS_CONFIG[r.status]
                      return (
                        <tr key={`${r.reservationId}-${i}`}>
                          <td className={styles.rsvNum}>#{r.reservationId}</td>
                          <td>{r.guestFirstName}</td>
                          <td>{r.guestLastName}</td>
                          <td>
                            <span className={styles.roomTag}>{r.roomCode}</span>
                            <span className={styles.roomNameSmall}>{r.roomName}</span>
                          </td>
                          <td className={styles.dateCell}>{fmtDate(r.arrival)}</td>
                          <td className={styles.dateCell}>{fmtDate(r.departure)}</td>
                          <td className={styles.numCell}>{r.nights}</td>
                          <td className={styles.moneyCell}>{formatCLP(r.unitTotal)}</td>
                          <td className={`${styles.moneyCell} ${styles.discount}`}>{r.discounts > 0 ? `-${formatCLP(r.discounts)}` : '—'}</td>
                          <td className={styles.moneyCell}>{r.additionalServices > 0 ? formatCLP(r.additionalServices) : '—'}</td>
                          <td className={styles.moneyCell}>{r.tax > 0 ? formatCLP(r.tax) : '—'}</td>
                          <td className={`${styles.moneyCell} ${styles.totalCell}`}>{formatCLP(r.total)}</td>
                          <td className={`${styles.moneyCell} ${styles.paidCell}`}>{formatCLP(r.totalPaid)}</td>
                          <td className={`${styles.moneyCell} ${r.amountDue > 0 ? styles.dueCell : styles.zeroDue}`}>
                            {formatCLP(r.amountDue)}
                          </td>
                          <td>
                            {st && (
                              <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            )}
                          </td>
                          <td className={styles.payMethod}>{r.paymentMethod}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className={styles.totalsRow}>
                      <td colSpan={7} className={styles.totalsLabel}>TOTALES</td>
                      <td className={styles.moneyCell}>{formatCLP(totals.unitTotal)}</td>
                      <td className={`${styles.moneyCell} ${styles.discount}`}>{totals.discounts > 0 ? `-${formatCLP(totals.discounts)}` : '—'}</td>
                      <td className={styles.moneyCell}>{totals.additionalServices > 0 ? formatCLP(totals.additionalServices) : '—'}</td>
                      <td className={styles.moneyCell}>{totals.tax > 0 ? formatCLP(totals.tax) : '—'}</td>
                      <td className={`${styles.moneyCell} ${styles.totalCell}`}>{formatCLP(totals.total)}</td>
                      <td className={`${styles.moneyCell} ${styles.paidCell}`}>{formatCLP(totals.totalPaid)}</td>
                      <td className={`${styles.moneyCell} ${totals.amountDue > 0 ? styles.dueCell : styles.zeroDue}`}>{formatCLP(totals.amountDue)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : !loading && (
            <div className={styles.emptyState}>
              <Search size={36} style={{ color: 'var(--text-muted)' }} />
              <p>No se encontraron registros para el período seleccionado.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
