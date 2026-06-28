import { requireOrg } from '@/lib/org'
import { redirect } from 'next/navigation'
import PagosClient from './PagosClient'

export const dynamic = 'force-dynamic'

export default async function PagosPage() {
  const { role } = await requireOrg()
  if (role !== 'admin' && role !== 'superadmin') {
    redirect('/dashboard')
  }

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Configuración de Pagos y Facturación</h1>
      <PagosClient />
    </div>
  )
}
