'use client'

import { useState } from 'react'
import SetupPage from '@/components/setup/SetupPage'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const CATEGORIES = ['Alimentos', 'Servicios', 'Equipamiento', 'Otro']
const STANDARD_UNITS = ['por noche', 'por hora', 'por persona', 'por estadía', 'por día', 'unidad']
const ALL_SELECT_UNITS = [...STANDARD_UNITS, 'otro']

const empty = { name: '', category: 'Servicios', price: 0, unit: 'por noche', active: true }

export default function AmenitiesPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const onFormChange = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const isCustomUnit = !STANDARD_UNITS.includes(form.unit)
  const selectUnitValue = isCustomUnit ? 'otro' : form.unit

  const columns = [
    { key: 'name', label: 'Amenity / Servicio' },
    { key: 'category', label: 'Categoría', render: (r: any) => (
      <span style={{ fontSize: 11, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>{r.category ?? '—'}</span>
    )},
    { key: 'price', label: 'Precio', render: (r: any) => formatCLP(r.price) },
    { key: 'unit', label: 'Unidad', render: (r: any) => r.unit ?? '—' },
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Amenities"
      subtitle="Servicios e ítems adicionales cargables a la reserva"
      apiPath="amenities"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nuevo Amenity"
      formFields={
        <>
          <div className="form-group">
            <label className="form-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Ej: Leña, Desayuno, Mascota..." />
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="select" value={form.category} onChange={e => onFormChange('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Precio (CLP)</label>
            <input className="input" type="number" value={form.price} onChange={e => onFormChange('price', +e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Unidad</label>
            <select
              className="select"
              value={selectUnitValue}
              onChange={e => {
                const val = e.target.value
                onFormChange('unit', val)
              }}
            >
              {ALL_SELECT_UNITS.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {selectUnitValue === 'otro' && (
              <div style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Especificar unidad personalizada
                </label>
                <input
                  className="input"
                  value={form.unit === 'otro' ? '' : form.unit}
                  onChange={e => onFormChange('unit', e.target.value || 'otro')}
                  placeholder="Ej: por bloque, por viaje, carga..."
                  autoFocus
                />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Amenity activo
            </label>
          </div>
        </>
      }
    />
  )
}
