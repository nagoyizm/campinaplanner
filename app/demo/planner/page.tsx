'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  format, addDays, isSameDay, isWeekend,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LayoutDashboard, Calendar as CalIcon, BookOpen, Users, Hotel, Package,
  MessageSquare, Bell, BarChart3, Settings,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun, Palette,
  Search, Mail, Phone, Globe,
  ShieldAlert, ShieldCheck, AlertCircle, Wrench, CheckCircle2,
  LogIn, RotateCcw, Plus,
} from 'lucide-react'
import Icon from '@/components/ui/Icon'
// Réplica exacta: reutiliza los CSS modules reales de la app
import calStyles from '@/app/calendario/Calendario.module.css'
import appStyles from '@/components/layout/AppLayout.module.css'
import sidebarStyles from '@/components/layout/Sidebar.module.css'
import headerStyles from '@/components/layout/Header.module.css'
import huespedesStyles from '@/app/huespedes/huespedes.module.css'
import habStyles from '@/app/habitaciones/habitaciones.module.css'
import roomCardStyles from '@/app/habitaciones/RoomCard.module.css'
import styles from './planner.module.css'
import { AGENDIO_STEPS, PLANNER_STAGES, TOTAL_DEMO_STEPS, getDemoTheme, getStoredStep, storeDemoTheme, storeStep, resetDemo } from '../demo-flow'
import { mergePlanner } from '../demo-texts'

/* Mapa de estados copiado del calendario real (CalendarioClient.tsx) */
const STATUS = {
  booked:      { label: 'Reservado',     color: 'color-mix(in srgb, var(--info) 42%, var(--surface-1))',    textColor: 'var(--text-primary)' },
  confirmed:   { label: 'Confirmado',    color: 'color-mix(in srgb, var(--success) 42%, var(--surface-1))', textColor: 'var(--text-primary)' },
  checked_in:  { label: 'Check-In',      color: 'color-mix(in srgb, var(--warning) 42%, var(--surface-1))', textColor: 'var(--text-primary)' },
  checked_out: { label: 'Check-Out',     color: 'color-mix(in srgb, var(--neutral) 42%, var(--surface-1))', textColor: 'var(--text-primary)' },
  on_hold:     { label: 'Por Confirmar', color: 'color-mix(in srgb, var(--warning) 42%, var(--surface-1))', textColor: 'var(--text-primary)' },
} as const

type PhaseKey = 'calendario' | 'huespedes' | 'habitaciones' | 'notificaciones'

const STAGES: Array<{
  key: string; label: string; tab: PhaseKey
  status?: keyof typeof STATUS; chip: string; chipCls: string
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
  title: string; text: string
}> = [
  { key: 'pendiente', label: 'Reserva recibida', tab: 'calendario', status: 'on_hold', chip: 'Por Confirmar', chipCls: styles.chipAmber, Icon: Bell,
    title: 'Pestaña Calendario',
    text: 'Estamos dentro del planner, en la pestaña Calendario. La reserva creada en reservas.agendio.cl aparece sola como un bloque ámbar POR CONFIRMAR sobre Tu Cabaña 1, con escudo rojo porque aún no tiene garantía.' },
  { key: 'confirmada', label: 'Confirmación', tab: 'calendario', status: 'confirmed', chip: 'Confirmada', chipCls: styles.chipGreen, Icon: Mail,
    title: 'Confirmar reserva',
    text: 'Recepción revisa la solicitud y la confirma: el bloque pasa a verde CONFIRMADO y el escudo cambia a garantía pagada. Los días quedan asegurados para el huésped.' },
  { key: 'checkin', label: 'Check-in', tab: 'calendario', status: 'checked_in', chip: 'Ocupada', chipCls: styles.chipBlue, Icon: LogIn,
    title: 'Día de entrada',
    text: 'Llega el día de entrada: se registra el check-in, se cobra la garantía y el estado pasa a OCUPADA. El huésped ya está disfrutando la cabaña.' },
  { key: 'checkout', label: 'Check-out', tab: 'calendario', status: 'checked_out', chip: 'Check-Out', chipCls: styles.chipGray, Icon: LogOut,
    title: 'Pasa la fecha',
    text: 'Pasó la fecha de salida (hoy): se cierra la cuenta, se registra el pago final y se hace el CHECK-OUT. El bloque queda gris como estadía cerrada y la unidad se libera.' },
  { key: 'huesped', label: 'Huésped en la base de datos', tab: 'huespedes', chip: 'Guardado', chipCls: styles.chipGreen, Icon: Users,
    title: 'Pestaña Huéspedes',
    text: 'Al hacer el check-out, el sistema guardó automáticamente al huésped en la base de datos: pestaña Huéspedes muestra su ficha con nombre, RUT, contactos y sus estadías acumuladas para futuras visitas.' },
  { key: 'sucia', label: 'Limpieza pendiente', tab: 'habitaciones', chip: 'Sin Limpieza', chipCls: styles.chipOrange, Icon: AlertCircle,
    title: 'Pestaña Habitaciones',
    text: 'Housekeeping trabaja desde la pestaña Habitaciones: Tu Cabaña 1 aparece SIN LIMPIEZA (Limpieza Pendiente) después del huésped, junto al resto de unidades del recinto.' },
  { key: 'lista', label: 'Limpieza lista', tab: 'habitaciones', chip: 'Lista', chipCls: styles.chipGreen, Icon: CheckCircle2,
    title: 'Marcar limpieza lista',
    text: 'Con un clic se cambia Limpieza Pendiente → Limpia y Lista: la unidad queda disponible en el inventario y puede venderse otra vez.' },
  { key: 'notificaciones', label: 'Notificaciones', tab: 'notificaciones', chip: 'Enviadas', chipCls: styles.chipGreen, Icon: MessageSquare,
    title: 'Nueva pantalla: notificaciones',
    text: 'Al cerrar el ciclo, el huésped recibe las notificaciones automáticas: a la izquierda el WhatsApp que llega a su celular y a la derecha el correo en Gmail con el resumen del check-out.' },
]

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/recepcion', label: 'Recepción', Icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendario', Icon: CalIcon },
  { href: '/reservas', label: 'Reservas', Icon: BookOpen },
  { href: '/habitaciones', label: 'Habitaciones', Icon: Hotel },
  { href: '/huespedes', label: 'Huéspedes', Icon: Users },
  { href: '/pizarra', label: 'Pizarra / Memo', Icon: MessageSquare },
  { href: '/inventario', label: 'Inventario', Icon: Package },
  { href: '/administracion', label: 'Administración', Icon: Bell },
]

const TAB_TITLES: Record<PhaseKey, string> = {
  calendario: 'Calendario de Reservas',
  huespedes: 'Huéspedes',
  habitaciones: 'Estado de Habitaciones',
  notificaciones: '',
}

const RESERVA = { nombre: 'Tu Huésped', code: '#2481' }
const ROOM_GROUPS = [
  { name: 'Cabañas', rooms: [{ id: 'c1', code: 'C1', name: 'Tu Cabaña 1' }, { id: 'c2', code: 'C2', name: 'Tu Cabaña 2' }] },
  { name: 'Domos', rooms: [{ id: 'd1', code: 'D1', name: 'Tu Domo 1' }, { id: 'd2', code: 'D2', name: 'Tu Domo 2' }] },
]
const DAYS_COUNT = 17

export default function DemoPlannerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [texts, setTexts] = useState<Record<string, { label?: string; text?: string }>>({})
  const [clock, setClock] = useState('')

  /* Carga textos editados desde el panel SaaS */
  useEffect(() => {
    fetch('/api/public/demo-texts')
      .then(r => r.json())
      .then(data => { if (data.planner) setTexts(data.planner) })
      .catch(() => { /* defaults */ })
  }, [])

  /* Etapas con label/text sobreescritos si existen ediciones */
  const stages = useMemo(() => {
    const merged = mergePlanner(texts)
    return STAGES.map((s, i) => ({ ...s, label: merged[i].label, text: merged[i].text }))
  }, [texts])

  useEffect(() => {
    const t = getDemoTheme()
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    const stored = getStoredStep() - AGENDIO_STEPS
    if (stored > 0 && stored < PLANNER_STAGES) setPhase(stored)
    const tick = () => setClock(new Date().toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
    tick()
    const iv = setInterval(tick, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { storeStep(AGENDIO_STEPS + phase) }, [phase])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      storeDemoTheme(next)
      return next
    })
  }, [])

  const days = useMemo(() => {
    const start = addDays(new Date(), -7)
    return Array.from({ length: DAYS_COUNT }, (_, i) => {
      const d = addDays(start, i)
      d.setHours(0, 0, 0, 0)
      return d
    })
  }, [])
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const arrIdx = useMemo(() => days.findIndex(d => d.getTime() === addDays(today, -3).getTime()), [days, today])
  const depIdx = useMemo(() => days.findIndex(d => isSameDay(d, today)), [days, today])
  const nights = depIdx - arrIdx

  const stage = stages[Math.min(phase, stages.length - 1)]

  const advance = useCallback(() => {
    if (phase >= stages.length - 1) { resetDemo(); return }
    setPhase(p => p + 1)
  }, [phase, stages.length])

  const back = useCallback(() => {
    if (phase <= 0) {
      storeStep(AGENDIO_STEPS - 1)
      router.push('/demo/agendio')
      return
    }
    setPhase(p => p - 1)
  }, [phase, router])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); advance() }
      if (e.code === 'ArrowLeft') { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, back])

  /* Pantalla final independiente: WhatsApp + Gmail */
  if (stage.tab === 'notificaciones') {
    return (
      <div className={styles.notifScreen}>
        <p className={styles.notifTitle}>Notificaciones automáticas al huésped</p>
        <div className={styles.notifCols}>
          <PhoneMockup />
          <GmailMockup />
        </div>
        <Narrator phase={phase} stages={stages} onBack={back} onAdvance={advance} />
      </div>
    )
  }

  /* ── App réplica: sidebar + header reales ── */
  const activeHref =
    stage.tab === 'calendario' ? '/calendario'
      : stage.tab === 'huespedes' ? '/huespedes'
        : '/habitaciones'

  return (
    <>
      <div className={`${appStyles.appLayout} ${styles.pageShell}`}>
        {/* ── Sidebar (mismas clases que components/layout/Sidebar) ── */}
        <aside className={sidebarStyles.sidebar}>
          <div className={sidebarStyles.logoArea} style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '16px 14px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={sidebarStyles.logoIcon} style={{ background: 'transparent', boxShadow: 'none', padding: 0, width: 40, height: 40 }}>
                <Image src="/logo-habita-round.png" alt="Agendio" width={40} height={40} />
              </div>
              <span style={{ fontFamily: '"mooxy", sans-serif', fontSize: '24px', fontWeight: 800, color: 'var(--sidebar-title)', letterSpacing: '0.15em' }}>agendio</span>
            </div>
            <div className={sidebarStyles.logoText}>
              <span className={sidebarStyles.logoName}>Tu Recinto</span>
              <span className={sidebarStyles.logoSub} style={{ fontWeight: 600, color: 'var(--brand-600)' }}>Plan Reservas</span>
            </div>
            <button type="button" className={sidebarStyles.collapseBtn} aria-label="Colapsar sidebar">
              <Icon icon={ChevronLeft} size="sm" />
            </button>
          </div>

          <div className={sidebarStyles.navContent}>
            <div className={sidebarStyles.navSection}>
              {NAV_ITEMS.map(item => (
                <span
                  key={item.href}
                  className={`${sidebarStyles.navItem} ${activeHref === item.href ? sidebarStyles.active : ''}`}
                >
                  <Icon icon={item.Icon} size="lg" className={sidebarStyles.navIcon} />
                  <span className={sidebarStyles.navLabel}>{item.label}</span>
                </span>
              ))}
              {[{ label: 'Reportes', Icon: BarChart3 }, { label: 'Configuración', Icon: Settings }].map(p => (
                <span key={p.label} className={sidebarStyles.navItem}>
                  <Icon icon={p.Icon} size="lg" className={sidebarStyles.navIcon} />
                  <span className={sidebarStyles.navLabel}>{p.label}</span>
                  <Icon icon={ChevronRight} size="sm" className={sidebarStyles.chevron} />
                </span>
              ))}
            </div>
          </div>

          <div className={sidebarStyles.bottomActions}>
            <span className={sidebarStyles.actionBtn}>
              <Icon icon={Palette} size="md" /><span>Personalizar</span>
            </span>
            <span className={sidebarStyles.actionBtn}>
              <Icon icon={Moon} size="md" /><span>Modo oscuro</span>
            </span>
            <span className={`${sidebarStyles.actionBtn} ${sidebarStyles.logoutBtn}`}>
              <Icon icon={LogOut} size="md" /><span>Cerrar sesión</span>
            </span>
          </div>
        </aside>

        {/* ── Main area + Header (mismas clases que AppLayout/Header) ── */}
        <div className={appStyles.mainArea}>
          <header className={headerStyles.header}>
            <div className={headerStyles.left}>
              <h1 className={headerStyles.pageTitle}>{TAB_TITLES[stage.tab]}</h1>
              <span className={headerStyles.datetime}>{clock}</span>
            </div>
            <div className={headerStyles.center} />
            <div className={headerStyles.right}>
              <button
                type="button"
                className={styles.themeBtn}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                <Icon icon={theme === 'dark' ? Sun : Moon} size="md" />
              </button>
              <div className={headerStyles.userChip} title="Tu Usuario · Administrador">
                <div className={headerStyles.avatar}>TU</div>
                <div className={headerStyles.userInfo}>
                  <span className={headerStyles.userName}>Tu Usuario</span>
                  <span className={headerStyles.userRole}>Administrador</span>
                </div>
              </div>
            </div>
          </header>

          <main className={`${appStyles.content} ${stage.tab === 'calendario' ? appStyles.noPadding : ''}`}>
            {stage.tab === 'calendario' && (
              <CalendarScreen
                days={days} today={today} arrIdx={arrIdx} depIdx={depIdx} nights={nights}
                status={STATUS[stage.status ?? 'on_hold']} stageIndex={phase} reserva={RESERVA}
              />
            )}
            {stage.tab === 'huespedes' && <HuespedesScreen reserva={RESERVA} />}
            {stage.tab === 'habitaciones' && <HabitacionesScreen clean={stage.key === 'lista'} />}
            <Narrator phase={phase} stages={stages} onBack={back} onAdvance={advance} />
          </main>
        </div>
      </div>
    </>
  )

  /* ── Pestaña Calendario (grilla real vía Calendario.module.css) ── */
  function CalendarScreen({ days, today, arrIdx, depIdx, nights, status, stageIndex, reserva }: {
    days: Date[]; today: Date; arrIdx: number; depIdx: number; nights: number
    status: { label: string; color: string; textColor: string }; stageIndex: number
    reserva: typeof RESERVA
  }) {
    const st = status
    return (
      <div className={calStyles.container} style={{ flex: 1, minHeight: 0 }}>
        <div className={calStyles.toolbar}>
          <div className={calStyles.toolbarLeft}>
            <div className={calStyles.viewToggle}>
              <button type="button" className={calStyles.viewToggleBtn}>Mes</button>
              <button type="button" className={`${calStyles.viewToggleBtn} ${calStyles.viewToggleBtnActive}`}>Semana</button>
            </div>
            <div className={calStyles.toolbarDivider} />
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Anterior"><Icon icon={ChevronLeft} size="md" /></button>
            <span className={calStyles.monthLabel}>
              {format(days[0], 'd MMM', { locale: es })} - {format(days[DAYS_COUNT - 1], 'd MMM yyyy', { locale: es })}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Siguiente"><Icon icon={ChevronRight} size="md" /></button>
            <button type="button" className="btn btn-secondary btn-sm">Hoy</button>
          </div>
          <div className={calStyles.toolbarRight}>
            <button type="button" className="btn btn-primary btn-sm">
              <Icon icon={Plus} size="sm" /> Nueva Reserva
            </button>
          </div>
        </div>

        <div className={calStyles.gridWrapper}>
          <div className={calStyles.grid} style={{ gridTemplateColumns: `130px repeat(${DAYS_COUNT}, minmax(46px, 1fr))` }}>
            <div className={calStyles.cornerCell}><span className={calStyles.cornerText}>Unidad</span></div>
            {days.map((day, i) => (
              <div
                key={`h-${i}`}
                className={`
                  ${calStyles.dayHeader}
                  ${isSameDay(day, today) ? calStyles.todayHeader : ''}
                  ${isWeekend(day) && !isSameDay(day, today) ? calStyles.weekendHeader : ''}
                `}
              >
                <span className={calStyles.dayNum}>{format(day, 'd')}</span>
                <span className={calStyles.dayName}>{format(day, 'EEE', { locale: es })}</span>
              </div>
            ))}

            {ROOM_GROUPS.map(group => (
              <GroupRows key={group.name} group={group} />
            ))}
          </div>
        </div>
      </div>
    )

    function GroupRows({ group }: { group: (typeof ROOM_GROUPS)[number] }) {
      return (
        <>
          <div className={calStyles.unitTypeRow}>{group.name}</div>
          {group.rooms.map(room => (
            <CalRow key={room.id} code={room.code} name={room.name} isBooked={room.id === 'c1'} />
          ))}
        </>
      )
    }

    function CalRow({ code, name, isBooked }: { code: string; name: string; isBooked: boolean }) {
      return (
        <>
          <div className={calStyles.roomLabel}>
            <span className={calStyles.roomCode}>{code}</span>
            <span className={calStyles.roomName}>{name}</span>
            {isBooked && <span className={`${styles.roomChip} ${styles.chipAmber}`}>{st.label}</span>}
          </div>
          {days.map((day, i) => (
            <div
              key={`c-${code}-${i}`}
              className={`
                ${calStyles.cell}
                ${isSameDay(day, today) ? calStyles.todayCell : ''}
                ${isWeekend(day) && !isSameDay(day, today) ? calStyles.weekendCell : ''}
              `}
            >
              {isBooked && i === arrIdx && nights > 0 && (
                <div
                  className={calStyles.reservationBlock}
                  data-testid="reservation-block"
                  style={{
                    backgroundColor: st.color,
                    color: st.textColor,
                    width: `calc(${nights * 100}% + ${nights - 1}px)`,
                    ...(stageIndex >= 3 ? { opacity: 0.65 } : {}),
                  }}
                >
                  <span className={calStyles.rsvGuest} style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', zIndex: 2 }}>
                    {stageIndex >= 1
                      ? <Icon icon={ShieldCheck} size="xs" color="var(--success)" />
                      : <Icon icon={ShieldAlert} size="xs" color="var(--danger)" />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reserva.nombre}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </>
      )
    }
  }

  /* ── Pestaña Huéspedes (estructura real de app/huespedes) ── */
  function HuespedesScreen({ reserva }: { reserva: typeof RESERVA }) {
    const initials = reserva.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')
    return (
      <div className={styles.tabInner}>
        <div className={styles.panelCard}>
          <div className={huespedesStyles.searchBar}>
            <div className={styles.searchBox}>
              <Icon icon={Search} size="sm" />
              <input readOnly placeholder="Buscar por nombre..." value="" aria-label="Buscar huésped" />
            </div>
          </div>
          <table className={styles.huespedTable}>
            <thead>
              <tr>
                <th>Nombre</th><th>RUT</th><th>Contacto</th><th>Nacionalidad</th>
                <th>Estadías</th><th>Notas</th><th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.rowHighlight}>
                <td>
                  <div className={huespedesStyles.guestName}>
                    <span className={huespedesStyles.avatarCircle}>{initials.toUpperCase()}</span>
                    <strong>{reserva.nombre}</strong>
                  </div>
                </td>
                <td className={huespedesStyles.mutedCell}>16.234.567-8</td>
                <td>
                  <div className={huespedesStyles.contactCell}>
                    <span className={huespedesStyles.contactItem}><Icon icon={Phone} size="xs" />+56 9 6123 4567</span>
                    <span className={huespedesStyles.contactItem}><Icon icon={Mail} size="xs" />huesped@correo.com</span>
                  </div>
                </td>
                <td><span className={huespedesStyles.natBadge}><Icon icon={Globe} size="xs" />Chile</span></td>
                <td className={huespedesStyles.staysCell}><span className={huespedesStyles.staysBadge}>1</span></td>
                <td className={huespedesStyles.notesCell}>Notas del huésped</td>
                <td className={huespedesStyles.mutedCell}>hoy</td>
              </tr>
            </tbody>
          </table>
          <div className={styles.dbNote}>
            <Icon icon={CheckCircle2} size="sm" />
            Registro creado automáticamente por la reserva web {reserva.code} — quedará disponible para futuras reservas y campañas.
          </div>
        </div>
      </div>
    )
  }

  /* ── Pestaña Habitaciones (estructura real de app/habitaciones) ── */
  function HabitacionesScreen({ clean }: { clean: boolean }) {
    const bookedState = clean ? 'clean' : 'dirty'
    return (
      <div className={styles.tabInner}>
        <div className={habStyles.statsGrid}>
          <div className={habStyles.statCard}>
            <p className={habStyles.statLabel}>Ocupación</p>
            <span className={habStyles.statValue}>25%</span>
            <div className={habStyles.statProgress}><div className={habStyles.statProgressFill} style={{ width: '25%' }} /></div>
          </div>
          <StatCard icon={<Icon icon={AlertCircle} size="sm" />} label="Ocupadas" value="0" />
          <StatCard icon={<Icon icon={CheckCircle2} size="sm" />} label="Libres" value="4" />
          <StatCard icon={<Icon icon={CheckCircle2} size="sm" />} label="Listas" value={clean ? '4' : '3'} success />
          <StatCard icon={<Icon icon={AlertCircle} size="sm" />} label="Sin limpieza" value={clean ? '0' : '1'} danger />
          <StatCard icon={<Icon icon={Wrench} size="sm" />} label="Urgencias" value="0" danger />
          <StatCard icon={<Icon icon={Wrench} size="sm" />} label="Mant." value="0" />
        </div>

        <div className={styles.groupBlock}>
          <div className={habStyles.groupBadges}>
            <span className={`${habStyles.groupBadge} ${habStyles.badgeAvailable}`}>4 Libres</span>
          </div>
          <div className={styles.roomGrid}>
            {ROOM_GROUPS.flatMap(g => g.rooms).map(room => {
              const isBooked = room.id === 'c1'
              const state = isBooked ? bookedState : 'clean'
              return (
                <div key={room.id} className={roomCardStyles.card} data-state={state}>
                  <div className={roomCardStyles.header}>
                    <div className={roomCardStyles.nameRow}>
                      <span className={roomCardStyles.name}>{room.code} · {room.name}</span>
                      {isBooked && !clean
                        ? <span className={roomCardStyles.statusBadge} data-tone="warning"><Icon icon={AlertCircle} size="xs" /> Sin Limpieza</span>
                        : <span className={roomCardStyles.statusBadge} data-tone="success"><Icon icon={CheckCircle2} size="xs" /> Lista</span>}
                    </div>
                    <div className={roomCardStyles.occupancy}>Disponible</div>
                  </div>
                  <div className={roomCardStyles.footer}>
                    <select className={roomCardStyles.select} value={isBooked ? (clean ? 'clean' : 'dirty') : 'clean'} onChange={() => {}} aria-label="Estado de limpieza">
                      <option value="clean">Limpia y Lista</option>
                      <option value="dirty">Limpieza Pendiente</option>
                      <option value="maintenance">En Mantenimiento</option>
                      <option value="occupied">Ocupada</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
}

function StatCard({ icon, label, value, success, danger }: { icon: React.ReactNode; label: string; value: string; success?: boolean; danger?: boolean }) {
  return (
    <div className={habStyles.statCard}>
      <div className={`${habStyles.statLabel} ${success ? habStyles.statLabelSuccess : ''} ${danger ? habStyles.statLabelDanger : ''}`}>
        {icon} {label}
      </div>
      <span className={`${habStyles.statValue} ${success ? habStyles.statValueSuccess : ''} ${danger ? habStyles.statValueDanger : ''}`}>{value}</span>
    </div>
  )
}

function Narrator({ phase, stages, onBack, onAdvance }: {
  phase: number; stages: typeof STAGES; onBack: () => void; onAdvance: () => void
}) {
  const total = stages.length
  const last = phase >= total - 1
  const globalIdx = AGENDIO_STEPS + phase
  return (
    <div className={styles.narrator} role="status" aria-live="polite">
      <div className={styles.progress} aria-hidden>
        {Array.from({ length: TOTAL_DEMO_STEPS }).map((_, i) => (
          <span key={i} className={`${styles.progressDot} ${i <= globalIdx ? styles.dotOn : ''}`} />
        ))}
      </div>
      <div className={styles.textCol}>
        <p className={styles.narratorTitle}><strong>Paso {globalIdx + 1} de {TOTAL_DEMO_STEPS}</strong> · {stages[phase].label}</p>
        <p className={styles.narration}>{stages[phase].text}</p>
      </div>
      <button type="button" className={styles.prevBtn} onClick={onBack} aria-label="Paso anterior">
        <Icon icon={ChevronLeft} size="sm" />
      </button>
      <button type="button" className={styles.resetBtn} onClick={resetDemo}>Reiniciar</button>
      <button type="button" className={styles.nextBtn} onClick={onAdvance}>
        {last ? <>Reiniciar demo <Icon icon={RotateCcw} size="sm" /></> : <>Siguiente <kbd>ESPACIO</kbd></>}
      </button>
    </div>
  )
}

/* ── Mockup WhatsApp ── */
function PhoneMockup() {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneNotch} aria-hidden />
      <div className={styles.waHeader}>
        <span className={styles.waAvatar}>TR</span>
        <div>
          <p className={styles.waName}>Tu Recinto</p>
          <p className={styles.waStatus}>en línea</p>
        </div>
        <svg className={styles.waLogo} viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden>
          <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2z" opacity=".35" />
        </svg>
      </div>
      <div className={styles.waChat}>
        <p className={styles.waDate}>hoy</p>
        <div className={`${styles.waBubble} ${styles.waIn}`}>
          ¡Hola! Esperamos que hayan tenido una hermosa estadía en tu recinto.
          <span className={styles.waMeta}>11:02 <b className={styles.ticks}>✓✓</b></span>
        </div>
        <div className={`${styles.waBubble} ${styles.waIn}`}>
          Su <strong>check-out fue registrado</strong> con éxito. Tu Cabaña 1 quedó impecable, ¡gracias por cuidarla!
          <span className={styles.waMeta}>11:03 <b className={styles.ticks}>✓✓</b></span>
        </div>
        <div className={`${styles.waBubble} ${styles.waIn}`}>
          Si puede responder esta encuesta de 1 minuto sobre su experiencia, nos ayuda muchísimo 🙏
          <span className={styles.waMeta}>11:03 <b className={styles.ticks}>✓✓</b></span>
        </div>
      </div>
      <div className={styles.waInput}>
        <span>Mensaje</span>
        <span className={styles.waSend} aria-hidden>➤</span>
      </div>
    </div>
  )
}

/* ── Mockup Gmail ── */
function GmailMockup() {
  return (
    <div className={styles.gmailWindow}>
      <div className={styles.browserBar}>
        <span className={styles.dotRed} /><span className={styles.dotYel} /><span className={styles.dotGrn} />
        <span className={styles.urlPill}>mail.google.com</span>
      </div>
      <div className={styles.gmailTopbar}>
        <span className={styles.gmailM} aria-hidden>M</span>
        <span className={styles.gmailWord}>Gmail</span>
      </div>
      <div className={styles.gmailBody}>
        <h3 className={styles.gmailSubject}>Check-Out realizado — Reserva #2481 · Tu Recinto</h3>
        <div className={styles.gmailFromRow}>
          <span className={styles.gmailAvatar}>TR</span>
          <div>
            <p className={styles.gmailFrom}>Tu Recinto <span>&lt;reservas@agendio.cl&gt;</span></p>
            <p className={styles.gmailTo}>para huesped@correo.com</p>
          </div>
          <span className={styles.gmailTime}>11:04</span>
        </div>
        <div className={styles.gmailContent}>
          <p>Hola,</p>
          <p>Registramos el <strong>check-out</strong> de su estadía. Este es el resumen:</p>
          <div className={styles.gmailSummaryBox}>
            <p><strong>Alojamiento:</strong> Tu Cabaña 1</p>
            <p><strong>Fechas:</strong> 3 noches · salida hoy</p>
            <p><strong>Total pagado:</strong> $150.000</p>
          </div>
          <p>Gracias por preferirnos. ¡Lo esperamos pronto de vuelta!</p>
          <span className={styles.gmailBtn}>Ver detalle de la reserva</span>
        </div>
      </div>
    </div>
  )
}
