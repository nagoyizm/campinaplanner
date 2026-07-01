'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { Loader2, TrendingUp, DollarSign, BedDouble, Hotel } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from '../financiero/financiero.module.css'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const today = new Date()
const DATE_PRESETS = [
  { label: 'Este mes', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
  { label: 'Mes anterior', start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) },
  { label: 'Últimos 30 días', start: subDays(today, 30), end: today },
  { label: 'Este año', start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) },
]

export default function ReporteHabitacionesPage() {
  const [preset, setPreset] = useState<string | null>('Este mes')
  const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'))
  const [selectedUnitType, setSelectedUnitType] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState('all')
  
  const [setupRooms, setSetupRooms] = useState<any[]>([])
  const [setupUnitTypes, setSetupUnitTypes] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [data, setData] = useState<any>(null)

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
      const params = new URLSearchParams({ startDate, endDate, unitTypeId: selectedUnitType, roomId: selectedRoom })
      const res = await fetch(`/api/reportes/habitaciones?${params}`)
      if (!res.ok) throw new Error('Error')
      setData(await res.json())
    } catch {
      toast.error('Error al cargar el reporte de habitaciones')
    }
    setLoading(false)
  }

  useEffect(() => {
    handleShow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rendimiento de Habitaciones</h1>
          <p className="page-subtitle">Ocupación, RevPAR y ventas por unidad</p>
        </div>
      </div>

      <div className={`card ${styles.filtersCard}`}>
        <div className="card-body">
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <p className="form-label">Período</p>
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

            <div className={styles.filterGroup}>
              <p className="form-label">Rango de fechas</p>
              <div className={styles.dateRange}>
                <input type="date" className="input" value={startDate} onChange={e => { setStartDate(e.target.value); setPreset('custom') }} />
                <span className={styles.dateSep}>→</span>
                <input type="date" className="input" value={endDate} onChange={e => { setEndDate(e.target.value); setPreset('custom') }} />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <p className="form-label">Grupo de Habitaciones</p>
              <select className="input" value={selectedUnitType} onChange={e => { setSelectedUnitType(e.target.value); setSelectedRoom('all'); }}>
                <option value="all">Todos los grupos</option>
                {setupUnitTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name}</option>)}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <p className="form-label">Habitación Específica</p>
              <select className="input" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} disabled={selectedUnitType !== 'all'}>
                <option value="all">Todas</option>
                {setupRooms.filter(r => selectedUnitType === 'all' || r.unitTypeId === selectedUnitType).map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup} style={{ marginLeft: 'auto', justifyContent: 'flex-end', alignItems: 'flex-end', display: 'flex' }}>
              <button className="btn btn-primary" onClick={handleShow} disabled={loading} style={{ minWidth: 120 }}>
                {loading ? <><Loader2 size={15} className="spin" /> Cargando...</> : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {searched && data && (
        <>
          <div className={styles.kpiRow}>
            {[
              { label: 'Ocupación Global', value: `${data.summary.globalOccupancy.toFixed(1)}%`, icon: TrendingUp, color: '#3b82f6' },
              { label: 'RevPAR Promedio', value: formatCLP(data.summary.globalRevPar), icon: DollarSign, color: '#10b981' },
              { label: 'Noches Vendidas', value: String(data.summary.totalNightsSold), icon: BedDouble, color: '#8b5cf6' },
              { label: 'Total Unidades', value: String(data.summary.totalRooms), icon: Hotel, color: '#f59e0b' },
            ].map(kpi => (
              <div key={kpi.label} className={`card ${styles.kpiCard}`}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                  <div className={styles.kpiIcon} style={{ background: kpi.color + '18', color: kpi.color }}><kpi.icon size={20} /></div>
                  <div><p className={styles.kpiLabel}>{kpi.label}</p><p className={styles.kpiValue}>{kpi.value}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">Desglose por Cabaña</div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cabaña</th>
                    <th>Grupo</th>
                    <th>Días Período</th>
                    <th>Noches Vendidas</th>
                    <th>Ocupación (%)</th>
                    <th>Ingresos (Room Total)</th>
                    <th>RevPAR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.metrics.map((m: any) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({m.code})</span></td>
                      <td>{m.unitType}</td>
                      <td>{m.totalDays}</td>
                      <td>{m.nightsSold}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${m.occupancyRate}%`, background: m.occupancyRate > 70 ? '#10b981' : m.occupancyRate > 40 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{m.occupancyRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>{formatCLP(m.totalRevenue)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCLP(m.revPar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
