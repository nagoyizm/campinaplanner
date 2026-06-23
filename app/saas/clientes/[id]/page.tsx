import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import styles from '../../saas.module.css'
import { ArrowLeft, Building2, Users, BookOpen, Download, Upload } from 'lucide-react'
import { format } from 'date-fns'
import PlanSelector from './PlanSelector'

export const dynamic = 'force-dynamic'

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, reservations: true, rooms: true, guests: true }
      }
    }
  })

  if (!org) notFound()

  // Tablas a importar con su orden lógico
  const importSteps = [
    { id: 'unittype', name: 'Tipos de Unidad', desc: 'Categorías (ej. Cabaña 5P)' },
    { id: 'room', name: 'Habitaciones', desc: 'Unidades físicas (ej. C1)' },
    { id: 'rate', name: 'Tarifas', desc: 'Precios base (opcional)' },
    { id: 'guest', name: 'Huéspedes', desc: 'Base de datos de clientes' },
    { id: 'reservation', name: 'Reservas', desc: 'Historial de reservas' },
    { id: 'inventario', name: 'Inventario', desc: 'Productos e insumos' }
  ]

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Link href="/saas/clientes" className="btn btn-ghost" style={{ padding: '8px' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 className={styles.title} style={{ margin: 0 }}>{org.name}</h1>
            <span className={styles.badge} style={{ opacity: org.active ? 1 : 0.5 }}>
              {org.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className={styles.subtitle}>Slug: {org.slug} • Creado el {format(new Date(org.createdAt), 'dd/MM/yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {org.slug !== 'system-plannerio' && (
            <PlanSelector orgId={org.id} initialPlan={org.plan} />
          )}
          <button className="btn btn-secondary">Editar Perfil</button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Usuarios Activos</h3>
            <p>{org._count.users}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.1)' }}>
            <BookOpen size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Reservas Históricas</h3>
            <p>{org._count.reservations}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)' }}>
            <Building2 size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Habitaciones</h3>
            <p>{org._count.rooms}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px', background: 'var(--surface-1)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-base)' }}>Asistente de Importación de Base de Datos</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
          Para migrar la base de datos de este cliente desde Excel, debes seguir estrictamente el orden a continuación para evitar errores de integridad referencial.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {importSteps.map((step, index) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {index + 1}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-base)' }}>{step.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <a href={`/api/saas/export-data?orgId=${org.id}&table=${step.id}&format=csv`} className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '8px 12px' }} title="Exportar datos actuales en CSV">
                  <Download size={16} />
                  Datos CSV
                </a>
                <a href={`/api/saas/export-data?orgId=${org.id}&table=${step.id}&format=json`} className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '8px 12px' }} title="Exportar datos actuales en JSON">
                  <Download size={16} />
                  Datos JSON
                </a>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-light)', margin: '0 4px' }} />
                <a href={`/api/saas/export-template?table=${step.id}`} className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '8px 12px' }} title="Descargar plantilla Excel en blanco">
                  <Download size={16} />
                  Plantilla Vacía
                </a>
                <Link href={`/saas/clientes/${org.id}/importar?table=${step.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                  <Upload size={16} />
                  Importar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
