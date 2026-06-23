'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Hotel,
  BadgeDollarSign,
  Package,
  LogOut,
  Sun,
  Moon,
  Menu,
  MessageSquare,
  Globe,
  Building2,
  LineChart,
  ShieldAlert,
  UsersRound,
  Smartphone,
  Bell,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import PalettePicker from './PalettePicker'
import styles from './Sidebar.module.css'

const getHotelNavItems = (role: string) => {
  if (role === 'empleado') {
    return [
      { href: '/pizarra', label: 'Pizarra / Memo', icon: MessageSquare },
      { href: '/habitaciones', label: 'Habitaciones', icon: Hotel },
    ]
  }

  if (role === 'recepcionista') {
    return [
      { href: '/recepcion', label: 'Recepción', icon: LayoutDashboard },
      { href: '/calendario', label: 'Calendario',   icon: Calendar },
      { href: '/reservas',   label: 'Reservas',     icon: BookOpen },
      { href: '/habitaciones', label: 'Habitaciones', icon: Hotel },
      { href: '/huespedes',  label: 'Huéspedes',    icon: Users },
      { href: '/pizarra',    label: 'Pizarra / Memo', icon: MessageSquare },
    ]
  }

  const nav = [
    { href: '/dashboard',  label: 'Home',         icon: LayoutDashboard },
    { href: '/calendario', label: 'Calendario',   icon: Calendar },
    { href: '/reservas',   label: 'Reservas',     icon: BookOpen },
    { href: '/habitaciones', label: 'Habitaciones', icon: Hotel },
    { href: '/huespedes',  label: 'Huéspedes',    icon: Users },
    { href: '/pizarra',    label: 'Pizarra / Memo', icon: MessageSquare },
  ]

  if (role === 'admin' || role === 'superadmin') {
    nav.push({ href: '/inventario', label: 'Inventario', icon: Package })
    nav.push({ href: '/administracion', label: 'Administración', icon: Bell })
  }

  nav.push({
    label: 'Reportes',
    icon: BarChart3,
    children: [
      { href: '/reportes/financiero', label: 'Financiero' },
      { href: '/reportes/habitaciones', label: 'Habitaciones' },
      { href: '/reportes/huespedes', label: 'Huéspedes' },
      { href: '/reportes/inventario', label: 'Inventario' },
      { href: '/reportes/fechas', label: 'Fechas' },
    ],
  } as any)

  nav.push({
    label: 'Configuración',
    icon: Settings,
    children: [
      { href: '/setup/tarifas',   label: 'Tarifas' },
      { href: '/setup/unidades',  label: 'Unidades' },
      { href: '/setup/rooms',     label: 'Habitaciones' },
      { href: '/setup/amenities', label: 'Amenities' },
      { href: '/setup/usuarios',  label: 'Usuarios' },
      { href: '/setup/whatsapp',  label: 'WhatsApp Bot' },
    ],
  } as any)

  if (role === 'superadmin') {
    nav.push({ href: '/simulador',  label: 'Simulador Bot', icon: MessageSquare } as any)
  }

  return nav
}

const saasNavItems = [
  { href: '/saas',               label: 'SaaS Dashboard', icon: Globe },
  { href: '/saas/clientes',      label: 'Gestión Clientes',icon: Building2 },
  { href: '/saas/usuarios',      label: 'Usuarios Global', icon: UsersRound },
  { href: '/saas/planner',       label: 'SaaS Planner',   icon: Calendar },
  { href: '/saas/analiticas',    label: 'Analíticas',     icon: LineChart },
  { href: '/saas/monitorizacion',label: 'Monitorización', icon: ShieldAlert },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  palette: string
  onPaletteChange: (p: string) => void
}

export default function Sidebar({ theme, onThemeToggle, palette, onPaletteChange }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const orgName = (session?.user as any)?.orgName ?? 'Planner'
  const orgPlan = (session?.user as any)?.orgPlan
  const planDisplay = orgPlan ? orgPlan.charAt(0).toUpperCase() + orgPlan.slice(1) : 'Reservas'
  const userRole = (session?.user as any)?.role ?? 'operator'
  const [collapsed, setCollapsed] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [waConnected, setWaConnected] = useState<boolean | null>(null)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  useEffect(() => {
    if (pathname.startsWith('/setup')) setOpenDropdown('Configuración')
    if (pathname.startsWith('/reportes')) setOpenDropdown('Reportes')
    if (pathname.startsWith('/administracion')) setOpenDropdown(null)
  }, [pathname])

  useEffect(() => {
    if (collapsed) {
      document.documentElement.classList.add('sidebar-collapsed')
    } else {
      document.documentElement.classList.remove('sidebar-collapsed')
    }
    return () => document.documentElement.classList.remove('sidebar-collapsed')
  }, [collapsed])

  useEffect(() => {
    if (userRole === 'admin') {
      fetch('/api/setup/whatsapp/status')
        .then(res => res.json())
        .then(data => setWaConnected(data.connected))
        .catch(() => setWaConnected(false))

      const handleStatusChange = (e: Event) => {
        const customEvent = e as CustomEvent
        setWaConnected(customEvent.detail.connected)
      }
      window.addEventListener('wa-status-change', handleStatusChange)
      return () => window.removeEventListener('wa-status-change', handleStatusChange)
    }
  }, [userRole])

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <Hotel size={20} />
          </div>
          {!collapsed && (
            <div className={styles.logoText}>
              <span className={styles.logoName}>{orgName}</span>
              <span className={styles.logoSub} style={{ fontWeight: 600, color: 'var(--brand-600)' }}>Plan {planDisplay}</span>
            </div>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <div className={styles.navContent}>
          <div className={styles.navSection}>
            {(userRole === 'superadmin' ? saasNavItems : getHotelNavItems(userRole)).map((item: any) => {
              if (item.children) {
                const hasActiveChild = item.children.some((c: any) => isActive(c.href))
                const isOpen = openDropdown === item.label
                return (
                  <div key={item.label}>
                    <button
                      className={`${styles.navItem} ${hasActiveChild ? styles.active : ''}`}
                      onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon size={18} className={styles.navIcon} />
                      {!collapsed && (
                        <>
                          <span className={styles.navLabel}>{item.label}</span>
                          <ChevronRight
                            size={14}
                            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isOpen && (
                      <div className={styles.subNav}>
                        {item.children.map((child: any) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`${styles.subNavItem} ${isActive(child.href) ? styles.active : ''}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon size={18} className={styles.navIcon} />
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className={styles.bottomActions}>
          {userRole === 'admin' && waConnected !== null && (
            <Link 
              href="/setup/whatsapp"
              className={styles.actionBtn}
              title={waConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              style={{ color: waConnected ? 'var(--brand-600)' : '#ef4444' }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.286A11.815 11.815 0 0012.052 0C5.495 0 .16 5.333.158 11.892c0 2.097.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.332 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: waConnected ? '#22c55e' : '#ef4444',
                  boxShadow: waConnected ? '0 0 0 2px var(--surface-1)' : 'none',
                  animation: waConnected ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                }} />
              </div>
              {!collapsed && (
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  {waConnected ? 'WSP conectado' : 'WSP desconectado'}
                </span>
              )}
            </Link>
          )}

          <PalettePicker
            currentPalette={palette}
            collapsed={collapsed}
            onPaletteChange={onPaletteChange}
          />
          <button
            className={styles.actionBtn}
            onClick={onThemeToggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.logoutBtn}`}
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
