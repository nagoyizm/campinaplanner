'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function PlanSelector({ orgId, initialPlan }: { orgId: string, initialPlan: string }) {
  const [plan, setPlan] = useState(initialPlan)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePlanChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value
    setPlan(newPlan)
    setLoading(true)
    
    try {
      const res = await fetch(`/api/saas/clientes/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      })

      if (!res.ok) throw new Error('Error al actualizar plan')
      toast.success('Plan actualizado correctamente')
      router.refresh()
    } catch (err) {
      toast.error('Error al actualizar el plan')
      setPlan(initialPlan) // Revert on failure
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Suscripción:</label>
      <select 
        value={plan}
        onChange={handlePlanChange}
        disabled={loading}
        className="select"
        style={{ padding: '6px 24px 6px 12px', fontSize: '0.85rem', height: 'auto', background: 'var(--surface-1)' }}
      >
        <option value="starter">Básica (Starter)</option>
        <option value="avanzada">Avanzada</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
      </select>
    </div>
  )
}
