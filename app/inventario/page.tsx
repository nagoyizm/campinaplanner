import { requireOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { Package, DollarSign, ArrowDownRight } from 'lucide-react'
import Icon from '@/components/ui/Icon'
import InventoryClient from './InventoryClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const { organizationId, role } = await requireOrg()
  
  if (role !== 'admin' && role !== 'superadmin') {
    redirect('/dashboard') // Only admins can see inventory
  }

  const items = await prisma.inventoryItem.findMany({
    where: { organizationId, active: true },
    orderBy: { name: 'asc' }
  })

  // Estadísticas Rápidas
  const totalValue = items.reduce((acc, item) => acc + (item.currentQuantity * item.unitCost), 0)
  const lowStockCount = items.filter(i => i.currentQuantity <= i.minQuantity).length
  const totalItems = items.length

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Package} size="2xl" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-base)', margin: 0 }}>Gestión de Inventario</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Control de productos, costos y existencias.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface-1)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Icon icon={DollarSign} size="lg" color="var(--success)" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Valor Total en Stock</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-base)' }}>
            ${totalValue.toLocaleString('es-CL')}
          </span>
        </div>

        <div style={{ background: 'var(--surface-1)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Icon icon={Package} size="lg" color="var(--brand-500)" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Productos Registrados</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-base)' }}>
            {totalItems}
          </span>
        </div>

        <div style={{ background: lowStockCount > 0 ? 'var(--danger-bg)' : 'var(--surface-1)', padding: '20px', borderRadius: '12px', border: lowStockCount > 0 ? '1px solid color-mix(in srgb, var(--danger) 35%, transparent)' : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Icon icon={ArrowDownRight} size="lg" color={lowStockCount > 0 ? 'var(--danger)' : 'var(--neutral)'} />
            <span style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Alertas de Stock Bajo</span>
          </div>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: lowStockCount > 0 ? 'var(--danger)' : 'var(--text-base)' }}>
            {lowStockCount}
          </span>
        </div>
      </div>

      <InventoryClient items={items} />
    </div>
  )
}
