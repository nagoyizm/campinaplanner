'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'
import { parseISO, format, differenceInDays, isFuture } from 'date-fns'
import { es } from 'date-fns/locale'

interface ReportRow {
  reservationId: number
  unitType: string
  arrival: string
  departure: string
  nights: number
  total: number
  totalPaid: number
  paymentMethod: string
  status: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export default function FinancialCharts({ rows, startDate, endDate }: { rows: ReportRow[], startDate: string, endDate: string }) {
  
  // 1. Datos para gráfico de Ingresos en el Tiempo (Agrupados por Fecha de Llegada)
  const timelineData = useMemo(() => {
    const dataMap: Record<string, number> = {}
    
    rows.forEach(r => {
      if (!r.arrival || r.status === 'cancelled') return
      const dateKey = r.arrival.split('T')[0]
      if (!dataMap[dateKey]) dataMap[dateKey] = 0
      dataMap[dateKey] += r.total
    })

    const sortedDates = Object.keys(dataMap).sort()
    return sortedDates.map(date => ({
      date,
      displayDate: format(parseISO(date), 'd MMM', { locale: es }),
      total: dataMap[date]
    }))
  }, [rows])

  // 2. Ingresos por Tipo de Habitación (Dona)
  const unitTypeData = useMemo(() => {
    const dataMap: Record<string, number> = {}
    rows.forEach(r => {
      if (r.status === 'cancelled') return
      const key = r.unitType || 'Desconocido'
      if (!dataMap[key]) dataMap[key] = 0
      dataMap[key] += r.total
    })
    return Object.keys(dataMap).map(name => ({ name, value: dataMap[name] })).sort((a,b) => b.value - a.value)
  }, [rows])

  // 3. Pagos por Método (Dona)
  const paymentsData = useMemo(() => {
    const dataMap: Record<string, number> = {}
    rows.forEach(r => {
      if (!r.paymentMethod || r.totalPaid <= 0 || r.status === 'cancelled') return
      const key = r.paymentMethod
      if (!dataMap[key]) dataMap[key] = 0
      dataMap[key] += r.totalPaid
    })
    return Object.keys(dataMap).map(name => ({ name, value: dataMap[name] })).sort((a,b) => b.value - a.value)
  }, [rows])

  // 4. Cálculos Predictivos e Insights
  const insights = useMemo(() => {
    const validRows = rows.filter(r => r.status !== 'cancelled')
    const totalRevenue = validRows.reduce((acc, r) => acc + r.total, 0)
    const totalNights = validRows.reduce((acc, r) => acc + r.nights, 0)
    
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0
    
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const daysInPeriod = Math.max(1, differenceInDays(end, start) + 1)
    
    const dailyAverage = totalRevenue / daysInPeriod
    const projection30Days = dailyAverage * 30

    // Futuras reservas ya confirmadas en la muestra
    const futureRevenue = validRows
      .filter(r => isFuture(parseISO(r.arrival)))
      .reduce((acc, r) => acc + r.total, 0)

    return { adr, totalNights, dailyAverage, projection30Days, futureRevenue }
  }, [rows, startDate, endDate])

  if (rows.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
      
      {/* KPI & Insights Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))', color: 'white' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>ADR (Tarifa Media Diaria)</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>{formatCLP(insights.adr)}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Promedio por {insights.totalNights} noches vendidas</div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Proyección (Tendencia 30 Días)</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px', color: '#10b981' }}>{formatCLP(insights.projection30Days)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Basado en el promedio diario actual de {formatCLP(insights.dailyAverage)}</div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Ingresos Asegurados a Futuro</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px', color: '#3b82f6' }}>{formatCLP(insights.futureRevenue)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Reservas en la muestra con llegada a partir de mañana</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Timeline Chart */}
        <div className="card" style={{ flex: '1 1 500px', minWidth: 0, padding: '20px', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Evolución de Ingresos (Llegadas)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="displayDate" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `$${(val / 1000)}k`} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatCLP(value), 'Ingresos']}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Types Pie */}
        <div className="card" style={{ flex: '1 1 250px', minWidth: 0, padding: '20px', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Por Tipo de Habitación</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={unitTypeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {unitTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCLP(value)}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Pie */}
        <div className="card" style={{ flex: '1 1 250px', minWidth: 0, padding: '20px', background: 'var(--surface-1)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-primary)' }}>Por Forma de Pago</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentsData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCLP(value)}
                  contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
