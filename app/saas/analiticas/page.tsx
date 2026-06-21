import { requireSuperAdmin } from '@/lib/org'
import styles from '../saas.module.css'
import { LineChart as ChartIcon, Construction } from 'lucide-react'

export default async function SaasAnaliticasPage() {
  await requireSuperAdmin()

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analíticas Comerciales</h1>
          <p className={styles.subtitle}>Métricas globales de la plataforma SaaS</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
        <Construction size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h2>Analíticas en Construcción</h2>
        <p>Aquí mostraremos gráficos de ingresos recurrentes, nuevos clientes y uso del sistema.</p>
      </div>
    </div>
  )
}
