'use client'

import { useState, useCallback, useRef, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, addDays, addMonths, startOfMonth,
  isSameDay, isWeekend, getDaysInMonth, startOfWeek, differenceInDays
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, RotateCcw,
  Bell, DollarSign, Building2, CheckCircle2, Clock
} from 'lucide-react'
import styles from '@/app/calendario/Calendario.module.css'
import toast from 'react-hot-toast'
import SaasItemModal from './SaasItemModal'

interface OrganizationRow {
  id: string
  name: string
  slug: string
}

interface SaasItem {
  id: string
  _type: 'payment' | 'event'
  startDate: Date
  endDate: Date
  title: string
  status?: string
  amount?: number
  organizationId?: string
}

export default function SaasCalendarioClient({
  orgs,
  items: initialItems,
  fechaBase,
  todayStr
}: {
  orgs: OrganizationRow[]
  items: SaasItem[]
  fechaBase: string
  todayStr: string
}) {
  const router = useRouter()
  
  // States
  const [currentDate, setCurrentDate] = useState(() => new Date(`${fechaBase}T12:00:00Z`))
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [items, setItems] = useState(initialItems)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'payment' | 'event'>('payment')
  const [modalData, setModalData] = useState<any>(null)

  // Drag states
  const [activeDrag, setActiveDrag] = useState<{
    item: SaasItem
    type: 'move' | 'resize-left' | 'resize-right'
    startOrgId: string
    startDate: Date
    currentOrgId: string
    currentDate: Date
    clickOffset: number // Days from start date when dragging to move
  } | null>(null)

  const [saving, setSaving] = useState(false)
  const clickStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // Compute days to show
  const daysToShow = viewMode === 'month' ? 30 : 7 // Fixed 30 days or 7 days
  const startDay = viewMode === 'month' ? currentDate : startOfWeek(currentDate, { weekStartsOn: 1 })
  const daysArray = Array.from({ length: daysToShow }, (_, i) => addDays(startDay, i))

  // Navigation
  const goToPrev = () => setCurrentDate(viewMode === 'month' ? addDays(currentDate, -30) : addDays(currentDate, -7))
  const goToNext = () => setCurrentDate(viewMode === 'month' ? addDays(currentDate, 30) : addDays(currentDate, 7))
  const goToToday = () => setCurrentDate(new Date(`${todayStr}T12:00:00Z`))

  const colWidth = 46
  const rowHeight = 44

  // Helper to strip time
  const stripTime = (d: Date) => {
    const nd = new Date(d)
    nd.setHours(0, 0, 0, 0)
    return nd
  }

  // Find item for cell
  const getItemForCell = useCallback((orgId: string, day: Date) => {
    return items.find(i => {
      const matchOrg = orgId === 'global' ? i._type === 'event' : i.organizationId === orgId
      if (!matchOrg) return false
      
      const start = stripTime(new Date(i.startDate))
      const end = stripTime(new Date(i.endDate))
      const d = stripTime(day)
      return d >= start && d < end
    }) || null
  }, [items])

  // Is first day of item
  const isFirstDay = (item: SaasItem, day: Date) => {
    return isSameDay(stripTime(new Date(item.startDate)), stripTime(day))
  }

  // Get block width
  const getBlockWidth = (item: SaasItem, day: Date, daysArr: Date[]) => {
    const start = stripTime(new Date(item.startDate))
    const end = stripTime(new Date(item.endDate))
    const d = stripTime(day)
    
    const blockStart = d < start ? start : d
    let count = 0
    for (const curr of daysArr) {
      const cd = stripTime(curr)
      if (cd >= blockStart && cd < end) count++
      else if (cd >= end) break
    }
    return count
  }

  // Handle Drag Start
  const handleMouseDown = (e: React.MouseEvent, item: SaasItem, orgId: string, day: Date) => {
    if (e.button !== 0) return // Left click only
    e.stopPropagation()
    clickStartRef.current = { x: e.clientX, y: e.clientY }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const totalWidth = rect.width

    let type: 'move' | 'resize-left' | 'resize-right' = 'move'
    if (x < 15) type = 'resize-left'
    else if (x > totalWidth - 15) type = 'resize-right'

    const clickOffset = differenceInDays(stripTime(day), stripTime(new Date(item.startDate)))

    setActiveDrag({
      item,
      type,
      startOrgId: orgId,
      startDate: stripTime(new Date(item.startDate)),
      currentOrgId: orgId,
      currentDate: stripTime(day),
      clickOffset
    })
  }

  // Handle Drag Move (Hover over cell)
  const handleMouseEnter = (orgId: string, day: Date) => {
    if (activeDrag) {
      // Global events cannot be dragged to clients and viceversa
      if ((activeDrag.item._type === 'event' && orgId !== 'global') || 
          (activeDrag.item._type === 'payment' && orgId === 'global')) {
        return
      }

      setActiveDrag(prev => {
        if (!prev) return null
        return { ...prev, currentOrgId: orgId, currentDate: stripTime(day) }
      })
    }
  }

  // Handle Drop (Mouse Up)
  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!activeDrag || saving) return
    
    // Check if it was just a click
    const isClick = clickStartRef.current
      ? Math.abs(e.clientX - clickStartRef.current.x) < 5 &&
        Math.abs(e.clientY - clickStartRef.current.y) < 5
      : false

    if (isClick) {
      // Just a click -> open modal instead of dropping
      setModalType(activeDrag.item._type)
      setModalData(activeDrag.item)
      setModalOpen(true)
      setActiveDrag(null)
      return
    }

    const { item, type, startOrgId, startDate, currentOrgId, currentDate, clickOffset } = activeDrag
    setActiveDrag(null)

    // Calculate new dates
    let newStart = stripTime(new Date(item.startDate))
    let newEnd = stripTime(new Date(item.endDate))
    let newOrgId = item.organizationId

    if (type === 'resize-left') {
      newStart = currentDate
      if (newStart >= newEnd) newStart = addDays(newEnd, -1)
    } else if (type === 'resize-right') {
      newEnd = addDays(currentDate, 1)
      if (newEnd <= newStart) newEnd = addDays(newStart, 1)
    } else if (type === 'move') {
      const daysMoved = differenceInDays(currentDate, addDays(startDate, clickOffset))
      newStart = addDays(newStart, daysMoved)
      newEnd = addDays(newEnd, daysMoved)
      newOrgId = currentOrgId === 'global' ? undefined : currentOrgId
    }

    // Check if dates or org changed
    if (isSameDay(newStart, new Date(item.startDate)) && isSameDay(newEnd, new Date(item.endDate)) && newOrgId === item.organizationId) {
      return
    }

    // Optimistic UI Update
    setItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return { ...i, startDate: newStart, endDate: newEnd, organizationId: newOrgId }
      }
      return i
    }))

    setSaving(true)
    const toastId = toast.loading('Guardando cambios...')
    try {
      const endpoint = item._type === 'payment' ? '/api/saas/payments' : '/api/saas/events'
      const body = {
        id: item.id,
        startDate: newStart.toISOString(),
        endDate: newEnd.toISOString(),
        organizationId: newOrgId
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Error al guardar')
      toast.success('Cambios guardados', { id: toastId })
      router.refresh()
    } catch (err) {
      toast.error('Ocurrió un error. Se revertirán los cambios.', { id: toastId })
      setItems(initialItems) // Revert
    } finally {
      setSaving(false)
    }
  }

  // Ensure global drop listener
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (activeDrag) handleMouseUp(e as any)
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [activeDrag])

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className="btn btn-ghost" onClick={goToPrev}><ChevronLeft size={20} /></button>
          <button className="btn btn-ghost" onClick={goToToday}><RotateCcw size={16} /></button>
          <button className="btn btn-ghost" onClick={goToNext}><ChevronRight size={20} /></button>
          <div className={styles.monthLabel}>
            {format(startDay, 'MMMM yyyy', { locale: es })}
          </div>
          
          <div style={{ marginLeft: '16px', display: 'flex', background: 'var(--surface-2)', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('month')}
              style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '4px', background: viewMode === 'month' ? 'var(--brand-500)' : 'transparent', color: viewMode === 'month' ? '#fff' : 'inherit', border: 'none', cursor: 'pointer' }}
            >Mes</button>
            <button 
              onClick={() => setViewMode('week')}
              style={{ padding: '4px 12px', fontSize: '0.85rem', borderRadius: '4px', background: viewMode === 'week' ? 'var(--brand-500)' : 'transparent', color: viewMode === 'week' ? '#fff' : 'inherit', border: 'none', cursor: 'pointer' }}
            >Semana</button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => { setModalType('event'); setModalData(null); setModalOpen(true) }}>
              <Bell size={18} /> Nuevo Evento
            </button>
            <button className="btn btn-primary" onClick={() => { setModalType('payment'); setModalData(null); setModalOpen(true) }}>
              <DollarSign size={18} /> Registrar Cobro
            </button>
          </div>
        </div>
      </div>

      <SaasItemModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        itemType={modalType} 
        orgs={orgs} 
        initialData={modalData} 
      />

      {/* ── Grid Wrapper ── */}
      <div className={styles.gridWrapper}>
        <div className={styles.grid}>
          {/* Header Row */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10 }}>
            <div className={styles.cornerCell} style={{ width: '220px', minWidth: '220px' }}>
              <span className={styles.cornerText}>Clientes / Eventos</span>
            </div>
            {daysArray.map((day) => {
              const isWknd = isWeekend(day)
              const isTdy = isSameDay(day, new Date(`${todayStr}T12:00:00Z`))
              return (
                <div
                  key={`header-${day.toISOString()}`}
                  className={`${styles.dayHeader} ${isTdy ? styles.todayHeader : ''} ${isWknd ? styles.weekendHeader : ''}`}
                  style={{ width: colWidth, minWidth: colWidth }}
                >
                  <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase' }}>
                    {format(day, 'E', { locale: es }).charAt(0)}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: isTdy ? 700 : 600 }}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Render Rows (Global + Orgs) */}
          {[ { id: 'global', name: 'Eventos Globales', isGlobal: true }, ...orgs.map(o => ({...o, isGlobal: false})) ].map((org) => (
            <div key={org.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: org.isGlobal ? 'var(--surface-2)' : 'transparent' }}>
              
              <div style={{ width: '220px', minWidth: '220px', position: 'sticky', left: 0, zIndex: 5, background: org.isGlobal ? 'var(--surface-2)' : 'var(--surface-1)', borderRight: '1px solid var(--border)', padding: '0 12px', display: 'flex', alignItems: 'center', height: rowHeight }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {org.isGlobal ? <Bell size={16} color="var(--brand-500)"/> : <Building2 size={16} style={{ color: 'var(--text-muted)' }} />}
                  <span style={{ fontSize: org.isGlobal ? '0.9rem' : '0.85rem', fontWeight: org.isGlobal ? 600 : 400, color: 'var(--text-base)' }}>
                    {org.name}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', position: 'relative' }}>
                {daysArray.map((day) => {
                  const item = getItemForCell(org.id, day)
                  const isFirst = item && isFirstDay(item, day)
                  const widthMultiplier = item && isFirst ? getBlockWidth(item, day, daysArray) : 0
                  
                  // Dragging preview
                  let isDragTarget = false
                  let dragPreviewWidth = 0
                  let dragItem = null
                  
                  if (activeDrag && activeDrag.currentOrgId === org.id) {
                    let newStart = stripTime(new Date(activeDrag.startDate))
                    let newEnd = stripTime(new Date(activeDrag.item.endDate))
                    
                    if (activeDrag.type === 'move') {
                      const daysMoved = differenceInDays(activeDrag.currentDate, addDays(activeDrag.startDate, activeDrag.clickOffset))
                      newStart = addDays(newStart, daysMoved)
                      newEnd = addDays(newEnd, daysMoved)
                    } else if (activeDrag.type === 'resize-left') {
                      newStart = activeDrag.currentDate
                      if (newStart >= newEnd) newStart = addDays(newEnd, -1)
                    } else if (activeDrag.type === 'resize-right') {
                      newEnd = addDays(activeDrag.currentDate, 1)
                      if (newEnd <= newStart) newEnd = addDays(newStart, 1)
                    }
                    
                    if (isSameDay(day, newStart)) {
                      isDragTarget = true
                      dragItem = activeDrag.item
                      
                      const blockStart = day
                      let count = 0
                      for (const curr of daysArray) {
                        const cd = stripTime(curr)
                        if (cd >= stripTime(blockStart) && cd < stripTime(newEnd)) count++
                        else if (cd >= stripTime(newEnd)) break
                      }
                      dragPreviewWidth = count
                    }
                  }

                  return (
                    <div 
                      key={`${org.id}-${day.toISOString()}`} 
                      style={{ 
                        width: colWidth, 
                        minWidth: colWidth, 
                        borderRight: '1px solid var(--border-light)', 
                        background: isWeekend(day) ? 'var(--cal-weekend-bg)' : 'transparent', 
                        height: rowHeight,
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      className={styles.cellHover}
                      onMouseEnter={() => handleMouseEnter(org.id, day)}
                      onMouseUp={handleMouseUp}
                      onClick={(e) => {
                        // Prevent triggering if dropping a drag
                        if (activeDrag) return;
                        setModalType(org.isGlobal ? 'event' : 'payment');
                        setModalData({ startDate: day, endDate: addDays(day, 1), ...(org.isGlobal ? {} : { organizationId: org.id }) });
                        setModalOpen(true);
                      }}
                    >
                      {/* Actual Item Block */}
                      {item && isFirst && !isDragTarget && (
                        <div
                          onMouseDown={(e) => handleMouseDown(e, item, org.id, day)}
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 0,
                            height: rowHeight - 8,
                            width: (colWidth * widthMultiplier) - 4,
                            background: item._type === 'payment' ? (item.status === 'paid' ? '#16a34a' : '#ca8a04') : '#2563eb',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            cursor: 'grab',
                            userSelect: 'none',
                            zIndex: 2,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            opacity: activeDrag?.item.id === item.id ? 0.3 : 1,
                            pointerEvents: activeDrag?.item.id === item.id ? 'none' : 'auto'
                          }}
                        >
                          {item._type === 'payment' ? `$${item.amount?.toLocaleString()}` : item.title}
                          
                          {/* Resize Handles */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '10px', cursor: 'col-resize', zIndex: 10 }} />
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px', cursor: 'col-resize', zIndex: 10 }} />
                        </div>
                      )}

                      {/* Drag Preview Block */}
                      {isDragTarget && dragItem && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            left: 0,
                            height: rowHeight - 8,
                            width: (colWidth * dragPreviewWidth) - 4,
                            background: dragItem._type === 'payment' ? '#ca8a04' : '#2563eb',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            pointerEvents: 'none',
                            opacity: 0.8
                          }}
                        >
                           {dragItem._type === 'payment' ? `$${dragItem.amount?.toLocaleString()}` : dragItem.title}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
