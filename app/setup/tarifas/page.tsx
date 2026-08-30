'use client'

import { useState, useEffect } from 'react'
import SetupPage from '@/components/setup/SetupPage'
import { 
  Calendar, 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Icon from '@/components/ui/Icon'
import toast from 'react-hot-toast'
import styles from './tarifas.module.css'

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

const emptyBaseRate = { 
  name: '', 
  unitTypeId: '', 
  rackRate: 0, 
  includedOccupants: 2, 
  extraPersonAdult: 0, 
  extraPersonChild: 0, 
  weekendSurcharge: 0, 
  active: true 
}

interface UnitType {
  id: string
  name: string
  maxOccupancy: number
}

interface SeasonRateForm {
  unitTypeId: string
  rackRate: number
  extraPersonAdult: number
  extraPersonChild: number
  weekendSurcharge: number
  includedOccupants: number
}

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  priority: number
  active: boolean
  rates: {
    id: string
    unitTypeId: string
    rackRate: number
    extraPersonAdult: number
    extraPersonChild: number
    weekendSurcharge: number
    includedOccupants: number
    unitType?: { id: string; name: string }
  }[]
}

export default function TarifasPage() {
  const [activeTab, setActiveTab] = useState<'seasons' | 'base'>('seasons')
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(true)

  // Season form state
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null)
  const [seasonName, setSeasonName] = useState('')
  const [seasonStartDate, setSeasonStartDate] = useState('')
  const [seasonEndDate, setSeasonEndDate] = useState('')
  const [seasonPriority, setSeasonPriority] = useState(0)
  const [seasonActive, setSeasonActive] = useState(true)
  const [seasonRates, setSeasonRates] = useState<Record<string, SeasonRateForm>>({})
  const [expandedUnitAdvanced, setExpandedUnitAdvanced] = useState<Record<string, boolean>>({})
  const [savingSeason, setSavingSeason] = useState(false)

  // Base rate form state (for Tab 2)
  const [baseRateForm, setBaseRateForm] = useState<any>({ ...emptyBaseRate })

  const fetchUnitTypes = async () => {
    try {
      const res = await fetch('/api/setup/unidades')
      if (res.ok) {
        const data = await res.json()
        setUnitTypes(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSeasons = async () => {
    setLoadingSeasons(true)
    try {
      const res = await fetch('/api/setup/temporadas')
      if (res.ok) {
        const data = await res.json()
        setSeasons(data)
      }
    } catch (e) {
      toast.error('Error al cargar temporadas')
      console.error(e)
    } finally {
      setLoadingSeasons(false)
    }
  }

  useEffect(() => {
    fetchUnitTypes()
    fetchSeasons()
  }, [])

  const handleOpenNewSeason = () => {
    setEditingSeasonId(null)
    setSeasonName('')
    setSeasonStartDate('')
    setSeasonEndDate('')
    setSeasonPriority(0)
    setSeasonActive(true)

    // Pre-populate unit types
    const initialRates: Record<string, SeasonRateForm> = {}
    unitTypes.forEach(u => {
      initialRates[u.id] = {
        unitTypeId: u.id,
        rackRate: 0,
        extraPersonAdult: 0,
        extraPersonChild: 0,
        weekendSurcharge: 0,
        includedOccupants: 2,
      }
    })
    setSeasonRates(initialRates)
    setShowSeasonForm(true)
  }

  const handleOpenEditSeason = (season: Season) => {
    setEditingSeasonId(season.id)
    setSeasonName(season.name)
    setSeasonStartDate(season.startDate)
    setSeasonEndDate(season.endDate)
    setSeasonPriority(season.priority || 0)
    setSeasonActive(season.active !== false)

    const initialRates: Record<string, SeasonRateForm> = {}
    unitTypes.forEach(u => {
      const existingRate = season.rates.find(r => r.unitTypeId === u.id)
      initialRates[u.id] = {
        unitTypeId: u.id,
        rackRate: existingRate?.rackRate || 0,
        extraPersonAdult: existingRate?.extraPersonAdult || 0,
        extraPersonChild: existingRate?.extraPersonChild || 0,
        weekendSurcharge: existingRate?.weekendSurcharge || 0,
        includedOccupants: existingRate?.includedOccupants || 2,
      }
    })
    setSeasonRates(initialRates)
    setShowSeasonForm(true)
  }

  const handleRateChange = (unitTypeId: string, field: keyof SeasonRateForm, value: number) => {
    setSeasonRates(prev => ({
      ...prev,
      [unitTypeId]: {
        ...prev[unitTypeId],
        unitTypeId,
        [field]: value,
      },
    }))
  }

  const toggleUnitAdvanced = (unitTypeId: string) => {
    setExpandedUnitAdvanced(prev => ({
      ...prev,
      [unitTypeId]: !prev[unitTypeId],
    }))
  }

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seasonName.trim()) {
      toast.error('El nombre de la temporada es obligatorio')
      return
    }
    if (!seasonStartDate || !seasonEndDate) {
      toast.error('Debe ingresar fecha de inicio y término')
      return
    }
    if (seasonStartDate > seasonEndDate) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de término')
      return
    }

    setSavingSeason(true)
    try {
      const payload = {
        name: seasonName.trim(),
        startDate: seasonStartDate,
        endDate: seasonEndDate,
        priority: Number(seasonPriority) || 0,
        active: seasonActive,
        rates: Object.values(seasonRates),
      }

      const url = editingSeasonId ? `/api/setup/temporadas/${editingSeasonId}` : '/api/setup/temporadas'
      const method = editingSeasonId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar la temporada')
      }

      toast.success(editingSeasonId ? 'Temporada actualizada' : 'Temporada creada exitosamente')
      setShowSeasonForm(false)
      fetchSeasons()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar temporada')
    } finally {
      setSavingSeason(false)
    }
  }

  const handleDeleteSeason = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar la temporada "${name}"?`)) return
    try {
      const res = await fetch(`/api/setup/temporadas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Temporada eliminada')
      fetchSeasons()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar la temporada')
    }
  }

  // Base rate helpers (Tab 2)
  const onBaseRateChange = (field: string, value: any) => setBaseRateForm((f: any) => ({ ...f, [field]: value }))

  const baseRateColumns = [
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Gestión de Tarifas y Temporadas</h1>
          <p className="page-subtitle">Configure temporadas personalizadas con precios por unidad y tarifas base por defecto</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'seasons' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('seasons')}
        >
          <Icon icon={Calendar} size="md" />
          Temporadas & Tarifas por Unidad
          <span className={styles.tabBadge}>{seasons.length}</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'base' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('base')}
        >
          <Icon icon={DollarSign} size="md" />
          Tarifas Base por Defecto
        </button>
      </div>

      {/* TAB 1: TEMPORADAS */}
      {activeTab === 'seasons' && (
        <div>
          {/* Action Bar */}
          {!showSeasonForm && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                <Icon icon={Info} size="sm" />
                <span>Las temporadas activas aplican automáticamente según la fecha de cada noche en el Planner y Motor Público.</span>
              </div>
              <button className="btn btn-primary" onClick={handleOpenNewSeason} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon={Plus} size="md" /> Nueva Temporada
              </button>
            </div>
          )}

          {/* Form Panel (Create / Edit Season) */}
          {showSeasonForm && (
            <form onSubmit={handleSaveSeason} className={styles.seasonFormPanel}>
              <div className={styles.formSectionTitle}>
                <Icon icon={Calendar} size="md" />
                {editingSeasonId ? 'Editar Temporada' : 'Crear Nueva Temporada'}
              </div>

              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label required">Nombre de la Temporada</label>
                  <input
                    className="input"
                    value={seasonName}
                    onChange={e => setSeasonName(e.target.value)}
                    placeholder="Ej: Temporada Alta Verano, Temporada Baja, Feriados"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Fecha Desde</label>
                  <input
                    className="input"
                    type="date"
                    value={seasonStartDate}
                    onChange={e => setSeasonStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Fecha Hasta</label>
                  <input
                    className="input"
                    type="date"
                    value={seasonEndDate}
                    onChange={e => setSeasonEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prioridad</label>
                  <input
                    className="input"
                    type="number"
                    value={seasonPriority}
                    onChange={e => setSeasonPriority(+e.target.value)}
                    title="Mayor número tiene prioridad en caso de solapamiento de fechas"
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={seasonActive}
                      onChange={e => setSeasonActive(e.target.checked)}
                      style={{ accentColor: 'var(--brand-500)' }}
                    />
                    Temporada Activa
                  </label>
                </div>
              </div>

              {/* Matrix of Unit Types */}
              <div style={{ marginTop: 20 }}>
                <div className={styles.formSectionTitle}>
                  <Icon icon={Layers} size="md" />
                  Tarifas por Unidad para esta Temporada
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Establezca el valor por noche para cada tipo de alojamiento durante esta temporada.
                </p>

                <div className={styles.unitPricingMatrix}>
                  {unitTypes.map(unit => {
                    const rate = seasonRates[unit.id] || {
                      unitTypeId: unit.id,
                      rackRate: 0,
                      extraPersonAdult: 0,
                      extraPersonChild: 0,
                      weekendSurcharge: 0,
                      includedOccupants: 2,
                    }
                    const isAdvancedOpen = Boolean(expandedUnitAdvanced[unit.id])

                    return (
                      <div key={unit.id} className={styles.matrixCard}>
                        <div className={styles.matrixCardHeader}>
                          <div>
                            <h4 className={styles.matrixCardTitle}>{unit.name}</h4>
                            <span className={styles.matrixCardSub}>Máx. {unit.maxOccupancy} personas</span>
                          </div>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label required" style={{ fontSize: 12 }}>Tarifa por Noche (CLP)</label>
                          <input
                            className="input"
                            type="number"
                            value={rate.rackRate || ''}
                            onChange={e => handleRateChange(unit.id, 'rackRate', +e.target.value)}
                            placeholder="Ej: 95000"
                            min={0}
                            style={{ fontWeight: 700, color: 'var(--brand-500)', fontSize: 14 }}
                          />
                        </div>

                        {/* Collapsible advanced fields */}
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleUnitAdvanced(unit.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: 0,
                              marginTop: 4,
                            }}
                          >
                            <Icon icon={isAdvancedOpen ? ChevronUp : ChevronDown} size="xs" />
                            {isAdvancedOpen ? 'Ocultar extras' : 'Extras y recargos'}
                          </button>

                          {isAdvancedOpen && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border-light)' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 10 }}>Ocup. Base</label>
                                <input
                                  className="input"
                                  type="number"
                                  value={rate.includedOccupants}
                                  onChange={e => handleRateChange(unit.id, 'includedOccupants', +e.target.value)}
                                  min={1}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 10 }}>Recargo Finde</label>
                                <input
                                  className="input"
                                  type="number"
                                  value={rate.weekendSurcharge}
                                  onChange={e => handleRateChange(unit.id, 'weekendSurcharge', +e.target.value)}
                                  min={0}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 10 }}>Extra Adulto</label>
                                <input
                                  className="input"
                                  type="number"
                                  value={rate.extraPersonAdult}
                                  onChange={e => handleRateChange(unit.id, 'extraPersonAdult', +e.target.value)}
                                  min={0}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                />
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 10 }}>Extra Niño</label>
                                <input
                                  className="input"
                                  type="number"
                                  value={rate.extraPersonChild}
                                  onChange={e => handleRateChange(unit.id, 'extraPersonChild', +e.target.value)}
                                  min={0}
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className={styles.formActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSeasonForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingSeason}>
                  {savingSeason ? 'Guardando...' : (editingSeasonId ? 'Actualizar Temporada' : 'Crear Temporada')}
                </button>
              </div>
            </form>
          )}

          {/* Seasons List */}
          {loadingSeasons ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              Cargando temporadas...
            </div>
          ) : seasons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, background: 'var(--surface-1)', borderRadius: 12, border: '1px dashed var(--border-light)' }}>
              <Icon icon={Calendar} size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0' }}>No hay temporadas configuradas</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Crea tu primera temporada (ej. Temporada Alta, Baja, Feriados) para definir tarifas diferenciadas por fecha.
              </p>
              <button className="btn btn-primary" onClick={handleOpenNewSeason}>
                <Icon icon={Plus} size="sm" /> Crear Temporada
              </button>
            </div>
          ) : (
            <div>
              {seasons.map(season => {
                return (
                  <div key={season.id} className={styles.seasonCard}>
                    <div className={styles.seasonHeader}>
                      <div className={styles.seasonHeaderLeft}>
                        <h3 className={styles.seasonTitle}>{season.name}</h3>
                        <div className={styles.dateBadge}>
                          <Icon icon={Calendar} size="xs" />
                          <span>{season.startDate} al {season.endDate}</span>
                        </div>
                        {season.priority > 0 && (
                          <span className={styles.priorityBadge}>Prioridad {season.priority}</span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: season.active ? 'var(--success)' : 'var(--text-muted)' }}>
                          <Icon icon={season.active ? CheckCircle2 : XCircle} size="xs" />
                          {season.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEditSeason(season)}
                          title="Editar Temporada"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icon icon={Edit2} size="xs" /> Editar
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteSeason(season.id, season.name)}
                          title="Eliminar Temporada"
                          style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icon icon={Trash2} size="xs" /> Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Unit Rates Summary */}
                    <div className={styles.ratesGrid}>
                      {season.rates && season.rates.length > 0 ? (
                        season.rates.map(rate => (
                          <div key={rate.id} className={styles.unitRateBox}>
                            <span className={styles.unitName}>{rate.unitType?.name || 'Unidad'}</span>
                            <span className={styles.unitRackRate}>{formatCLP(rate.rackRate)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>/ noche</span></span>
                            {(rate.extraPersonAdult > 0 || rate.weekendSurcharge > 0) && (
                              <span className={styles.unitMeta}>
                                {rate.extraPersonAdult > 0 ? `+${formatCLP(rate.extraPersonAdult)} ad.` : ''} 
                                {rate.weekendSurcharge > 0 ? ` · +${formatCLP(rate.weekendSurcharge)} finde` : ''}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sin tarifas asignadas</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TARIFAS BASE POR DEFECTO */}
      {activeTab === 'base' && (
        <SetupPage
          title=""
          subtitle="Tarifas aplicadas por defecto cuando una estadía no coincide con ninguna temporada"
          apiPath="tarifas"
          columns={baseRateColumns as any}
          formData={baseRateForm}
          emptyForm={emptyBaseRate}
          onFormChange={onBaseRateChange}
          newButtonLabel="Nueva Tarifa Base"
          formFields={
            <>
              <div className="form-group">
                <label className="form-label required">Nombre</label>
                <input className="input" value={baseRateForm.name} onChange={e => onBaseRateChange('name', e.target.value)} placeholder="Ej: Tarifa Base 5P" />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Unidad</label>
                <select className="select" value={baseRateForm.unitTypeId} onChange={e => onBaseRateChange('unitTypeId', e.target.value)}>
                  <option value="">— Todas las unidades —</option>
                  {unitTypes.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Tarifa Rack (CLP/noche)</label>
                <input className="input" type="number" value={baseRateForm.rackRate} onChange={e => onBaseRateChange('rackRate', +e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Ocupantes Incluidos</label>
                <input className="input" type="number" value={baseRateForm.includedOccupants} onChange={e => onBaseRateChange('includedOccupants', +e.target.value)} min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Extra por Adulto</label>
                <input className="input" type="number" value={baseRateForm.extraPersonAdult} onChange={e => onBaseRateChange('extraPersonAdult', +e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Extra por Niño</label>
                <input className="input" type="number" value={baseRateForm.extraPersonChild} onChange={e => onBaseRateChange('extraPersonChild', +e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Recargo Fin de Semana</label>
                <input className="input" type="number" value={baseRateForm.weekendSurcharge} onChange={e => onBaseRateChange('weekendSurcharge', +e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={baseRateForm.active} onChange={e => onBaseRateChange('active', e.target.checked)} style={{ accentColor: 'var(--brand-500)' }} />
                  Tarifa activa
                </label>
              </div>
            </>
          }
        />
      )}
    </div>
  )
}
