'use client'

import { useState, useEffect } from 'react'
import SetupPage from '@/components/setup/SetupPage'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

const empty = { name: '', unitTypeId: '', rackRate: 0, includedOccupants: 2, extraPersonAdult: 0, extraPersonChild: 0, weekendSurcharge: 0, active: true }

export default function TarifasPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const [unitTypes, setUnitTypes] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/setup/unidades').then(r => r.json()).then(setUnitTypes).catch(() => {})
  }, [])

  const onFormChange = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const columns = [
    { key: 'name', label: 'Nombre Tarifa' },
    { key: 'unitType', label: 'Tipo Unidad', render: (r: any) => r.unitType?.name ?? '(Todas)' },
    { key: 'rackRate', label: 'Tarifa Rack', render: (r: any) => formatCLP(r.rackRate), className: 'currency' },
    { key: 'includedOccupants', label: 'Ocup. Incluidos' },
    { key: 'extraPersonAdult', label: 'Extra Adulto', render: (r: any) => formatCLP(r.extraPersonAdult) },
    { key: 'extraPersonChild', label: 'Extra Niño', render: (r: any) => formatCLP(r.extraPersonChild) },
    { key: 'weekendSurcharge', label: 'Recargo Finde', render: (r: any) => formatCLP(r.weekendSurcharge) },
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Tarifas"
      subtitle="Gestión de planes de precios y tarifas por tipo de unidad"
      apiPath="tarifas"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nueva Tarifa"
      formFields={
        <>
          <div className="form-group">
            <label className="form-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Ej: Temporada Alta 5P" />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Unidad</label>
            <select className="select" value={form.unitTypeId} onChange={e => onFormChange('unitTypeId', e.target.value)}>
              <option value="">— Todas las unidades —</option>
              {unitTypes.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Tarifa Rack (CLP/noche)</label>
            <input className="input" type="number" value={form.rackRate} onChange={e => onFormChange('rackRate', +e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Ocupantes Incluidos</label>
            <input className="input" type="number" value={form.includedOccupants} onChange={e => onFormChange('includedOccupants', +e.target.value)} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label">Extra por Adulto</label>
            <input className="input" type="number" value={form.extraPersonAdult} onChange={e => onFormChange('extraPersonAdult', +e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Extra por Niño</label>
            <input className="input" type="number" value={form.extraPersonChild} onChange={e => onFormChange('extraPersonChild', +e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Recargo Fin de Semana</label>
            <input className="input" type="number" value={form.weekendSurcharge} onChange={e => onFormChange('weekendSurcharge', +e.target.value)} min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Tarifa activa
            </label>
          </div>
        </>
      }
    />
  )
}
