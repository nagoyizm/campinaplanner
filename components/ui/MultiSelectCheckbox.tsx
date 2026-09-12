'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, X, Search } from 'lucide-react'
import Icon from './Icon'
import styles from './MultiSelectCheckbox.module.css'

export interface MultiSelectOption {
  id: string
  label: string
  sublabel?: string
  category?: string
}

export interface QuickFilter {
  label: string
  filterFn: (opt: MultiSelectOption) => boolean
}

interface MultiSelectCheckboxProps {
  options: MultiSelectOption[]
  selectedIds: string[]
  onChange: (newSelected: string[]) => void
  placeholder?: string
  labelAll?: string
  quickFilters?: QuickFilter[]
  disabled?: boolean
  width?: string | number
  id?: string
}

export default function MultiSelectCheckbox({
  options,
  selectedIds,
  onChange,
  placeholder = 'Seleccionar...',
  labelAll = 'Todos',
  quickFilters = [],
  disabled = false,
  width,
  id,
}: MultiSelectCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    )
  }, [options, searchQuery])

  // Toggle single option
  const handleToggle = (idToToggle: string) => {
    if (selectedIds.includes(idToToggle)) {
      onChange(selectedIds.filter((id) => id !== idToToggle))
    } else {
      onChange([...selectedIds, idToToggle])
    }
  }

  // Quick action: Select all
  const handleSelectAll = () => {
    onChange(options.map((o) => o.id))
  }

  // Quick action: Clear all
  const handleClearAll = () => {
    onChange([])
  }

  // Quick action: Custom filter
  const handleApplyQuickFilter = (qf: QuickFilter) => {
    const matchingIds = options.filter(qf.filterFn).map((o) => o.id)
    onChange(matchingIds)
  }

  // Determine trigger label text
  const triggerLabel = useMemo(() => {
    if (options.length === 0) return placeholder
    if (selectedIds.length === 0 || selectedIds.length === options.length) {
      return `${labelAll} (${options.length})`
    }
    if (selectedIds.length === 1) {
      const match = options.find((o) => o.id === selectedIds[0])
      return match ? match.label : placeholder
    }
    return `${selectedIds.length} seleccionados`
  }, [options, selectedIds, labelAll, placeholder])

  const isAllSelected = selectedIds.length === 0 || selectedIds.length === options.length

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ width: width || '100%' }}
      id={id}
    >
      <button
        type="button"
        disabled={disabled}
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerContent}>
          <span>{triggerLabel}</span>
          {!isAllSelected && selectedIds.length > 1 && (
            <span className={styles.badge}>{selectedIds.length}</span>
          )}
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`}>
          <Icon icon={ChevronDown} size="sm" />
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {/* Quick actions chips */}
          <div className={styles.quickActions}>
            <button
              type="button"
              className={`${styles.quickChip} ${isAllSelected ? styles.quickChipActive : ''}`}
              onClick={handleSelectAll}
            >
              Todos
            </button>
            <button
              type="button"
              className={`${styles.quickChip} ${selectedIds.length === 0 ? styles.quickChipActive : ''}`}
              onClick={handleClearAll}
            >
              Ninguno
            </button>
            {quickFilters.map((qf) => {
              const matchingIds = options.filter(qf.filterFn).map((o) => o.id)
              const isActive =
                matchingIds.length > 0 &&
                matchingIds.length === selectedIds.length &&
                matchingIds.every((id) => selectedIds.includes(id))
              return (
                <button
                  key={qf.label}
                  type="button"
                  className={`${styles.quickChip} ${isActive ? styles.quickChipActive : ''}`}
                  onClick={() => handleApplyQuickFilter(qf)}
                >
                  {qf.label}
                </button>
              )
            })}
          </div>

          {/* Search bar if > 5 options */}
          {options.length > 5 && (
            <div className={styles.searchWrapper}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Options list */}
          <div className={styles.optionsList} role="listbox">
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className={`${styles.optionItem} ${isSelected ? styles.optionItemSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isSelected}
                      onChange={() => handleToggle(opt.id)}
                    />
                    <div className={styles.optionText}>
                      <span>{opt.label}</span>
                      {opt.sublabel && <span className={styles.sublabel}>{opt.sublabel}</span>}
                    </div>
                  </label>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <span>
              {selectedIds.length === 0 || selectedIds.length === options.length
                ? 'Todos seleccionados'
                : `${selectedIds.length} de ${options.length} seleccionados`}
            </span>
            <button
              type="button"
              className={styles.applyButton}
              onClick={() => setIsOpen(false)}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
