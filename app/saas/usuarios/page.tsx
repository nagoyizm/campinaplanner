import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import styles from '../saas.module.css'
import { UsersRound } from 'lucide-react'
import { format } from 'date-fns'
import DeleteButton from '@/components/ui/DeleteButton'
import EditUserButton from './EditUserButton'

export const dynamic = 'force-dynamic'

export default async function GlobalUsersPage() {
  await requireSuperAdmin()

  const users = await prisma.user.findMany({
    include: {
      organization: { select: { name: true, slug: true } }
    },
    orderBy: [
      { organization: { name: 'asc' } },
      { role: 'asc' }
    ]
  })

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Directorio Global de Usuarios</h1>
          <p className={styles.subtitle}>Todos los administradores y operadores del sistema</p>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <table className={styles.orgsTable}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol (Sistema)</th>
              <th>Cargo</th>
              <th>Organización</th>
              <th>Estado</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UsersRound size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <strong>{user.name}</strong>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                <td>
                  <span className={styles.badge} style={{ background: user.role === 'superadmin' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: user.role === 'superadmin' ? '#a855f7' : '#3b82f6' }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{user.roleName}</td>
                <td>
                  {user.organization.name}
                  {user.organization.slug === 'system-habita' && <span style={{ fontSize: '10px', color: 'var(--brand-500)', marginLeft: '8px' }}>(SYSTEM)</span>}
                </td>
                <td>
                  <span className={styles.badge} style={{ opacity: user.active ? 1 : 0.5 }}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <EditUserButton user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    roleName: user.roleName || '',
                    active: user.active
                  }} />
                  <DeleteButton 
                    endpoint={`/api/saas/usuarios/${user.id}`} 
                    confirmMessage={`¿Estás seguro de eliminar permanentemente al usuario ${user.name} (${user.email})?`} 
                    title="Eliminar usuario"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
