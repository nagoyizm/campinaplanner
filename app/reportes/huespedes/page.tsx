'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { Loader2, Users, HeartHandshake, UserPlus, DollarSign, Globe, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from '../financiero/financiero.module.css'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const today = new Date()
const DATE_PRESETS = [
  { label: 'Este mes', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
  { label: 'Últimos 30 días', start: subDays(today, 30), end: today },
  { label: 'Este año', start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) },
]

export default function ReporteHuespedesPage() {
  const [preset, setPreset] = useState<string | null>('Este mes')
  const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'))
  
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
      const res = await fetch(`/api/reportes/huespedes?${params}`)
      if (!res.ok) throw new Error('Error')
      setData(await res.json())
    } catch {
      toast.error('Error al cargar el reporte de huéspedes')
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
          <h1 className="page-title">Reporte de Huéspedes</h1>
          <p className="page-subtitle">Fidelización, origen y mejores clientes</p>
        </div>
      </div>

      <div className={`card ${styles.filtersCard}`}>
        <div className="card-body">
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <p className="form-label">Período</p>
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
              { label: 'Huéspedes Únicos', value: String(data.summary.uniqueGuestsCount), icon: Users, color: '#3b82f6' },
              { label: 'Nuevos Clientes', value: String(data.summary.newGuests), icon: UserPlus, color: '#10b981' },
              { label: 'Clientes Fieles', value: String(data.summary.returningGuests), icon: HeartHandshake, color: '#f43f5e' },
              { label: 'Gasto Promedio', value: formatCLP(data.summary.avgSpendPerGuest), icon: DollarSign, color: '#f59e0b' },
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
                <Award size={18} color="#d97706" /> Top 50 Huéspedes (Gasto)
              </div>
              <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>RUT / ID</th>
                      <th>Noches</th>
                      <th>Gasto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topGuests.map((g: any, i: number) => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 600 }}>{i + 1}. {g.firstName} {g.lastName} {g.isRecurring && '⭐'}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{g.rut || '—'}</td>
                        <td>{g.nightsStayed}</td>
                        <td style={{ fontWeight: 600, color: 'var(--brand-600)' }}>{formatCLP(g.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={18} color="#0ea5e9" /> Origen / Nacionalidad
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nacionalidad</th>
                      <th>Huéspedes</th>
                      <th>% del Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nationalities.map((n: any) => (
                      <tr key={n.name}>
                        <td style={{ fontWeight: 600 }}>{n.name}</td>
                        <td>{n.count}</td>
                        <td>{data.summary.uniqueGuestsCount > 0 ? ((n.count / data.summary.uniqueGuestsCount) * 100).toFixed(1) : 0}%</td>
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
