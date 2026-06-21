import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  LogIn, 
  LogOut, 
  BedDouble, 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  ArrowRight,
  Plus,
  Activity,
  Award,
  ShieldCheck,
  Percent,
  Volume2,
  Trash2,
  Moon,
  Clock,
  Sparkles,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import styles from './dashboard.module.css'

export const dynamic = 'force-dynamic'

function formatCLP(val: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(val)
}

function getTodayInSantiago(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

function formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${d}/${m}/${y}`
}

function getGreeting(hour: number): string {
  if (hour >= 6 && hour < 12) return '¡Buenos días!'
  if (hour >= 12 && hour < 20) return '¡Buenas tardes!'
  return '¡Buenas noches!'
}

export default async function DashboardPage() {
  const { organizationId } = await requireOrg()
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
  const orgName = org?.name ?? 'Mi Organización'
  const santiagoToday = getTodayInSantiago()
  const parts = santiagoToday.split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1])

  const todayStart = new Date(`${santiagoToday}T00:00:00.000Z`)
  const todayEnd = new Date(`${santiagoToday}T23:59:59.999Z`)

  const startMonth = new Date(`${parts[0]}-${parts[1]}-01T00:00:00.000Z`)
  const lastDayVal = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const endMonth = new Date(`${parts[0]}-${parts[1]}-${String(lastDayVal).padStart(2, '0')}T23:59:59.999Z`)

  const next7DaysEnd = new Date(todayStart)
  next7DaysEnd.setUTCDate(next7DaysEnd.getUTCDate() + 7)
  next7DaysEnd.setUTCHours(23, 59, 59, 999)

  const formatterHour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    hour12: false,
  })
  const currentHour = parseInt(formatterHour.format(new Date()))
  const greeting = getGreeting(currentHour)

  const santiagoDateWordsRaw = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const santiagoDateWords = santiagoDateWordsRaw.charAt(0).toUpperCase() + santiagoDateWordsRaw.slice(1)

  const santiagoMonthName = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    month: 'long',
  }).format(new Date())

  // Fetch all dashboard data in parallel
  const [
    arrivalsToday,
    departuresToday,
    checkedInReservations,
    totalActiveRooms,
    reservationsThisMonth,
    allActiveReservations,
    upcomingArrivals,
    recentReservations
  ] = await Promise.all([
    // 1. Today's Arrivals
    prisma.reservationRoom.findMany({
      where: {
        room: { organizationId },
        arrival: { gte: todayStart, lte: todayEnd },
        reservation: { status: { notIn: ['cancelled', 'blocked'] } }
      },
      include: {
        reservation: { include: { guest: true } },
        room: { include: { unitType: true } }
      },
      orderBy: { room: { sortOrder: 'asc' } }
    }),

    // 2. Today's Departures
    prisma.reservationRoom.findMany({
      where: {
        room: { organizationId },
        departure: { gte: todayStart, lte: todayEnd },
        reservation: { status: { notIn: ['cancelled', 'blocked'] } }
      },
      include: {
        reservation: { include: { guest: true } },
        room: { include: { unitType: true } }
      },
      orderBy: { room: { sortOrder: 'asc' } }
    }),

    // 3. Checked-In Reservations
    prisma.reservation.findMany({
      where: { organizationId, status: 'checked_in' },
      include: {
        guest: true,
        rooms: { include: { room: { include: { unitType: true } } } }
      }
    }),

    // 4. Total Active Rooms
    prisma.room.findMany({
      where: { active: true, organizationId },
      include: { unitType: true }
    }),

    // 5. Reservations arriving this month
    prisma.reservation.findMany({
      where: {
        organizationId,
        status: { notIn: ['cancelled', 'blocked'] },
        rooms: {
          some: {
            arrival: { gte: startMonth, lte: endMonth }
          }
        }
      }
    }),

    // 6. All non-cancelled, non-blocked reservations for pending payments
    prisma.reservation.findMany({
      where: {
        organizationId,
        status: { notIn: ['cancelled', 'blocked'] }
      }
    }),

    // 7. Upcoming arrivals next 7 days
    prisma.reservationRoom.findMany({
      where: {
        room: { organizationId },
        arrival: { gte: todayStart, lte: next7DaysEnd },
        reservation: { status: { notIn: ['cancelled', 'blocked'] } }
      },
      include: {
        reservation: { include: { guest: true } },
        room: { include: { unitType: true } }
      },
      orderBy: { arrival: 'asc' },
      take: 10
    }),

    // 8. Recent reservations (last 5 created)
    prisma.reservation.findMany({
      where: { organizationId, status: { not: 'blocked' } },
      include: {
        guest: true,
        rooms: { include: { room: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ])

  // Calculations
  const arrivalsCount = arrivalsToday.length
  const departuresCount = departuresToday.length
  
  const checkedInCount = checkedInReservations.length

  // Calculate guests and occupancy split by unit type
  let guestsInCabanas = 0
  let guestsInSuites = 0
  let occupiedCabanas = 0
  let occupiedSuites = 0

  checkedInReservations.forEach(r => {
    r.rooms.forEach(rr => {
      const typeName = rr.room.unitType.name.toLowerCase()
      const pax = rr.adults + rr.children
      if (typeName.includes('suite')) {
        guestsInSuites += pax
        occupiedSuites++
      } else {
        guestsInCabanas += pax
        occupiedCabanas++
      }
    })
  })

  let totalCabanas = 0
  let totalSuites = 0

  totalActiveRooms.forEach(room => {
    const typeName = room.unitType.name.toLowerCase()
    if (typeName.includes('suite')) {
      totalSuites++
    } else {
      totalCabanas++
    }
  })

  const totalGuestsCheckedIn = guestsInCabanas + guestsInSuites
  const occupiedRoomsToday = occupiedCabanas + occupiedSuites
  const totalActiveRoomsCount = totalCabanas + totalSuites
  const occupancyPercent = totalActiveRoomsCount > 0 ? Math.round((occupiedRoomsToday / totalActiveRoomsCount) * 100) : 0

  // Revenue generated by reservations starting this month
  const revenueThisMonth = reservationsThisMonth.reduce((sum, r) => {
    return sum + (r.unitTotal + r.additionalServices - r.discounts + r.tax)
  }, 0)

  // Pending payments (sum of amountDue where amountDue > 0)
  const pendingPayments = allActiveReservations.reduce((sum, r) => {
    const total = r.unitTotal + r.additionalServices - r.discounts + r.tax
    const due = total - r.totalPaid
    return due > 0 ? sum + due : sum
  }, 0)

  // Status mapping
  const statusLabels: Record<string, string> = {
    booked: 'Reservado',
    confirmed: 'Confirmado',
    checked_in: 'En Recinto',
    checked_out: 'Finalizado',
    blocked: 'Bloqueado',
    cancelled: 'Cancelado',
    no_show: 'No Show'
  }

  const statusColors: Record<string, string> = {
    booked: styles.statusBooked,
    confirmed: styles.statusConfirmed,
    checked_in: styles.statusCheckedIn,
    checked_out: styles.statusCheckedOut,
    blocked: styles.statusBlocked,
    cancelled: styles.statusCancelled,
    no_show: styles.statusNoShow
  }

  // Limpieza
  const cleanCount = totalActiveRooms.filter(r => (r as any).cleaningStatus === 'clean').length
  const dirtyCount = totalActiveRooms.filter(r => (r as any).cleaningStatus === 'dirty').length
  const maintCount = totalActiveRooms.filter(r => (r as any).cleaningStatus === 'maintenance').length

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>{greeting}, Recepción</h1>
          <p className={styles.subtitle}>
            {santiagoDateWords}
          </p>
        </div>
        <div className={styles.pulseContainer}>
          <span className={styles.pulseDot}></span>
          <span className={styles.pulseText}>Sistema Online · {orgName}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Llegadas y Salidas Hoy */}
        <div className={`card ${styles.kpiCard}`} style={{ padding: '16px' }}>
          <div className="card-body" style={{ padding: 0 }}>
            <div className={styles.kpiHeader} style={{ marginBottom: '12px' }}>
              <div className={`${styles.kpiIcon} ${styles.colorWarning}`}>
                <LogIn size={20} />
              </div>
              <span className={styles.kpiLabel}>Movimientos Hoy</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--border)' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{arrivalsCount}</span>
                <span style={{ fontSize: '0.65rem', color: '#b45309', textTransform: 'uppercase', fontWeight: 600 }}>Llegadas</span>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  {arrivalsToday.filter(a => a.reservation.status === 'confirmed').length} conf.
                </span>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#4b5563' }}>{departuresCount}</span>
                <span style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', fontWeight: 600 }}>Salidas</span>
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  {departuresToday.filter(d => d.reservation.status === 'checked_in').length} pdte.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Huéspedes Activos */}
        <div className={`card ${styles.kpiCard}`}>
          <div className="card-body">
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.colorSuccess}`}>
                <BedDouble size={20} />
              </div>
              <span className={styles.kpiLabel}>Huéspedes Activos</span>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{totalGuestsCheckedIn}</span>
              <span className={styles.kpiSubtext} style={{ lineHeight: '1.4' }}>
                {occupiedRoomsToday} habitaciones<br />
                {checkedInCount} reservas
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Estado Limpieza */}
        <div className={`card ${styles.kpiCard}`} style={{ padding: '16px' }}>
          <div className="card-body" style={{ padding: 0 }}>
            <div className={styles.kpiHeader} style={{ marginBottom: '12px' }}>
              <div className={`${styles.kpiIcon} ${styles.colorGold}`}>
                <Activity size={20} />
              </div>
              <span className={styles.kpiLabel}>Estado Limpieza</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--border)' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>{cleanCount}</span>
                <span style={{ fontSize: '0.65rem', color: '#065f46', textTransform: 'uppercase', fontWeight: 600 }}>Listas</span>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--border)' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c' }}>{dirtyCount}</span>
                <span style={{ fontSize: '0.65rem', color: '#991b1b', textTransform: 'uppercase', fontWeight: 600 }}>Sin limpieza</span>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#4b5563' }}>{maintCount}</span>
                <span style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', fontWeight: 600 }}>Mant.</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5: Disponibilidad Hoy */}
        <div className={`card ${styles.kpiCard}`}>
          <div className="card-body">
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.colorInfo}`}>
                <TrendingUp size={20} />
              </div>
              <span className={styles.kpiLabel}>Ocupación hoy</span>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{occupancyPercent}%</span>
              <div className={styles.progressBarBg}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${occupancyPercent}%` }}
                ></div>
              </div>
              <span className={styles.kpiSubtext} style={{ lineHeight: '1.4' }}>
                Cabañas: {occupiedCabanas} de {totalCabanas} <br/>
                Suites: {occupiedSuites} de {totalSuites}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Ingresos del Mes */}
        <div className={`card ${styles.kpiCard}`}>
          <div className="card-body">
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.colorGold}`}>
                <DollarSign size={20} />
              </div>
              <span className={styles.kpiLabel}>Ingresos del Mes</span>
            </div>
            <div className={styles.kpiContent}>
              <span className={`${styles.kpiValue} ${styles.currencyText}`}>
                {formatCLP(revenueThisMonth)}
              </span>
              <span className={styles.kpiSubtext}>
                Reservas con llegada en {santiagoMonthName}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 6: Por Cobrar */}
        <div className={`card ${styles.kpiCard}`}>
          <div className="card-body">
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.colorDanger}`}>
                <AlertCircle size={20} />
              </div>
              <span className={styles.kpiLabel}>Por Cobrar</span>
            </div>
            <div className={styles.kpiContent}>
              <span className={`${styles.kpiValue} ${styles.currencyText} ${styles.dangerText}`}>
                {formatCLP(pendingPayments)}
              </span>
              <span className={styles.kpiSubtext}>
                Deuda total de reservas activas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>
          <Activity size={18} style={{ color: 'var(--brand-500)' }} /> Acciones Rápidas
        </h2>
        <div className={styles.actionsGrid}>
          <Link href="/calendario" className={styles.actionButton}>
            <div className={`${styles.actionIcon} ${styles.bgBrand}`}>
              <Plus size={20} />
            </div>
            <div>
              <span className={styles.actionTitle}>Nueva Reserva</span>
              <span className={styles.actionDesc}>Ir al Calendario interactivo</span>
            </div>
            <ArrowRight size={16} className={styles.actionArrow} />
          </Link>

          <Link href="/reportes/financiero" className={styles.actionButton}>
            <div className={`${styles.actionIcon} ${styles.bgGold}`}>
              <FileText size={20} />
            </div>
            <div>
              <span className={styles.actionTitle}>Reporte Financiero</span>
              <span className={styles.actionDesc}>Ver ingresos, pagos y deudas</span>
            </div>
            <ArrowRight size={16} className={styles.actionArrow} />
          </Link>

          <Link href="/huespedes" className={styles.actionButton}>
            <div className={`${styles.actionIcon} ${styles.bgSuccess}`}>
              <Users size={20} />
            </div>
            <div>
              <span className={styles.actionTitle}>Base de Huéspedes</span>
              <span className={styles.actionDesc}>Clientes, notas e historial</span>
            </div>
            <ArrowRight size={16} className={styles.actionArrow} />
          </Link>

          <Link href="/setup/tarifas" className={styles.actionButton}>
            <div className={`${styles.actionIcon} ${styles.bgMuted}`}>
              <Settings size={20} />
            </div>
            <div>
              <span className={styles.actionTitle}>Configuración (Setup)</span>
              <span className={styles.actionDesc}>Tarifas, habitaciones y usuarios</span>
            </div>
            <ArrowRight size={16} className={styles.actionArrow} />
          </Link>

          <Link href="/simulador" className={styles.actionButton}>
            <div className={`${styles.actionIcon} ${styles.bgBrand}`} style={{ backgroundColor: '#2d7d46' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <span className={styles.actionTitle}>Simulador de Bot</span>
              <span className={styles.actionDesc}>Probar reservas automáticas de WhatsApp</span>
            </div>
            <ArrowRight size={16} className={styles.actionArrow} />
          </Link>
        </div>
      </div>

      {/* Main Grid: Columns */}
      <div className={styles.columnsGrid}>
        
        {/* Left Column: Today's Operations & Upcoming Arrivals */}
        <div className={styles.leftColumn}>
          
          {/* Today's Checklist */}
          <div className={`card ${styles.dashboardCard}`}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.cardTitle}>
                <Clock size={18} style={{ color: 'var(--brand-500)' }} /> Operaciones de Hoy
              </h3>
              <div className={styles.badgeGroup}>
                <span className={`${styles.badge} ${styles.badgeWarning}`}>Llegadas: {arrivalsCount}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>Salidas: {departuresCount}</span>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              
              {/* Arrivals list today */}
              <div className={styles.opSection}>
                <h4 className={styles.opSectionTitle}>
                  <LogIn size={14} /> Llegadas Hoy
                </h4>
                {arrivalsToday.length === 0 ? (
                  <p className={styles.noDataText}>No hay llegadas programadas para hoy.</p>
                ) : (
                  <div className={styles.opList}>
                    {arrivalsToday.map((item) => {
                      const rsv = item.reservation
                      const isCheckedIn = rsv.status === 'checked_in'
                      return (
                        <div key={item.id} className={`${styles.opItem} ${isCheckedIn ? styles.opItemCompleted : ''}`}>
                          <div className={styles.opMain}>
                            <div className={styles.avatar}>
                              {rsv.guest.firstName[0]}{rsv.guest.lastName[0]}
                            </div>
                            <div>
                              <p className={styles.opGuestName}>
                                {rsv.guest.firstName} {rsv.guest.lastName}
                              </p>
                              <p className={styles.opRoomDetails}>
                                {item.room.name.replace(/^[a-z]-/i, '')} ({item.room.unitType.name}) · {item.nights} noche{item.nights > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className={styles.opActions}>
                            <span className={`${styles.statusBadge} ${statusColors[rsv.status]}`}>
                              {statusLabels[rsv.status]}
                            </span>
                            <Link href="/calendario" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
                              Ver
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Departures list today */}
              <div className={styles.opSection} style={{ borderTop: '1px solid var(--border-light)' }}>
                <h4 className={styles.opSectionTitle}>
                  <LogOut size={14} /> Salidas Hoy
                </h4>
                {departuresToday.length === 0 ? (
                  <p className={styles.noDataText}>No hay salidas programadas para hoy.</p>
                ) : (
                  <div className={styles.opList}>
                    {departuresToday.map((item) => {
                      const rsv = item.reservation
                      const isCheckedOut = rsv.status === 'checked_out'
                      return (
                        <div key={item.id} className={`${styles.opItem} ${isCheckedOut ? styles.opItemCompleted : ''}`}>
                          <div className={styles.opMain}>
                            <div className={styles.avatar} style={{ backgroundColor: 'var(--surface-3)' }}>
                              {rsv.guest.firstName[0]}{rsv.guest.lastName[0]}
                            </div>
                            <div>
                              <p className={styles.opGuestName}>
                                {rsv.guest.firstName} {rsv.guest.lastName}
                              </p>
                              <p className={styles.opRoomDetails}>
                                {item.room.name.replace(/^[a-z]-/i, '')} ({item.room.unitType.name}) · Salida hoy
                              </p>
                            </div>
                          </div>
                          <div className={styles.opActions}>
                            <span className={`${styles.statusBadge} ${statusColors[rsv.status]}`}>
                              {statusLabels[rsv.status]}
                            </span>
                            <Link href="/calendario" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 11 }}>
                              Ver
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Upcoming Arrivals Next 7 Days */}
          <div className={`card ${styles.dashboardCard}`} style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3 className={styles.cardTitle}>
                <Calendar size={18} style={{ color: 'var(--brand-500)' }} /> Próximas Llegadas (Siguientes 7 días)
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {upcomingArrivals.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay llegadas registradas en los próximos 7 días.
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Huésped</th>
                        <th>Cabaña/Suite</th>
                        <th>Llegada</th>
                        <th>Salida</th>
                        <th>Nts</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingArrivals.map((item) => {
                        const rsv = item.reservation
                        return (
                          <tr key={item.id}>
                            <td className={styles.boldCell}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className={styles.smallAvatar}>
                                  {rsv.guest.firstName[0]}{rsv.guest.lastName[0]}
                                </div>
                                <span>{rsv.guest.firstName} {rsv.guest.lastName}</span>
                              </div>
                            </td>
                            <td>{item.room.name.replace(/^[a-z]-/i, '')}</td>
                            <td>{formatUTCDate(item.arrival)}</td>
                            <td>{formatUTCDate(item.departure)}</td>
                            <td>{item.nights}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${statusColors[rsv.status]}`}>
                                {statusLabels[rsv.status]}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Recent Reservations & Extended Reports */}
        <div className={styles.rightColumn}>
          
          {/* Recent Reservations */}
          <div className={`card ${styles.dashboardCard}`}>
            <div className="card-header">
              <h3 className={styles.cardTitle}>
                <Sparkles size={18} style={{ color: 'var(--brand-500)' }} /> Últimas Reservas Creadas
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {recentReservations.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay reservas registradas en el sistema.
                </div>
              ) : (
                <div className={styles.recentList}>
                  {recentReservations.map((rsv) => {
                    const total = rsv.unitTotal + rsv.additionalServices - rsv.discounts + rsv.tax
                    const roomNames = rsv.rooms.map(r => r.room.name.replace(/^[a-z]-/i, '')).join(', ')
                    
                    return (
                      <div key={rsv.id} className={styles.recentItem}>
                        <div className={styles.recentHeader}>
                          <div>
                            <span className={styles.rsvNumber}>Rsv #{rsv.id}</span>
                            <span className={styles.recentTime}>
                              {format(new Date(rsv.createdAt), 'dd/MM HH:mm')}
                            </span>
                          </div>
                          <span className={`${styles.statusBadge} ${statusColors[rsv.status]}`}>
                            {statusLabels[rsv.status]}
                          </span>
                        </div>
                        <div className={styles.recentBody}>
                          <div>
                            <p className={styles.recentGuest}>
                              {rsv.guest.firstName} {rsv.guest.lastName}
                            </p>
                            <p className={styles.recentRooms}>
                              {roomNames || 'Sin unidad asignada'}
                            </p>
                          </div>
                          <div className={styles.recentTotal}>
                            <p className={styles.recentPrice}>{formatCLP(total)}</p>
                            <p className={styles.recentPaid}>
                              {rsv.totalPaid >= total ? 'Pagado' : `Pagado: ${formatCLP(rsv.totalPaid)}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Extended Reports Section (Phase 8 Multi-Report Ecosystem) */}
          <div className={`card ${styles.dashboardCard}`} style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3 className={styles.cardTitle}>
                <FileText size={18} style={{ color: 'var(--brand-500)' }} /> Ecosistema de Reportes (Extendible)
              </h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className={styles.extendibleText}>
                La Campiña Planner cuenta con un ecosistema de analíticas estructurado de forma modular y altamente escalable para futuras incorporaciones.
              </p>
              
              <div className={styles.reportList}>
                {/* 1. Reporte Financiero */}
                <div className={styles.reportItem}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportIconBg} style={{ background: '#eab30820', color: '#eab308' }}>
                      <DollarSign size={16} />
                    </span>
                    <div>
                      <p className={styles.reportItemTitle}>1. Reporte Financiero y Contable</p>
                      <p className={styles.reportItemDesc}>Análisis detallado de facturación, cobros, descuentos y exportación completa a Excel y PDF.</p>
                    </div>
                  </div>
                  <Link href="/reportes/financiero" className={styles.reportLink}>
                    Ver <ArrowRight size={12} />
                  </Link>
                </div>

                {/* 2. Reporte de Huéspedes */}
                <div className={styles.reportItem}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportIconBg} style={{ background: '#10b98120', color: '#10b981' }}>
                      <Users size={16} />
                    </span>
                    <div>
                      <p className={styles.reportItemTitle}>2. Reporte de Pasajeros (Extensible)</p>
                      <p className={styles.reportItemDesc}>Métricas de clientes frecuentes, orígenes nacionales, perfiles de conducta y estadísticas de estadía.</p>
                    </div>
                  </div>
                  <span className={styles.devBadge}>Listo</span>
                </div>

                {/* 3. Reporte de Servicios */}
                <div className={styles.reportItem}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportIconBg} style={{ background: '#3b82f620', color: '#3b82f6' }}>
                      <Activity size={16} />
                    </span>
                    <div>
                      <p className={styles.reportItemTitle}>3. Venta de Extras y Amenities (Extensible)</p>
                      <p className={styles.reportItemDesc}>Venta de leña, desayunos contratados, early check-in/late check-out facturados por período.</p>
                    </div>
                  </div>
                  <span className={styles.devBadge}>Listo</span>
                </div>
              </div>

              <div className={styles.reportFooter}>
                <Award size={14} style={{ color: 'var(--brand-500)' }} />
                <span>Estructura preparada para integración de gráficos estadísticos en tiempo real.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
