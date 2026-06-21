import { requireOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { LogIn, LogOut, Search, PlusCircle, MessageCircle, AlertCircle, Calendar } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RecepcionDashboard() {
  const { organizationId, orgName } = await requireOrg()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 1. Llegadas de hoy (reservas confirmadas que inician hoy)
  const arrivalsToday = await prisma.reservationRoom.findMany({
    where: {
      room: { organizationId },
      arrival: { gte: today, lt: tomorrow }
    },
    include: {
      reservation: { include: { guest: true } },
      room: true
    }
  })

  // 2. Salidas de hoy (checked_in que terminan hoy)
  const departuresToday = await prisma.reservationRoom.findMany({
    where: {
      room: { organizationId },
      departure: { gte: today, lt: tomorrow }
    },
    include: {
      reservation: { include: { guest: true } },
      room: true
    }
  })

  const pendingArrivals = arrivalsToday.filter(a => a.reservation.status === 'confirmed').length
  const pendingDepartures = departuresToday.filter(d => d.reservation.status === 'checked_in').length
  const totalPending = pendingArrivals + pendingDepartures

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-base)', marginBottom: '8px' }}>Recepción rápida</h1>
        <p style={{ color: 'var(--text-muted)' }}>Módulo de operaciones para {orgName}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* KPI: Llegadas */}
        <div style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid #fde68a', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#d97706' }}>
            <LogIn size={32} />
          </div>
          <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-base)', display: 'block', lineHeight: 1 }}>{arrivalsToday.length}</span>
          <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', display: 'block' }}>Llegadas Hoy</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pendingArrivals} por ingresar</span>
        </div>

        {/* KPI: Salidas */}
        <div style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#6b7280' }}>
            <LogOut size={32} />
          </div>
          <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-base)', display: 'block', lineHeight: 1 }}>{departuresToday.length}</span>
          <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', display: 'block' }}>Salidas Hoy</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pendingDepartures} por salir</span>
        </div>

        {/* KPI: Pendientes */}
        <div style={{ background: 'var(--surface-1)', padding: '24px', borderRadius: '16px', border: '1px solid #fecaca', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#dc2626' }}>
            <AlertCircle size={32} />
          </div>
          <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-base)', display: 'block', lineHeight: 1 }}>{totalPending}</span>
          <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', display: 'block' }}>Tareas Pendientes</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check-in / Check-out</span>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-base)', marginBottom: '16px', textAlign: 'center' }}>Acciones Rápidas</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
        <Link href="/calendario" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: '#3b82f6', color: 'white', borderRadius: '12px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
          <PlusCircle size={20} />
          Nueva Reserva (Ir al Planner)
        </Link>

        <Link href="/huespedes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: 'var(--surface-1)', color: 'var(--text-base)', borderRadius: '12px', fontWeight: 600, border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.2s' }}>
          <Search size={20} />
          Buscar Cliente
        </Link>

        <Link href="/habitaciones" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: 'var(--surface-1)', color: 'var(--text-base)', borderRadius: '12px', fontWeight: 600, border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.2s' }}>
          <Calendar size={20} />
          Revisar Habitaciones
        </Link>

        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: '#25D366', color: 'white', borderRadius: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)' }}>
          <MessageCircle size={20} />
          Mensaje WhatsApp
        </button>
      </div>
    </div>
  )
}
