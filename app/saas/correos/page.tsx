'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Mail, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Edit3, Save, X, UserCheck, Search, Filter, Users, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import styles from './correos.module.css'

interface SaasEmail {
  id: string
  to: string
  recipientAlias?: string | null
  region?: string | null
  subject: string
  bodyHtml: string
  status: string
  resendId: string | null
  sentAt: string
}

interface SignatureConfig {
  name: string
  role: string
  web: string
  email: string
  logoUrl: string
}

interface SaasLead {
  email: string
  alias?: string | null
  region?: string | null
  serviceStatus: 'pending' | 'accepted' | 'rejected' | string
}

interface RecipientSummary {
  email: string
  alias?: string | null
  region?: string | null
  count: number
  lastSentAt: string
  lastStatus: string
  serviceStatus: 'pending' | 'accepted' | 'rejected' | string
}

const DEFAULT_SIGNATURE: SignatureConfig = {
  name: 'Andrés Vega',
  role: 'Fundador Agendio',
  web: 'https://agendio.cl',
  email: 'contacto@agendio.cl',
  logoUrl: '/logo-habita-round.png',
}

function getLogoSrc(url?: string | null): string {
  if (!url || url.includes('agendio.cl/logo-habita-round.png')) return '/logo-habita-round.png'
  return url
}

export default function CorreosPage() {
  const [to, setTo] = useState('')
  const [recipientAlias, setRecipientAlias] = useState('')
  const [region, setRegion] = useState('Algarrobo')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Signature management state
  const [signature, setSignature] = useState<SignatureConfig>(DEFAULT_SIGNATURE)
  const [editingSignature, setEditingSignature] = useState(false)
  const [sigForm, setSigForm] = useState<SignatureConfig>(DEFAULT_SIGNATURE)
  const [savingSig, setSavingSig] = useState(false)
  const [sigFeedback, setSigFeedback] = useState<string | null>(null)

  // Navigation & Filtering state
  const [activeTab, setActiveTab] = useState<'history' | 'recipients'>('history')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [filterRecipient, setFilterRecipient] = useState<string | null>(null)

  // Email history & leads state
  const [emails, setEmails] = useState<SaasEmail[]>([])
  const [leadsMap, setLeadsMap] = useState<Record<string, SaasLead>>({})
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const composeCardRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  async function loadData() {
    setLoadingEmails(true)
    try {
      const [resEmails, resLeads] = await Promise.all([
        fetch('/api/saas/emails'),
        fetch('/api/saas/leads'),
      ])

      if (resEmails.ok) {
        const data = await resEmails.json()
        setEmails(data)
      }

      if (resLeads.ok) {
        const leadsData: SaasLead[] = await resLeads.json()
        const map: Record<string, SaasLead> = {}
        leadsData.forEach(l => {
          map[l.email.toLowerCase()] = l
        })
        setLeadsMap(map)
      }
    } finally {
      setLoadingEmails(false)
    }
  }

  async function loadSignature() {
    try {
      const res = await fetch('/api/saas/config')
      if (res.ok) {
        const data = await res.json()
        if (data.signature) {
          setSignature(data.signature)
          setSigForm(data.signature)
        }
      }
    } catch (e) {
      console.error('Error loading signature:', e)
    }
  }

  useEffect(() => {
    loadData()
    loadSignature()
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!to || !subject || !message) return
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/saas/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, recipientAlias, region, subject, message }),
      })
      if (res.ok) {
        setFeedback({ type: 'success', text: `Correo enviado exitosamente a ${recipientAlias ? `${recipientAlias} (${to})` : to}` })
        setTo('')
        setRecipientAlias('')
        setSubject('')
        setMessage('')
        await loadData()
      } else {
        const data = await res.json()
        setFeedback({ type: 'error', text: data.error ?? 'Error al enviar el correo.' })
      }
    } catch {
      setFeedback({ type: 'error', text: 'Error de red. Verifica tu conexión.' })
    } finally {
      setSending(false)
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    }
  }

  async function handleSaveSignature(e: React.FormEvent) {
    e.preventDefault()
    setSavingSig(true)
    setSigFeedback(null)
    try {
      const res = await fetch('/api/saas/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: sigForm }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.signature) {
          setSignature(data.signature)
          setSigForm(data.signature)
        }
        setEditingSignature(false)
        setSigFeedback('Firma guardada correctamente')
        setTimeout(() => setSigFeedback(null), 3000)
      } else {
        setSigFeedback('Error al guardar firma')
      }
    } catch {
      setSigFeedback('Error de conexión')
    } finally {
      setSavingSig(false)
    }
  }

  async function handleUpdateLead(email: string, alias: string | null | undefined, newRegion: string | null | undefined, newStatus: string) {
    const key = email.toLowerCase().trim()
    const updatedRegion = newRegion || 'Algarrobo'
    setLeadsMap(prev => ({
      ...prev,
      [key]: { ...prev[key], email, alias, region: updatedRegion, serviceStatus: newStatus }
    }))

    try {
      await fetch('/api/saas/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, alias, region: updatedRegion, serviceStatus: newStatus }),
      })
    } catch (e) {
      console.error('Error updating lead status/region:', e)
    }
  }

  // Calculate unique recipients directory
  const recipientsMap = new Map<string, RecipientSummary>()
  emails.forEach(e => {
    const key = e.to.toLowerCase().trim()
    const lead = leadsMap[key]
    const currentStatus = lead?.serviceStatus || 'pending'
    const currentAlias = lead?.alias || e.recipientAlias
    const currentRegion = lead?.region || e.region || 'Algarrobo'

    const existing = recipientsMap.get(key)
    if (!existing) {
      recipientsMap.set(key, {
        email: e.to,
        alias: currentAlias,
        region: currentRegion,
        count: 1,
        lastSentAt: e.sentAt,
        lastStatus: e.status,
        serviceStatus: currentStatus,
      })
    } else {
      existing.count += 1
      if (!existing.alias && currentAlias) {
        existing.alias = currentAlias
      }
      if (currentRegion) {
        existing.region = currentRegion
      }
      existing.serviceStatus = currentStatus
    }
  })

  const recipientsList = Array.from(recipientsMap.values())

  // Unique list of regions for filter dropdown
  const uniqueRegions = Array.from(new Set(recipientsList.map(r => r.region || 'Algarrobo').concat(['Algarrobo'])))

  // Filter recipients based on search query, status filter, and region filter
  const filteredRecipients = recipientsList.filter(r => {
    if (statusFilter !== 'all' && r.serviceStatus !== statusFilter) return false
    if (regionFilter !== 'all' && (r.region || 'Algarrobo').toLowerCase() !== regionFilter.toLowerCase()) return false
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      r.email.toLowerCase().includes(q) ||
      (r.alias && r.alias.toLowerCase().includes(q)) ||
      (r.region && r.region.toLowerCase().includes(q))
    )
  })

  // Filter email history based on search query, recipient filter, or region filter
  const filteredEmails = emails.filter(e => {
    if (filterRecipient && e.to.toLowerCase() !== filterRecipient.toLowerCase()) {
      return false
    }
    const lead = leadsMap[e.to.toLowerCase().trim()]
    const emailRegion = lead?.region || e.region || 'Algarrobo'
    if (regionFilter !== 'all' && emailRegion.toLowerCase() !== regionFilter.toLowerCase()) {
      return false
    }

    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      e.to.toLowerCase().includes(q) ||
      (e.recipientAlias && e.recipientAlias.toLowerCase().includes(q)) ||
      (emailRegion && emailRegion.toLowerCase().includes(q)) ||
      e.subject.toLowerCase().includes(q)
    )
  })

  const sentCount = emails.filter(e => e.status === 'sent').length
  const failedCount = emails.filter(e => e.status === 'failed').length

  const handleComposeTo = (targetEmail: string, targetAlias?: string | null, targetRegion?: string | null) => {
    setTo(targetEmail)
    setRecipientAlias(targetAlias || '')
    if (targetRegion) setRegion(targetRegion)
    composeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Correos</h1>
          <p className={styles.subtitle}>Envía correos desde contacto@agendio.cl y gestiona el historial</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setSigForm(signature)
            setEditingSignature(!editingSignature)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Edit3 size={16} />
          {editingSignature ? 'Cerrar Edición de Firma' : 'Editar Firma de Correo'}
        </button>
      </div>

      {/* Signature Editor Modal / Drawer */}
      {editingSignature && (
        <div className={styles.card} style={{ borderColor: 'var(--brand-500)' }}>
          <div className={styles.cardHeader} style={{ background: 'rgba(22, 163, 74, 0.08)' }}>
            <Edit3 size={18} style={{ color: '#16a34a' }} />
            <h2 className={styles.cardTitle} style={{ color: '#16a34a' }}>Editar Firma de Correo</h2>
            <button
              className={styles.refreshBtn}
              onClick={() => setEditingSignature(false)}
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSaveSignature} className={styles.form}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sig-name">Nombre</label>
                <input
                  id="sig-name"
                  type="text"
                  className={styles.input}
                  value={sigForm.name}
                  onChange={e => setSigForm({ ...sigForm, name: e.target.value })}
                  placeholder="ej: Andrés Vega"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sig-role">Cargo / Título</label>
                <input
                  id="sig-role"
                  type="text"
                  className={styles.input}
                  value={sigForm.role}
                  onChange={e => setSigForm({ ...sigForm, role: e.target.value })}
                  placeholder="ej: Fundador Agendio"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sig-web">Sitio Web</label>
                <input
                  id="sig-web"
                  type="text"
                  className={styles.input}
                  value={sigForm.web}
                  onChange={e => setSigForm({ ...sigForm, web: e.target.value })}
                  placeholder="ej: https://agendio.cl"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sig-email">Email en Firma</label>
                <input
                  id="sig-email"
                  type="email"
                  className={styles.input}
                  value={sigForm.email}
                  onChange={e => setSigForm({ ...sigForm, email: e.target.value })}
                  placeholder="ej: contacto@agendio.cl"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="sig-logo">URL del Logo (Opcional)</label>
              <input
                id="sig-logo"
                type="text"
                className={styles.input}
                value={sigForm.logoUrl}
                onChange={e => setSigForm({ ...sigForm, logoUrl: e.target.value })}
                placeholder="ej: https://agendio.cl/logo-habita-round.png"
              />
            </div>

            {/* Live Preview of Signature */}
            <div className={styles.signaturePreview}>
              <p className={styles.signatureLabel}>Vista previa de la firma actual:</p>
              <div className={styles.signature}>
                <img
                  src={getLogoSrc(sigForm.logoUrl)}
                  alt="Logo"
                  className={styles.signatureLogo}
                  onError={(e) => { e.currentTarget.src = '/logo-habita-round.png' }}
                />
                <div className={styles.signatureText}>
                  <p className={styles.signatureName}>{sigForm.name || 'Tu Nombre'}</p>
                  <p className={styles.signatureRole}>{sigForm.role || 'Tu Cargo'}</p>
                  {sigForm.web && <p className={styles.signatureLink}>🌐 {sigForm.web}</p>}
                  {sigForm.email && <p className={styles.signatureLink}>✉ {sigForm.email}</p>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingSignature(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingSig}
              >
                {savingSig ? <RefreshCw size={16} className={styles.spinning} /> : <Save size={16} />}
                Guardar Firma
              </button>
            </div>
          </form>
        </div>
      )}

      {sigFeedback && (
        <div className={styles.alertSuccess}>
          <CheckCircle size={16} />
          {sigFeedback}
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div
          className={`${styles.statCardClickable} ${activeTab === 'history' && !filterRecipient ? styles.statCardActive : ''}`}
          onClick={() => {
            setActiveTab('history')
            setFilterRecipient(null)
          }}
          title="Ver todos los correos enviados"
        >
          <Mail size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{emails.length}</p>
            <p className={styles.statLabel}>Correos enviados</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <CheckCircle size={20} className={styles.statIconGreen} />
          <div>
            <p className={styles.statValue}>{sentCount}</p>
            <p className={styles.statLabel}>Entregados</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <XCircle size={20} className={styles.statIconRed} />
          <div>
            <p className={styles.statValue}>{failedCount}</p>
            <p className={styles.statLabel}>Fallidos</p>
          </div>
        </div>

        <div
          className={`${styles.statCardClickable} ${activeTab === 'recipients' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('recipients')}
          title="Ver directorio de destinatarios únicos con estado y región"
        >
          <UserCheck size={20} className={styles.statIconBlue} />
          <div>
            <p className={styles.statValue}>{recipientsList.length}</p>
            <p className={styles.statLabel}>Destinatarios únicos</p>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Compose form */}
        <div className={styles.card} ref={composeCardRef}>
          <div className={styles.cardHeader}>
            <Send size={18} />
            <h2 className={styles.cardTitle}>Nuevo correo</h2>
          </div>
          <form onSubmit={handleSend} className={styles.form}>
            <div className={styles.fromBadge}>
              <span className={styles.fromLabel}>De:</span>
              <span className={styles.fromValue}>Contacto Agendio &lt;contacto@agendio.cl&gt;</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email-to">Para (Email)</label>
                <input
                  id="email-to"
                  type="email"
                  className={styles.input}
                  placeholder="destinatario@ejemplo.com"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email-alias">Alias / Nombre (Opcional)</label>
                <input
                  id="email-alias"
                  type="text"
                  className={styles.input}
                  placeholder="ej: Cabañas Don Pedro / Juan"
                  value={recipientAlias}
                  onChange={e => setRecipientAlias(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email-region">Región / Comuna</label>
              <input
                id="email-region"
                type="text"
                className={styles.input}
                placeholder="ej: Algarrobo, El Quisco, Viña del Mar"
                value={region}
                onChange={e => setRegion(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email-subject">Asunto</label>
              <input
                id="email-subject"
                type="text"
                className={styles.input}
                placeholder="Asunto del correo"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email-message">Mensaje</label>
              <textarea
                id="email-message"
                className={styles.textarea}
                placeholder="Escribe tu mensaje aquí..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={8}
                required
              />
            </div>

            {/* Signature preview */}
            <div className={styles.signaturePreview}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p className={styles.signatureLabel} style={{ margin: 0 }}>Firma adjunta automáticamente:</p>
                <button
                  type="button"
                  onClick={() => setEditingSignature(!editingSignature)}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-500)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                >
                  <Edit3 size={12} /> Editar
                </button>
              </div>
              <div className={styles.signature}>
                <img
                  src={getLogoSrc(signature.logoUrl)}
                  alt="Logo"
                  className={styles.signatureLogo}
                  onError={(e) => { e.currentTarget.src = '/logo-habita-round.png' }}
                />
                <div className={styles.signatureText}>
                  <p className={styles.signatureName}>{signature.name}</p>
                  <p className={styles.signatureRole}>{signature.role}</p>
                  {signature.web && <p className={styles.signatureLink}>🌐 {signature.web}</p>}
                  {signature.email && <p className={styles.signatureLink}>✉ {signature.email}</p>}
                </div>
              </div>
            </div>

            {feedback && (
              <div
                ref={feedbackRef}
                className={feedback.type === 'success' ? styles.alertSuccess : styles.alertError}
              >
                {feedback.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {sending ? (
                <><RefreshCw size={16} className={styles.spinning} /> Enviando...</>
              ) : (
                <><Send size={16} /> Enviar correo</>
              )}
            </button>
          </form>
        </div>

        {/* Right card: Tabs for Email History OR Recipients Directory */}
        <div className={styles.card}>
          <div className={styles.tabsHeader}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Mail size={16} />
              Historial ({emails.length})
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'recipients' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('recipients')}
            >
              <Users size={16} />
              Destinatarios ({recipientsList.length})
            </button>

            <button
              className={styles.refreshBtn}
              onClick={loadData}
              disabled={loadingEmails}
              title="Actualizar"
              style={{ marginLeft: 'auto' }}
            >
              <RefreshCw size={15} className={loadingEmails ? styles.spinning : ''} />
            </button>
          </div>

          {/* Search & Status/Region Filter Controls */}
          <div className={styles.searchBox} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={activeTab === 'history' ? 'Buscar por alias, email, comuna o asunto...' : 'Buscar por alias, email o comuna...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')} title="Limpiar búsqueda">
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              {/* Region Filter Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className={styles.searchInput}
                  style={{ padding: '3px 8px', fontSize: '0.78rem', width: 'auto' }}
                  value={regionFilter}
                  onChange={e => setRegionFilter(e.target.value)}
                >
                  <option value="all">Todas las regiones / comunas</option>
                  {uniqueRegions.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Pills when on Recipients tab */}
              {activeTab === 'recipients' && (
                <div style={{ display: 'flex', gap: '6px', fontSize: '0.78rem' }}>
                  <button
                    className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.tabBtnActive : ''}`}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => setStatusFilter('all')}
                  >
                    Todos ({recipientsList.length})
                  </button>
                  <button
                    className={`${styles.tabBtn} ${statusFilter === 'pending' ? styles.tabBtnActive : ''}`}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => setStatusFilter('pending')}
                  >
                    🟡 Pendientes
                  </button>
                  <button
                    className={`${styles.tabBtn} ${statusFilter === 'accepted' ? styles.tabBtnActive : ''}`}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => setStatusFilter('accepted')}
                  >
                    🟢 Aceptados
                  </button>
                  <button
                    className={`${styles.tabBtn} ${statusFilter === 'rejected' ? styles.tabBtnActive : ''}`}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={() => setStatusFilter('rejected')}
                  >
                    🔴 Rechazados
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter banner if filtering history by a specific recipient */}
          {activeTab === 'history' && filterRecipient && (
            <div className={styles.filterBanner}>
              <span>Filtrando por destinatario: <strong>{filterRecipient}</strong></span>
              <button
                className={styles.clearSearchBtn}
                onClick={() => setFilterRecipient(null)}
                style={{ color: 'inherit' }}
              >
                <X size={14} /> Quitar filtro
              </button>
            </div>
          )}

          {/* TAB 1: HISTORY VIEW */}
          {activeTab === 'history' && (
            loadingEmails ? (
              <div className={styles.emptyState}>
                <RefreshCw size={32} className={styles.spinning} style={{ opacity: 0.4 }} />
                <p>Cargando historial...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className={styles.emptyState}>
                <Mail size={40} style={{ opacity: 0.2 }} />
                <p>{searchQuery || filterRecipient || regionFilter !== 'all' ? 'No se encontraron correos con los filtros actuales' : 'Aún no se han enviado correos'}</p>
              </div>
            ) : (
              <div className={styles.emailList}>
                {filteredEmails.map(email => {
                  const lead = leadsMap[email.to.toLowerCase().trim()]
                  const leadStatus = lead?.serviceStatus || 'pending'
                  const emailRegion = lead?.region || email.region || 'Algarrobo'

                  return (
                    <div key={email.id} className={styles.emailItem}>
                      <div
                        className={styles.emailRow}
                        onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                      >
                        <div className={styles.emailStatus}>
                          {email.status === 'sent' ? (
                            <CheckCircle size={14} className={styles.iconGreen} />
                          ) : (
                            <XCircle size={14} className={styles.iconRed} />
                          )}
                        </div>
                        <div className={styles.emailInfo}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {email.recipientAlias ? (
                              <>
                                <span className={styles.emailAlias}>{email.recipientAlias}</span>
                                <span className={styles.emailToSub}>({email.to})</span>
                              </>
                            ) : (
                              <span className={styles.emailTo}>{email.to}</span>
                            )}
                            <span className={styles.badgeRegion}>
                              <MapPin size={10} /> {emailRegion}
                            </span>
                            {leadStatus === 'accepted' && <span className={styles.badgeGreen} style={{ fontSize: '0.65rem' }}>Aceptado</span>}
                            {leadStatus === 'rejected' && <span className={styles.badgeRed} style={{ fontSize: '0.65rem' }}>Rechazado</span>}
                            {leadStatus === 'pending' && <span className={styles.badgeYellow} style={{ fontSize: '0.65rem' }}>Pendiente</span>}
                          </div>
                          <span className={styles.emailSubject}>{email.subject}</span>
                        </div>
                        <div className={styles.emailMeta}>
                          <span className={styles.emailDate}>
                            {format(new Date(email.sentAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                          {expandedId === email.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                      {expandedId === email.id && (
                        <div className={styles.emailExpanded}>
                          {email.recipientAlias && (
                            <p className={styles.expandedRow}>
                              <strong>Alias / Nombre:</strong> {email.recipientAlias}
                            </p>
                          )}
                          <p className={styles.expandedRow}>
                            <strong>Para:</strong> {email.to}
                          </p>
                          <p className={styles.expandedRow}>
                            <strong>Región / Comuna:</strong> {emailRegion}
                          </p>
                          <p className={styles.expandedRow}>
                            <strong>Asunto:</strong> {email.subject}
                          </p>
                          <p className={styles.expandedRow}>
                            <strong>Estado Envío:</strong>{' '}
                            <span className={email.status === 'sent' ? styles.badgeGreen : styles.badgeRed}>
                              {email.status === 'sent' ? 'Entregado' : 'Fallido'}
                            </span>
                          </p>
                          {email.resendId && (
                            <p className={styles.expandedRow}>
                              <strong>ID Resend:</strong>{' '}
                              <code className={styles.code}>{email.resendId}</code>
                            </p>
                          )}
                          <p className={styles.expandedRow}>
                            <strong>Enviado:</strong>{' '}
                            {format(new Date(email.sentAt), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                          <div style={{ marginTop: '8px' }}>
                            <button
                              className={styles.recipientBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleComposeTo(email.to, email.recipientAlias, emailRegion)
                              }}
                            >
                              <Send size={12} /> Volver a enviar correo a este destinatario
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* TAB 2: RECIPIENTS DIRECTORY VIEW WITH REGION & STATUS EDITING */}
          {activeTab === 'recipients' && (
            loadingEmails ? (
              <div className={styles.emptyState}>
                <RefreshCw size={32} className={styles.spinning} style={{ opacity: 0.4 }} />
                <p>Cargando destinatarios...</p>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className={styles.emptyState}>
                <Users size={40} style={{ opacity: 0.2 }} />
                <p>{searchQuery || statusFilter !== 'all' || regionFilter !== 'all' ? 'No se encontraron destinatarios con los filtros actuales' : 'Aún no hay destinatarios guardados'}</p>
              </div>
            ) : (
              <div className={styles.recipientsList}>
                {filteredRecipients.map(r => {
                  const initial = (r.alias || r.email)[0].toUpperCase()
                  const statusSelectClass =
                    r.serviceStatus === 'accepted'
                      ? styles.statusSelectAccepted
                      : r.serviceStatus === 'rejected'
                      ? styles.statusSelectRejected
                      : styles.statusSelectPending

                  const currentRegion = r.region || 'Algarrobo'

                  return (
                    <div key={r.email} className={styles.recipientItem}>
                      <div className={styles.recipientLeft}>
                        <div className={styles.recipientAvatar}>{initial}</div>
                        <div className={styles.recipientMain}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={styles.recipientAliasName}>
                              {r.alias || 'Sin Alias asignado'}
                            </span>
                            <span className={styles.badgeRegion}>
                              <MapPin size={10} /> {currentRegion}
                            </span>
                          </div>
                          <span className={styles.recipientEmailAddr}>{r.email}</span>
                        </div>
                      </div>
                      <div className={styles.recipientRight}>
                        {/* Region edit input or badge */}
                        <input
                          type="text"
                          className={styles.searchInput}
                          style={{ padding: '3px 8px', fontSize: '0.75rem', width: '100px' }}
                          value={currentRegion}
                          onChange={e => handleUpdateLead(r.email, r.alias, e.target.value, r.serviceStatus)}
                          placeholder="Región..."
                          title="Haz clic para editar la región de este cliente"
                        />

                        {/* Service Status Select */}
                        <select
                          className={`${styles.statusSelect} ${statusSelectClass}`}
                          value={r.serviceStatus || 'pending'}
                          onChange={e => handleUpdateLead(r.email, r.alias, currentRegion, e.target.value)}
                          title="Estado de aceptación del servicio"
                        >
                          <option value="pending">🟡 Pendiente</option>
                          <option value="accepted">🟢 Aceptado</option>
                          <option value="rejected">🔴 Rechazado</option>
                        </select>

                        <span className={styles.badgeCount} title="Total de correos enviados a esta dirección">
                          <Mail size={12} /> {r.count}
                        </span>

                        <button
                          className={styles.recipientBtn}
                          onClick={() => {
                            setActiveTab('history')
                            setFilterRecipient(r.email)
                          }}
                          title="Ver correos enviados a esta dirección"
                        >
                          <Filter size={12} /> Historial
                        </button>

                        <button
                          className={styles.recipientBtn}
                          style={{ background: 'var(--brand-500)', color: '#fff', borderColor: 'var(--brand-500)' }}
                          onClick={() => handleComposeTo(r.email, r.alias, currentRegion)}
                          title="Escribir un correo nuevo a esta dirección"
                        >
                          <Send size={12} /> Redactar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
