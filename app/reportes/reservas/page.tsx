'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, subDays, startOfYear, endOfYear, subMonths } from 'date-fns'
import {
  Search, FileSpreadsheet, Printer, Loader2,
  Calendar, Package, Hotel, Users,
  TrendingUp, Clock, Sparkles, Filter
} from 'lucide-react'
import Icon from '@/components/ui/Icon'
import toast from 'react-hot-toast'
import styles from '../financiero/financiero.module.css'
import MultiSelectCheckbox, { MultiSelectOption } from '@/components/ui/MultiSelectCheckbox'

// ── Types ────────────────────────────────────────────────────────
interface ReservationDetail {
  id: number
  guestName: string
  guestPhone: string
  guestEmail: string
  rooms: {
    roomId: string
    code: string
    name: string
    unitTypeName: string
    arrival: string
    departure: string
    nights: number
    unitTotal: number
  }[]
  arrival: string
  departure: string
  nights: number
  adults: number
  children: number
  pax: number
  status: string
  source: string
  createdAt: string
  amenityPacks: number
  total: number
  totalPaid: number
  amountDue: number
  isMultiRoom: boolean
}

interface MonthlyRow {
  key: string
  label: string
  reservationCount: number
  packCount: number
  roomsCount: number
  totalNights: number
  totalPax: number
  totalRevenue: number
  avgNightsPerReservation: number
}

interface UnitTypeRow {
  id: string
  name: string
  reservationCount: number
  packCount: number
  nights: number
  pax: number
  revenue: number
  percentOfTotal: number
}

interface RoomRow {
  id: string
  code: string
  name: string
  unitTypeName: string
  reservationCount: number
  packCount: number
  nights: number
  revenue: number
}

interface ReportData {
  period: {
    startDate: string
    endDate: string
    monthsCount: number
  }
  summary: {
    totalReservations: number
    totalPacks: number
    monthlyAverageReservations: number
    monthlyAveragePacks: number
    totalNights: number
    avgStayNights: number
    totalPax: number
    totalRevenue: number
    totalRoomsCount: number
  }
  monthlyBreakdown: MonthlyRow[]
  unitTypeBreakdown: UnitTypeRow[]
  roomBreakdown: RoomRow[]
  reservations: ReservationDetail[]
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length !== 3) return '—'
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  booked:      { label: 'Reservado',   color: 'var(--info)', bg: 'var(--info-bg)' },
  confirmed:   { label: 'Confirmado',  color: 'var(--success)', bg: 'var(--success-bg)' },
  checked_in:  { label: 'Check-In',    color: 'var(--warning)', bg: 'var(--warning-bg)' },
  checked_out: { label: 'Check-Out',   color: 'var(--neutral)', bg: 'var(--neutral-bg)' },
  blocked:     { label: 'Bloqueado',   color: 'var(--surface-1)', bg: 'var(--neutral)' },
  cancelled:   { label: 'Cancelado',   color: 'var(--danger)', bg: 'var(--danger-bg)' },
  no_show:     { label: 'No Show',     color: 'var(--violet)', bg: 'var(--violet-bg)' },
}

const today = new Date()
const DATE_PRESETS = [
  { label: 'Este mes', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
  { label: 'Mes anterior', start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) },
  { label: 'Últimos 3 meses', start: subMonths(today, 3), end: today },
  { label: 'Últimos 6 meses', start: subMonths(today, 6), end: today },
  { label: 'Este año', start: startOfYear(today), end: endOfYear(today) },
]

export default function ReporteReservasPage() {
  const [preset, setPreset] = useState<string | null>('Este mes')
  const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'))
  const [dateType, setDateType] = useState<'arrival' | 'created'>('arrival')
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('active')

  const [setupRooms, setSetupRooms] = useState<any[]>([])
  const [setupUnitTypes, setSetupUnitTypes] = useState<any[]>([])

  const unitTypeOptions: MultiSelectOption[] = useMemo(() => {
    return setupUnitTypes.map(ut => ({
      id: ut.id,
      label: ut.name,
    }))
  }, [setupUnitTypes])

  const availableRooms = useMemo(() => {
    if (selectedUnitTypes.length === 0 || selectedUnitTypes.length === setupUnitTypes.length) {
      return setupRooms
    }
    return setupRooms.filter(r => selectedUnitTypes.includes(r.unitTypeId))
  }, [setupRooms, selectedUnitTypes, setupUnitTypes])

  const roomOptions: MultiSelectOption[] = useMemo(() => {
    return availableRooms.map(r => ({
      id: r.id,
      label: `${r.name} (${r.code})`,
      sublabel: r.unitType?.name,
    }))
  }, [availableRooms])

  const unitTypeQuickFilters = useMemo(() => [
    {
      label: '🏡 Solo Cabañas',
      filterFn: (opt: MultiSelectOption) =>
        opt.label.toLowerCase().includes('cabaña') || opt.label.toLowerCase().includes('cabana')
    },
    {
      label: '✨ Solo Suites',
      filterFn: (opt: MultiSelectOption) => opt.label.toLowerCase().includes('suite')
    },
    {
      label: '🍢 Quinchos',
      filterFn: (opt: MultiSelectOption) => opt.label.toLowerCase().includes('quincho')
    }
  ], [])

  const [loading, setLoading] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [searched, setSearched] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'monthly' | 'cabins' | 'list'>('general')

  useEffect(() => {
    fetch('/api/setup/rooms').then(r => r.json()).then(res => {
      setSetupRooms(res || [])
      const utMap = new Map()
      res?.forEach((r: any) => {
        if (r.unitType && !utMap.has(r.unitType.id)) utMap.set(r.unitType.id, r.unitType)
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
      const unitTypeParam = (selectedUnitTypes.length === 0 || selectedUnitTypes.length === setupUnitTypes.length)
        ? 'all'
        : selectedUnitTypes.join(',')

      const roomParam = (selectedRooms.length === 0 || selectedRooms.length === availableRooms.length)
        ? 'all'
        : selectedRooms.join(',')

      const params = new URLSearchParams({
        startDate,
        endDate,
        dateType,
        unitTypeIds: unitTypeParam,
        roomIds: roomParam,
        status: statusFilter,
      })
      const res = await fetch(`/api/reportes/reservas?${params}`)
      if (!res.ok) throw new Error('Error al cargar reporte')
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Error al generar reporte de reservas')
    }
    setLoading(false)
  }

  useEffect(() => {
    handleShow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const unitTypeParam = (selectedUnitTypes.length === 0 || selectedUnitTypes.length === setupUnitTypes.length)
        ? 'all'
        : selectedUnitTypes.join(',')

      const roomParam = (selectedRooms.length === 0 || selectedRooms.length === availableRooms.length)
        ? 'all'
        : selectedRooms.join(',')

      const params = new URLSearchParams({
        startDate,
        endDate,
        dateType,
        unitTypeIds: unitTypeParam,
        roomIds: roomParam,
        status: statusFilter,
      })
      const res = await fetch(`/api/reportes/reservas/excel?${params}`)
      if (!res.ok) throw new Error('Error al generar Excel')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_reservas_${startDate}_${endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Excel descargado con éxito')
    } catch {
      toast.error('Error al descargar archivo Excel')
    }
    setExportingExcel(false)
  }

  const filteredReservations = useMemo(() => {
    if (!data?.reservations) return []
    if (!filterQuery.trim()) return data.reservations
    const q = filterQuery.toLowerCase()
    return data.reservations.filter(r =>
      r.id.toString().includes(q) ||
      r.guestName.toLowerCase().includes(q) ||
      r.rooms.some(rm => rm.name.toLowerCase().includes(q) || rm.code.toLowerCase().includes(q) || rm.unitTypeName.toLowerCase().includes(q))
    )
  }, [data?.reservations, filterQuery])

  // Max reservations in any month for progress bar visualization
  const maxMonthReservations = useMemo(() => {
    if (!data?.monthlyBreakdown?.length) return 1
    return Math.max(...data.monthlyBreakdown.map(m => m.reservationCount), 1)
  }, [data?.monthlyBreakdown])

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Reporte de Reservas y Demanda</h1>
          <p className="page-subtitle">
            Análisis de frecuencia de reservas, promedios mensuales para temporadas y cálculo de insumos (1 pack por reserva)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Icon icon={Printer} size="sm" /> Imprimir
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exportingExcel || !data}>
            {exportingExcel ? <Icon icon={Loader2} size="sm" className="spin" /> : <Icon icon={FileSpreadsheet} size="sm" />}
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className={`card ${styles.filtersCard}`} style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div className={styles.filtersGrid}>
            {/* Preset buttons */}
            <div className={styles.filterGroup}>
              <p className="form-label">Período Predefinido</p>
              <div className={styles.presetRow}>
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`btn btn-sm ${preset === p.label ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handlePreset(p, p.label)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom dates */}
            <div className={styles.filterGroup}>
              <p className="form-label">Rango de Fechas</p>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPreset(null) }}
                />
                <span className={styles.dateSep}>→</span>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPreset(null) }}
                />
              </div>
            </div>

            {/* Date filter type */}
            <div className={styles.filterGroup}>
              <p className="form-label">Filtrar Fecha por</p>
              <div className={styles.radioRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dateType"
                    value="arrival"
                    checked={dateType === 'arrival'}
                    onChange={() => setDateType('arrival')}
                  />
                  Fecha de Estadía (Check-in)
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="dateType"
                    value="created"
                    checked={dateType === 'created'}
                    onChange={() => setDateType('created')}
                  />
                  Fecha de Registro
                </label>
              </div>
            </div>

            {/* Unit type */}
            <div className={styles.filterGroup} style={{ minWidth: 230 }}>
              <p className="form-label">Grupo de Cabañas</p>
              <MultiSelectCheckbox
                options={unitTypeOptions}
                selectedIds={selectedUnitTypes}
                onChange={(ids) => {
                  setSelectedUnitTypes(ids)
                  setSelectedRooms([])
                }}
                labelAll="Todos los grupos"
                placeholder="Todos los grupos"
                quickFilters={unitTypeQuickFilters}
              />
            </div>

            {/* Room */}
            <div className={styles.filterGroup} style={{ minWidth: 230 }}>
              <p className="form-label">Cabaña Específica</p>
              <MultiSelectCheckbox
                options={roomOptions}
                selectedIds={selectedRooms}
                onChange={(ids) => setSelectedRooms(ids)}
                labelAll="Todas las cabañas"
                placeholder="Todas las cabañas"
              />
            </div>

            {/* Status */}
            <div className={styles.filterGroup}>
              <p className="form-label">Estado</p>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">Activas (Confirmadas / En Curso / Finalizadas)</option>
                <option value="all">Todas (incluyendo canceladas)</option>
                <option value="confirmed">Solo Confirmadas</option>
                <option value="checked_in">Solo En Estadía (Check-In)</option>
                <option value="checked_out">Solo Finalizadas (Check-Out)</option>
                <option value="cancelled">Solo Canceladas</option>
              </select>
            </div>

            {/* Submit */}
            <div className={styles.filterGroup} style={{ marginLeft: 'auto' }}>
              <button
                className="btn btn-primary"
                onClick={handleShow}
                disabled={loading}
                style={{ minWidth: 120 }}
              >
                {loading ? (
                  <><Icon icon={Loader2} size="sm" className="spin" /> Cargando...</>
                ) : (
                  'Generar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {searched && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Key Metric Cards */}
          <div className={styles.kpiRow} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className={`card ${styles.kpiCard}`}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div className={styles.kpiIcon} style={{ background: '#3b82f618', color: '#3b82f6' }}>
                  <Icon icon={Calendar} size="xl" />
                </div>
                <div>
                  <p className={styles.kpiLabel}>Total Reservas</p>
                  <p className={styles.kpiValue} style={{ fontSize: '1.4rem' }}>{data.summary.totalReservations}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    En el período seleccionado
                  </p>
                </div>
              </div>
            </div>

            <div className={`card ${styles.kpiCard}`}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div className={styles.kpiIcon} style={{ background: '#10b98118', color: '#10b981' }}>
                  <Icon icon={TrendingUp} size="xl" />
                </div>
                <div>
                  <p className={styles.kpiLabel}>Promedio Mensual</p>
                  <p className={styles.kpiValue} style={{ fontSize: '1.4rem', color: '#047857' }}>
                    {data.summary.monthlyAverageReservations} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>rsv/mes</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Base: {data.period.monthsCount} {data.period.monthsCount === 1 ? 'mes' : 'meses'} analizados
                  </p>
                </div>
              </div>
            </div>

            <div className={`card ${styles.kpiCard}`} style={{ border: '2px solid #86efac' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div className={styles.kpiIcon} style={{ background: '#10b98125', color: '#059669' }}>
                  <Icon icon={Package} size="xl" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p className={styles.kpiLabel} style={{ color: '#065f46', fontWeight: 700 }}>Insumos / Amenities</p>
                    <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                      1 pack/rsv
                    </span>
                  </div>
                  <p className={styles.kpiValue} style={{ fontSize: '1.4rem', color: '#065f46' }}>
                    {data.summary.totalPacks} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>packs</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Promedio: {data.summary.monthlyAveragePacks} packs/mes
                  </p>
                </div>
              </div>
            </div>

            <div className={`card ${styles.kpiCard}`}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div className={styles.kpiIcon} style={{ background: '#8b5cf618', color: '#8b5cf6' }}>
                  <Icon icon={Hotel} size="xl" />
                </div>
                <div>
                  <p className={styles.kpiLabel}>Noches Totales & ALOS</p>
                  <p className={styles.kpiValue} style={{ fontSize: '1.4rem' }}>
                    {data.summary.totalNights} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>noches</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Promedio: {data.summary.avgStayNights} noches/estadía
                  </p>
                </div>
              </div>
            </div>

            <div className={`card ${styles.kpiCard}`}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
                <div className={styles.kpiIcon} style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                  <Icon icon={Users} size="xl" />
                </div>
                <div>
                  <p className={styles.kpiLabel}>Total Pasajeros (PAX)</p>
                  <p className={styles.kpiValue} style={{ fontSize: '1.4rem' }}>{data.summary.totalPax}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Adultos y niños hospedados
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
            <button
              className={`btn btn-sm ${activeTab === 'general' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('general')}
            >
              📊 Resumen Completo
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('monthly')}
            >
              📅 Análisis Mensual y Temporadas ({data.monthlyBreakdown.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'cabins' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('cabins')}
            >
              🏡 Por Cabaña y Tipo ({data.roomBreakdown.length})
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('list')}
            >
              📋 Listado Detallado ({data.reservations.length})
            </button>
          </div>

          {/* Tab 1: General Summary (Shows Monthly + Cabin tables together) */}
          {(activeTab === 'general' || activeTab === 'monthly') && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Evolución Mensual y Cálculo de Temporadas
                  </span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Permite identificar meses pico (temporada alta) vs meses valle para proyección de personal e insumos
                  </p>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Mes / Año</th>
                      <th style={{ textAlign: 'right' }}>Cantidad de Reservas</th>
                      <th style={{ textAlign: 'center' }}>Demanda Relativa</th>
                      <th style={{ textAlign: 'right' }}>Packs Amenities (1/rsv)</th>
                      <th style={{ textAlign: 'right' }}>Noches Totales</th>
                      <th style={{ textAlign: 'right' }}>Huéspedes (PAX)</th>
                      <th style={{ textAlign: 'right' }}>Prom. Noches/Rsv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyBreakdown.map((m) => {
                      const pct = Math.round((m.reservationCount / maxMonthReservations) * 100)
                      return (
                        <tr key={m.key}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.label}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: 'var(--brand-600, #0284c7)' }}>
                            {m.reservationCount}
                          </td>
                          <td style={{ minWidth: 150 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: pct > 75 ? 'var(--success)' : pct > 40 ? 'var(--brand-500)' : 'var(--warning)',
                                    borderRadius: 4,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 32 }}>{pct}%</span>
                            </div>
                          </td>
                          <td className={styles.moneyCell} style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                            {m.packCount}
                          </td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{m.totalNights}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{m.totalPax}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{m.avgNightsPerReservation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalsRow}>
                      <td className={styles.totalsLabel}>TOTALES DEL PERÍODO</td>
                      <td className={styles.numCell} style={{ textAlign: 'right', fontSize: '1.05rem', fontWeight: 800 }}>
                        {data.summary.totalReservations}
                      </td>
                      <td />
                      <td className={styles.moneyCell} style={{ textAlign: 'right', fontSize: '1.05rem', fontWeight: 800, color: '#047857' }}>
                        {data.summary.totalPacks} packs
                      </td>
                      <td className={styles.numCell} style={{ textAlign: 'right', fontWeight: 700 }}>{data.summary.totalNights}</td>
                      <td className={styles.numCell} style={{ textAlign: 'right', fontWeight: 700 }}>{data.summary.totalPax}</td>
                      <td className={styles.numCell} style={{ textAlign: 'right', fontWeight: 700 }}>{data.summary.avgStayNights}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Breakdown by Cabin and Unit Type */}
          {(activeTab === 'general' || activeTab === 'cabins') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Unit Type Table */}
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700 }}>Por Grupo / Tipo de Unidad</span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.reportTable} style={{ minWidth: 'auto' }}>
                    <thead>
                      <tr>
                        <th>Tipo de Unidad</th>
                        <th style={{ textAlign: 'right' }}>Reservas</th>
                        <th style={{ textAlign: 'right' }}>% Total</th>
                        <th style={{ textAlign: 'right' }}>Packs Insumos</th>
                        <th style={{ textAlign: 'right' }}>Noches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.unitTypeBreakdown.map((ut) => (
                        <tr key={ut.id}>
                          <td style={{ fontWeight: 600 }}>{ut.name}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right', fontWeight: 700 }}>{ut.reservationCount}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{ut.percentOfTotal}%</td>
                          <td className={styles.moneyCell} style={{ textAlign: 'right', color: '#047857', fontWeight: 600 }}>{ut.packCount}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{ut.nights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Room Breakdown Table */}
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700 }}>Por Cabaña Específica</span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.reportTable} style={{ minWidth: 'auto' }}>
                    <thead>
                      <tr>
                        <th>Cabaña</th>
                        <th>Grupo</th>
                        <th style={{ textAlign: 'right' }}>Reservas</th>
                        <th style={{ textAlign: 'right' }}>Packs Insumos</th>
                        <th style={{ textAlign: 'right' }}>Noches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.roomBreakdown.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>
                            {r.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({r.code})</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.unitTypeName}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right', fontWeight: 700 }}>{r.reservationCount}</td>
                          <td className={styles.moneyCell} style={{ textAlign: 'right', color: '#047857', fontWeight: 600 }}>{r.packCount}</td>
                          <td className={styles.numCell} style={{ textAlign: 'right' }}>{r.nights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Detailed Reservations List */}
          {(activeTab === 'general' || activeTab === 'list') && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Listado de Reservas Realizadas</span>
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ({filteredReservations.length} de {data.reservations.length} reservas)
                  </span>
                </div>
                <div style={{ position: 'relative', width: 280 }}>
                  <Icon
                    icon={Search}
                    size="sm"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    className="input"
                    style={{ paddingLeft: 34, height: 36, fontSize: '0.85rem' }}
                    placeholder="Buscar por #, huésped o cabaña..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Rsv #</th>
                      <th>Huésped</th>
                      <th>Cabaña(s)</th>
                      <th>Llegada</th>
                      <th>Salida</th>
                      <th style={{ textAlign: 'center' }}>Noches</th>
                      <th style={{ textAlign: 'center' }}>PAX</th>
                      <th style={{ textAlign: 'center' }}>Packs Insumos</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                      <th>Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((r) => {
                      const st = STATUS_CONFIG[r.status]
                      return (
                        <tr key={r.id}>
                          <td className={styles.rsvNum}>
                            #{r.id}
                            {r.isMultiRoom && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginLeft: 6,
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: 'var(--primary-light, #e0f2fe)',
                                  color: 'var(--primary-dark, #0369a1)',
                                  fontWeight: 600,
                                }}
                              >
                                Grupo ({r.rooms.length})
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.guestName}</div>
                            {r.guestPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.guestPhone}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {r.rooms.map((rm) => (
                                <span
                                  key={rm.roomId}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {rm.name || rm.code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className={styles.dateCell}>{fmtDate(r.arrival)}</td>
                          <td className={styles.dateCell}>{fmtDate(r.departure)}</td>
                          <td className={styles.numCell}>{r.nights}</td>
                          <td className={styles.numCell}>
                            {r.pax} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({r.adults}A + {r.children}N)</span>
                          </td>
                          <td className={styles.numCell} style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#dcfce7',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}>
                              1 pack
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {st && (
                              <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.source}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
