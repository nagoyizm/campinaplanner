import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import Link from 'next/link'
import styles from './saas.module.css'
import { Building2, Users, FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function SaasDashboard() {
  await requireSuperAdmin()

  // Fetch all organizations with some basic stats
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: { users: true, reservations: true, rooms: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const totalUsers = orgs.reduce((acc, org) => acc + org._count.users, 0)
  const totalReservations = orgs.reduce((acc, org) => acc + org._count.reservations, 0)

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>SaaS Dashboard</h1>
          <p className={styles.subtitle}>Gestión global de clientes y organizaciones</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/saas/importar" className="btn btn-secondary">
            <FileText size={18} />
            Importar Datos
          </Link>
          <Link href="/saas/nuevo" className="btn btn-primary">
            <Plus size={18} />
            Nuevo Cliente
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Building2 size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Clientes Activos</h3>
            <p>{orgs.filter(o => o.active && o.slug !== 'system-habita').length}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Usuarios Totales</h3>
            <p>{totalUsers}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}>
            <FileText size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Reservas en Sistema</h3>
            <p>{totalReservations}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 className={styles.title} style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Directorio de Organizaciones</h2>
        <table className={styles.orgsTable}>
          <thead>
            <tr>
              <th>Nombre del Cliente</th>
              <th>Slug / Acceso</th>
              <th>Habitaciones</th>
              <th>Usuarios</th>
              <th>Reservas</th>
              <th>Creado el</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(org => (
              <tr key={org.id}>
                <td>
                  <strong>{org.name}</strong>
                  {org.slug === 'system-habita' && <span style={{ fontSize: '10px', color: 'var(--brand-500)', marginLeft: '8px' }}>(SYSTEM)</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{org.slug}</td>
                <td>{org._count.rooms}</td>
                <td>{org._count.users}</td>
                <td>{org._count.reservations}</td>
                <td style={{ color: 'var(--text-muted)' }}>{format(new Date(org.createdAt), 'dd/MM/yyyy')}</td>
                <td>
                  <span className={styles.badge} style={{ opacity: org.active ? 1 : 0.5 }}>
                    {org.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
