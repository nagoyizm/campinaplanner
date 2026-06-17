'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import styles from './Sidebar.module.css'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendario',   icon: Calendar },
  { href: '/reservas',   label: 'Reservas',     icon: BookOpen },
  { href: '/huespedes',  label: 'Huéspedes',    icon: Users },
  { href: '/reportes',   label: 'Reportes',     icon: BarChart3 },
  { href: '/simulador',  label: 'Simulador Bot', icon: MessageSquare },
  {
    label: 'Configuración',
    icon: Settings,
    children: [
      { href: '/setup/tarifas',   label: 'Tarifas' },
      { href: '/setup/unidades',  label: 'Unidades' },
      { href: '/setup/rooms',     label: 'Habitaciones' },
      { href: '/setup/amenities', label: 'Amenities' },
      { href: '/setup/usuarios',  label: 'Usuarios' },
    ],
  },
]

interface SidebarProps {
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

export default function Sidebar({ theme, onThemeToggle }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
              <span className={styles.logoName}>La Campiña</span>
              <span className={styles.logoSub}>Reservas</span>
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
        <nav className={styles.nav}>
          {navItems.map((item) => {
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
                      {item.children.map((child) => (
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
                href={item.href!}
                className={`${styles.navItem} ${isActive(item.href!) ? styles.active : ''}`}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={18} className={styles.navIcon} />
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className={styles.bottomActions}>
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
