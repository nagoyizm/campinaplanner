'use client'

import { useState, useMemo } from 'react'
import { format, subDays, addDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search, FileSpreadsheet, Printer, Loader2,
  TrendingUp, DollarSign, CheckCircle, AlertCircle,
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
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filter, setFilter] = useState('')

  const handlePreset = (p: typeof DATE_PRESETS[0], label: string) => {
    setPreset(label)
    setStartDate(format(p.start, 'yyyy-MM-dd'))
    setEndDate(format(p.end, 'yyyy-MM-dd'))
  }

  const handleShow = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ startDate, endDate, queryBy })
      const res = await fetch(`/api/reportes/financiero?${params}`)
      if (!res.ok) throw new Error('Error cargando reporte')
      setRows(await res.json())
    } catch {
      toast.error('Error al cargar el reporte')
    }
    setLoading(false)
  }

  const handleExcelExport = () => {
    const params = new URLSearchParams({ startDate, endDate, queryBy })
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
              <div className={styles.presetRow}>
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className={`btn btn-sm ${preset === p.label ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handlePreset(p, p.label)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  className={`btn btn-sm ${preset === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPreset('custom')}
                >
                  Personalizado
                </button>
              </div>
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
              <div className={styles.radioRow}>
                {[
                  { value: 'arrival',   label: 'Fecha Llegada' },
                  { value: 'departure', label: 'Fecha Salida' },
                  { value: 'both',      label: 'Ambas' },
                ].map(o => (
                  <label key={o.value} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="queryBy"
                      value={o.value}
                      checked={queryBy === o.value}
                      onChange={() => setQueryBy(o.value as any)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Show button */}
            <div className={styles.filterGroup} style={{ justifyContent: 'flex-end', alignItems: 'flex-end', display: 'flex' }}>
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
