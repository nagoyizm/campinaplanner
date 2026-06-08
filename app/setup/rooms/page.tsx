'use client'

import { useState, useEffect } from 'react'
import SetupPage from '@/components/setup/SetupPage'

const empty = { code: '', name: '', unitTypeId: '', defaultRateId: '', sortOrder: 0, active: true }

export default function RoomsSetupPage() {
  const [form, setForm] = useState<any>({ ...empty })
  const [unitTypes, setUnitTypes] = useState<any[]>([])
  const [rates, setRates] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/setup/unidades').then(r => r.json()).then(setUnitTypes).catch(() => {})
    fetch('/api/setup/tarifas').then(r => r.json()).then(d => setRates(d.filter((r: any) => r.active))).catch(() => {})
  }, [])

  const onFormChange = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const columns = [
    { key: 'code', label: 'Código', render: (r: any) => <strong style={{ color: 'var(--brand-500)' }}>{r.code}</strong> },
    { key: 'name', label: 'Nombre' },
    { key: 'unitType', label: 'Tipo', render: (r: any) => r.unitType?.name ?? '—' },
    { key: 'defaultRate', label: 'Tarifa Default', render: (r: any) => r.defaultRate?.name ?? '(ninguna)' },
    { key: 'sortOrder', label: 'Orden' },
    { key: 'active', label: 'Estado' },
  ]

  return (
    <SetupPage
      title="Setup — Habitaciones"
      subtitle="Configuración de cabañas y suites del recinto"
      apiPath="rooms"
      columns={columns as any}
      formData={form}
      emptyForm={empty}
      onFormChange={onFormChange}
      newButtonLabel="Nueva Habitación"
      formFields={
        <>
          <div className="form-group">
            <label className="form-label required">Código</label>
            <input className="input" value={form.code} onChange={e => onFormChange('code', e.target.value.toUpperCase())} placeholder="CAB-01" maxLength={10} />
          </div>
          <div className="form-group">
            <label className="form-label required">Nombre</label>
            <input className="input" value={form.name} onChange={e => onFormChange('name', e.target.value)} placeholder="Cabaña Alamo" />
          </div>
          <div className="form-group">
            <label className="form-label required">Tipo de Unidad</label>
            <select className="select" value={form.unitTypeId} onChange={e => onFormChange('unitTypeId', e.target.value)}>
              <option value="">Seleccionar...</option>
              {unitTypes.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tarifa por Defecto</label>
            <select className="select" value={form.defaultRateId} onChange={e => onFormChange('defaultRateId', e.target.value)}>
              <option value="">(ninguna)</option>
              {rates.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Orden</label>
            <input className="input" type="number" value={form.sortOrder} onChange={e => onFormChange('sortOrder', +e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => onFormChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
              Habitación activa
            </label>
          </div>
        </>
      }
    />
  )
}
