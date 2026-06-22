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

  return [
    { href: '/dashboard',  label: 'Home',         icon: LayoutDashboard },
    { href: '/recepcion',  label: 'Recepción',    icon: LayoutDashboard },
    { href: '/calendario', label: 'Calendario',   icon: Calendar },
    { href: '/reservas',   label: 'Reservas',     icon: BookOpen },
    { href: '/habitaciones', label: 'Habitaciones', icon: Hotel },
    { href: '/huespedes',  label: 'Huéspedes',    icon: Users },
    { href: '/pizarra',    label: 'Pizarra / Memo', icon: MessageSquare },
    { href: '/reportes',   label: 'Reportes',     icon: BarChart3 },
    {
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
    },
    { href: '/simulador',  label: 'Simulador Bot', icon: MessageSquare },
  ]
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
  const [setupOpen, setSetupOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [waConnected, setWaConnected] = useState<boolean | null>(null)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isSetupActive = pathname.startsWith('/setup')

  useEffect(() => {
    if (isSetupActive) setSetupOpen(true)
  }, [isSetupActive])

  useEffect(() => {
    if (collapsed) {
      document.documentElement.classList.add('sidebar-collapsed')
    } else {
      document.documentElement.classList.remove('sidebar-collapsed')
    }
    return () => document.documentElement.classList.remove('sidebar-collapsed')
  }, [collapsed])

  useEffect(() => {
    if (userRole !== 'superadmin') {
      fetch('/api/setup/whatsapp/status')
        .then(res => res.json())
        .then(data => setWaConnected(data.connected))
        .catch(() => setWaConnected(false))
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
                return (
                  <div key={item.label}>
                    <button
                      className={`${styles.navItem} ${isSetupActive ? styles.active : ''}`}
                      onClick={() => setSetupOpen(!setupOpen)}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon size={18} className={styles.navIcon} />
                      {!collapsed && (
                        <>
                          <span className={styles.navLabel}>{item.label}</span>
                          <ChevronRight
                            size={14}
                            className={`${styles.chevron} ${setupOpen ? styles.chevronOpen : ''}`}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && setupOpen && (
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
          {userRole !== 'superadmin' && waConnected !== null && (
            <Link 
              href="/setup/whatsapp"
              className={styles.actionBtn}
              title={waConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
              style={{ color: waConnected ? 'var(--brand-600)' : '#ef4444' }}
            >
              <Smartphone size={16} />
              {!collapsed && (
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  {waConnected ? 'WA Conectado' : 'WA Desconectado'}
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
