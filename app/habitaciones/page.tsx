import { requireOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Hotel, CheckCircle2, AlertCircle, Wrench } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import RoomCardClient from './RoomCardClient'
import styles from './habitaciones.module.css'

export const dynamic = 'force-dynamic'

export default async function HabitacionesPage() {
  const { organizationId, role } = await requireOrg()
  const isAdmin = role === 'admin' || role === 'superadmin'
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
      { cleaningPriority: 'desc' },
      { sortOrder: 'asc' },
      { name: 'asc' }
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
  const priorityRooms = rooms.filter(r => (r as any).cleaningPriority).length

  return (
    <div className={`page-container ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Icon icon={Hotel} size="2xl" />
        </div>
        <div>
          <h1 className={styles.headerTitle}>Estado de Habitaciones</h1>
          <p className={styles.headerSubtitle}>
            Resumen de ocupación para hoy: {format(today, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ocupación</p>
          <span className={styles.statValue}>{occupancyRate}%</span>
          <div className={styles.statProgress}>
            <div className={styles.statProgressFill} style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon icon={AlertCircle} size="sm" /> Ocupadas
          </div>
          <span className={styles.statValue}>{occupiedRooms}</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon icon={CheckCircle2} size="sm" /> Libres
          </div>
          <span className={styles.statValue}>{availableRooms}</span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statLabel} ${styles.statLabelSuccess}`}>
            <Icon icon={CheckCircle2} size="sm" /> Listas
          </div>
          <span className={`${styles.statValue} ${styles.statValueSuccess}`}>{cleanRooms}</span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statLabel} ${styles.statLabelDanger}`}>
            <Icon icon={AlertCircle} size="sm" /> Sin limpieza
          </div>
          <span className={`${styles.statValue} ${styles.statValueDanger}`}>{dirtyRooms}</span>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statLabel} ${styles.statLabelDanger}`}>
            <Icon icon={Wrench} size="sm" /> Urgencias
          </div>
          <span className={`${styles.statValue} ${styles.statValueDanger}`}>{priorityRooms}</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon icon={Wrench} size="sm" /> Mant.
          </div>
          <span className={styles.statValue}>{maintenanceRooms}</span>
        </div>
      </div>

      {/* Grouped Rooms */}
      <div className={styles.groups}>
        {Object.entries(groupedRooms).map(([typeName, groupRooms]) => {
          const groupTotal = groupRooms.length
          const groupOccupied = groupRooms.filter(r => r.reservationRooms.length > 0).length
          const groupAvailable = groupTotal - groupOccupied
          const groupRate = groupTotal > 0 ? Math.round((groupOccupied / groupTotal) * 100) : 0

          return (
            <section key={typeName} className={styles.group}>
              <div className={styles.groupHeader}>
                <div>
                  <h3 className={styles.groupTitle}>{typeName}</h3>
                  <p className={styles.groupMeta}>{groupTotal} Habitaciones · {groupRate}% Ocupación</p>
                </div>
                <div className={styles.groupBadges}>
                  <span className={`${styles.groupBadge} ${styles.badgeOccupied}`}>{groupOccupied} Ocupadas</span>
                  <span className={`${styles.groupBadge} ${styles.badgeAvailable}`}>{groupAvailable} Libres</span>
                </div>
              </div>
              <div className={styles.roomsGrid}>
                {groupRooms.map(room => {
                  const isOccupied = room.reservationRooms.length > 0
                  const guestName = isOccupied ? `${room.reservationRooms[0].reservation.guest.firstName} ${room.reservationRooms[0].reservation.guest.lastName}` : null
                  return (
                    <RoomCardClient 
                      key={room.id}
                      room={room}
                      isOccupied={isOccupied}
                      guestName={guestName}
                      isAdmin={isAdmin}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}