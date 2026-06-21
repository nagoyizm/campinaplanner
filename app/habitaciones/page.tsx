import { requireOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Hotel, CheckCircle2, AlertCircle } from 'lucide-react'
import RoomCardClient from './RoomCardClient'

export const dynamic = 'force-dynamic'

export default async function HabitacionesPage() {
  const { organizationId } = await requireOrg()
  const today = startOfDay(new Date())

  // Fetch all rooms with their unit types
  const rooms = await prisma.room.findMany({
    where: { organizationId, active: true },
    include: {
      unitType: true,
      reservationRooms: {
        where: {
          arrival: { lte: today },
          departure: { gt: today },
          reservation: {
            status: { in: ['booked', 'confirmed', 'checked_in'] }
          }
        },
        include: {
          reservation: {
            include: {
              guest: true
            }
          }
        }
      }
    },
    orderBy: [
      { unitType: { sortOrder: 'asc' } },
      { sortOrder: 'asc' }
    ]
  })

  // Group by Unit Type
  const groupedRooms = rooms.reduce((acc, room) => {
    const typeName = room.unitType.name
    if (!acc[typeName]) acc[typeName] = []
    acc[typeName].push(room)
    return acc
  }, {} as Record<string, typeof rooms>)

  // Global Stats
  const totalRooms = rooms.length
  const occupiedRooms = rooms.filter(r => r.reservationRooms.length > 0).length
  const availableRooms = totalRooms - occupiedRooms
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  const cleanRooms = rooms.filter(r => (r as any).cleaningStatus === 'clean').length
  const dirtyRooms = rooms.filter(r => (r as any).cleaningStatus === 'dirty').length
  const maintenanceRooms = rooms.filter(r => (r as any).cleaningStatus === 'maintenance').length

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hotel size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-base)', margin: 0 }}>Estado de Habitaciones</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Resumen de ocupación para hoy: {format(today, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Ocupación</p>
          <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-600)', lineHeight: 1 }}>{occupancyRate}%</span>
          </div>
          <div style={{ marginTop: '12px', height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${occupancyRate}%`, background: 'var(--brand-500)', borderRadius: '2px' }} />
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <AlertCircle size={14} color="#f59e0b" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Ocupadas</p>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-base)', lineHeight: 1 }}>{occupiedRooms}</span>
        </div>

        <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CheckCircle2 size={14} color="#10b981" />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Libres</p>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-base)', lineHeight: 1 }}>{availableRooms}</span>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #a7f3d0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CheckCircle2 size={14} color="#047857" />
            <p style={{ color: '#065f46', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Listas</p>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#065f46', lineHeight: 1 }}>{cleanRooms}</span>
        </div>

        <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '12px', border: '1px solid #fca5a5', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <AlertCircle size={14} color="#b91c1c" />
            <p style={{ color: '#991b1b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Sin limpieza</p>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>{dirtyRooms}</span>
        </div>

        <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <AlertCircle size={14} color="#4b5563" />
            <p style={{ color: '#374151', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Mant.</p>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#374151', lineHeight: 1 }}>{maintenanceRooms}</span>
        </div>
      </div>

      {/* Grouped Rooms */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {Object.entries(groupedRooms).map(([typeName, groupRooms]) => {
          const groupTotal = groupRooms.length
          const groupOccupied = groupRooms.filter(r => r.reservationRooms.length > 0).length
          const groupAvailable = groupTotal - groupOccupied
          const groupRate = groupTotal > 0 ? Math.round((groupOccupied / groupTotal) * 100) : 0

          return (
            <div key={typeName} style={{ background: 'var(--surface-1)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-base)' }}>{typeName}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{groupTotal} Habitaciones • {groupRate}% Ocupación</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{groupOccupied} Ocupadas</span>
                  <span style={{ background: '#d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{groupAvailable} Libres</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {groupRooms.map(room => {
                  const isOccupied = room.reservationRooms.length > 0
                  const guestName = isOccupied ? `${room.reservationRooms[0].reservation.guest.firstName} ${room.reservationRooms[0].reservation.guest.lastName}` : null
                  return (
                    <RoomCardClient 
                      key={room.id}
                      room={room}
                      isOccupied={isOccupied}
                      guestName={guestName}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .room-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      `}} />
    </div>
  )
}
