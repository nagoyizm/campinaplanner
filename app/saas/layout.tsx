import { requireSuperAdmin } from '@/lib/org'
import AppLayout from '@/components/layout/AppLayout'
import styles from './saas.module.css'

export default async function SaasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect all SaaS routes globally
  await requireSuperAdmin()

  return (
    <AppLayout title="Panel SaaS">
      <div className={styles.saasLayout}>
        <div className={styles.saasHeader}>
          <div className={styles.warningBanner}>
            <strong>Modo SuperAdmin:</strong> Tienes acceso global a todas las configuraciones. Ten cuidado con los cambios que realices.
          </div>
        </div>
        <div className={styles.saasContent}>
          {children}
        </div>
      </div>
    </AppLayout>
  )
}

