'use client'

import { useState, useEffect } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { Loader2, CalendarClock, PlaneTakeoff, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from '../financiero/financiero.module.css'

const today = new Date()
const DATE_PRESETS = [
  { label: 'Este año', start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) },
  { label: 'Últimos 6 meses', start: subDays(today, 180), end: today },
  { label: 'Año anterior', start: new Date(today.getFullYear() - 1, 0, 1), end: new Date(today.getFullYear() - 1, 11, 31) },
]

export default function ReporteFechasPage() {
  const [preset, setPreset] = useState<string | null>('Este año')
  const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd'))
  
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [data, setData] = useState<any>(null)

  const handlePreset = (p: typeof DATE_PRESETS[0], label: string) => {
    setPreset(label)
    setStartDate(format(p.start, 'yyyy-MM-dd'))
    setEndDate(format(p.end, 'yyyy-MM-dd'))
  }

  const handleShow = async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const res = await fetch(`/api/reportes/fechas?${params}`)
      if (!res.ok) throw new Error('Error')
      setData(await res.json())
    } catch {
      toast.error('Error al cargar el reporte de tendencias temporales')
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
          <h1 className="page-title">Tendencias Temporales</h1>
          <p className="page-subtitle">Comportamiento estacional y anticipación de reservas</p>
        </div>
      </div>

      <div className={`card ${styles.filtersCard}`}>
        <div className="card-body">
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <p className="form-label">Período Anual</p>
              <div className={styles.presetRow}>
                {DATE_PRESETS.map((p) => (
                  <button key={p.label} className={`btn btn-sm ${preset === p.label ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handlePreset(p, p.label)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <p className="form-label">Rango de fechas</p>
              <div className={styles.dateRange}>
                <input type="date" className="input" value={startDate} onChange={e => { setStartDate(e.target.value); setPreset('custom') }} />
                <span className={styles.dateSep}>→</span>
                <input type="date" className="input" value={endDate} onChange={e => { setEndDate(e.target.value); setPreset('custom') }} />
              </div>
            </div>

            <div className={styles.filterGroup} style={{ justifyContent: 'flex-end', alignItems: 'flex-end', display: 'flex' }}>
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
              { label: 'Promedio Lead Time', value: `${data.summary.avgLeadTime} días`, icon: CalendarClock, color: '#3b82f6' },
              { label: 'Check-ins Totales', value: String(data.summary.totalArrivals), icon: PlaneTakeoff, color: '#10b981' },
            ].map(kpi => (
              <div key={kpi.label} className={`card ${styles.kpiCard}`}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                  <div className={styles.kpiIcon} style={{ background: kpi.color + '18', color: kpi.color }}><kpi.icon size={20} /></div>
                  <div><p className={styles.kpiLabel}>{kpi.label}</p><p className={styles.kpiValue}>{kpi.value}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 24 }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={18} color="#0ea5e9" /> Llegadas por Día de la Semana
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Check-ins</th>
                      <th>Porcentaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.checkinsByDay.map((d: any) => (
                      <tr key={d.day}>
                        <td style={{ fontWeight: 600 }}>{d.day}</td>
                        <td>{d.count}</td>
                        <td>{data.summary.totalArrivals > 0 ? ((d.count / data.summary.totalArrivals) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={18} color="#d97706" /> Llegadas por Mes
              </div>
              <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Llegadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.checkinsByMonth.map((m: any) => (
                      <tr key={m.month}>
                        <td style={{ fontWeight: 600 }}>{m.month}</td>
                        <td style={{ color: 'var(--brand-600)', fontWeight: 600 }}>{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
