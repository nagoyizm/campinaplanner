'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { Palette, Check } from 'lucide-react'
import styles from './PalettePicker.module.css'

const PALETTES = [
  { id: 'verde',    label: 'Verde',    color: '#4b6f50' },
  { id: 'azul',     label: 'Azul',     color: '#2563eb' },
  { id: 'rojizo',   label: 'Rojizo',   color: '#be123c' },
  { id: 'crema',    label: 'Crema',    color: '#b45309' },
  { id: 'morado',   label: 'Morado',   color: '#7c3aed' },
  { id: 'turquesa', label: 'Turquesa', color: '#0d9488' },
]

interface PalettePickerProps {
  currentPalette: string
  collapsed: boolean
  onPaletteChange: (palette: string) => void
}

export default function PalettePicker({ currentPalette, collapsed, onPaletteChange }: Readonly<PalettePickerProps>) {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({ top: rect.bottom + 8, left: rect.left })
    }
  }, [open])

  if (role !== 'admin' && role !== 'superadmin') return null

  const handleSelect = async (id: string) => {
    if (id === currentPalette || saving) return
    setSaving(true)
    setOpen(false)

    // Apply instantly for UX
    document.documentElement.dataset.palette = id
    localStorage.setItem('palette', id)

    // Persist to DB
    await fetch('/api/setup/organization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorPalette: id }),
    })

    setSaving(false)
    onPaletteChange(id)
  }

  const current = PALETTES.find(p => p.id === currentPalette) ?? PALETTES[0]

  return (
    <div className={styles.wrapper}>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => setOpen(!open)}
        title="Paleta de colores"
      >
        <Palette size={16} />
        {!collapsed && <span>{current.label}</span>}
        {!collapsed && (
          <span className={styles.dot} style={{ background: current.color }} />
        )}
      </button>

      {open && mounted && createPortal(
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} role="presentation" />
          <div className={styles.dropdown} style={{ top: coords.top, left: coords.left }}>
            <p className={styles.dropdownTitle}>Paleta de colores</p>
            <div className={styles.grid}>
              {PALETTES.map(p => (
                <button
                  key={p.id}
                  className={`${styles.paletteBtn} ${p.id === currentPalette ? styles.active : ''}`}
                  onClick={() => handleSelect(p.id)}
                  title={p.label}
                >
                  <span className={styles.swatch} style={{ background: p.color }} />
                  <span className={styles.paletteName}>{p.label}</span>
                  {p.id === currentPalette && <Check size={12} className={styles.checkIcon} />}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
