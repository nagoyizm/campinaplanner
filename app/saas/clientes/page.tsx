import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import Link from 'next/link'
import styles from '../saas.module.css'
import { Building2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import DeleteButton from '@/components/ui/DeleteButton'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  await requireSuperAdmin()

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de Clientes</h1>
          <p className={styles.subtitle}>Directorio y administración de perfiles de clientes</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {orgs.map(org => (
            <Link 
              key={org.id} 
              href={`/saas/clientes/${org.id}`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '20px', 
                background: 'var(--surface-1)', 
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-base)' }}>
                    {org.name}
                    {org.slug === 'system-plannerio' && <span className={styles.badge} style={{ marginLeft: '8px' }}>Sistema</span>}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Slug: {org.slug} • Creado: {format(new Date(org.createdAt), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                <span className={styles.badge} style={{ opacity: org.active ? 1 : 0.5 }}>
                  {org.active ? 'Activo' : 'Inactivo'}
                </span>
                
                {org.slug !== 'system-plannerio' && (
                  <DeleteButton 
                    endpoint={`/api/saas/clientes/${org.id}`} 
                    confirmMessage={`¿Estás SEGURO de eliminar el cliente ${org.name}? Esta acción borrará permanentemente TODAS sus habitaciones, reservas, usuarios y finanzas asociadas.`} 
                    title="Eliminar cliente"
                  />
                )}
                
                <ChevronRight size={20} />
              </div>
            </Link>
        ))}
      </div>
    </div>
  )
}
