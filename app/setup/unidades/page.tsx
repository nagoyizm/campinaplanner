'use client'

import { useState } from 'react'
import SetupPage from '@/components/setup/SetupPage'

const empty = { name: '', description: '', maxOccupancy: 2, sortOrder: 0, active: true }

export default function UnidadesPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const onFormChange = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const columns = [
    { key: 'name', label: 'Nombre Tipo' },
    { key: 'description', label: 'Descripción', render: (r: any) => r.description || '—' },
    { key: 'maxOccupancy', label: 'Ocup. Máxima' },
    { key: 'sortOrder', label: 'Orden' },
    { key: '_count', label: 'Habitaciones', render: (r: any) => r._count?.rooms ?? 0 },
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Tipos de Unidad"
      subtitle="Configuración de categorías: Cabaña 5P, Cabaña 7P, Suite, etc."
      apiPath="unidades"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nuevo Tipo"
      formFields={
        <>
          <div className="form-group">
            <label className="form-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Ej: Cabaña 5 Personas" />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input className="input" value={form.description} onChange={e => onFormChange('description', e.target.value)} placeholder="Descripción breve..." />
          </div>
          <div className="form-group">
            <label className="form-label">Ocupación Máxima</label>
            <input className="input" type="number" value={form.maxOccupancy} onChange={e => onFormChange('maxOccupancy', +e.target.value)} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label">Orden de Visualización</label>
            <input className="input" type="number" value={form.sortOrder} onChange={e => onFormChange('sortOrder', +e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Tipo activo
            </label>
          </div>
        </>
      }
    />
  )
}
