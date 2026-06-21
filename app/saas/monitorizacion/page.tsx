import { requireSuperAdmin } from '@/lib/org'
import styles from '../saas.module.css'
import { ShieldAlert, Construction } from 'lucide-react'

export default async function SaasMonitorizacionPage() {
  await requireSuperAdmin()

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Monitorización</h1>
          <p className={styles.subtitle}>Salud del sistema y logs globales</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
        <Construction size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h2>Monitorización en Construcción</h2>
        <p>Aquí podrás ver registros de errores técnicos o actividades globales sospechosas.</p>
      </div>
    </div>
  )
}
