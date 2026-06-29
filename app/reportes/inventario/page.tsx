'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, Package, ShoppingCart, TrendingDown, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from '../financiero/financiero.module.css'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const today = new Date()
const DATE_PRESETS = [
  { label: 'Este mes', start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) },
  { label: 'Mes anterior', start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0) },
  { label: 'Este año', start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear(), 11, 31) },
]

export default function ReporteInventarioPage() {
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
      const res = await fetch(`/api/reportes/inventario?${params}`)
      if (!res.ok) throw new Error('Error')
      setData(await res.json())
    } catch {
      toast.error('Error al cargar el reporte de inventario')
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
          <h1 className="page-title">Reporte de Inventario</h1>
          <p className="page-subtitle">Flujo de caja y consumo de existencias</p>
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
              { label: 'Gastos de Compras', value: formatCLP(data.summary.totalPurchases), icon: ShoppingCart, color: '#f43f5e' },
              { label: 'Costo de Consumo', value: formatCLP(data.summary.totalUsage), icon: TrendingDown, color: '#f59e0b' },
              { label: 'Transacciones', value: String(data.summary.transactionCount), icon: ClipboardList, color: '#3b82f6' },
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
                <Package size={18} color="#0ea5e9" /> Resumen por Categoría
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Gasto (Compras)</th>
                      <th>Costo (Consumido)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((c: any) => (
                      <tr key={c.name}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: 'var(--brand-600)' }}>{formatCLP(c.purchases)}</td>
                        <td style={{ color: '#d97706' }}>{formatCLP(c.usage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingDown size={18} color="#d97706" /> Ítems Más Consumidos
              </div>
              <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cambio Neto (Unds)</th>
                      <th>Costo Uso Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.slice(0, 50).map((i: any) => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.category}</div>
                        </td>
                        <td style={{ color: i.netChange > 0 ? '#10b981' : i.netChange < 0 ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                          {i.netChange > 0 ? '+' : ''}{i.netChange}
                        </td>
                        <td style={{ fontWeight: 600, color: '#d97706' }}>{formatCLP(i.usage)}</td>
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
