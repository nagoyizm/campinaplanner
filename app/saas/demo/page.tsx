'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import {
  DEFAULT_AGENDIO_TEXTS, DEFAULT_PLANNER_TEXTS,
  mergeAgendio, mergePlanner,
  type AgendioText, type PlannerText,
} from '@/app/demo/demo-texts'
import styles from './demo-editor.module.css'

export default function SaasDemoTextsPage() {
  const [agendio, setAgendio] = useState<AgendioText[]>(DEFAULT_AGENDIO_TEXTS)
  const [planner, setPlanner] = useState<PlannerText[]>(DEFAULT_PLANNER_TEXTS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/public/demo-texts')
      .then(r => r.json())
      .then(data => {
        if (data.agendio) setAgendio(mergeAgendio(data.agendio))
        if (data.planner) setPlanner(mergePlanner(data.planner))
      })
      .catch(() => toast.error('No se pudieron cargar los textos guardados'))
  }, [])

  const patchAgendio = (id: string, field: 'title' | 'text', value: string) =>
    setAgendio(list => list.map(s => (s.id === id ? { ...s, [field]: value } : s)))
  const patchPlanner = (id: string, field: 'label' | 'text', value: string) =>
    setPlanner(list => list.map(s => (s.id === id ? { ...s, [field]: value } : s)))

  const save = async () => {
    setSaving(true)
    try {
      const agendioOverrides: Record<string, { title: string; text: string }> = {}
      for (const s of agendio) {
        const def = DEFAULT_AGENDIO_TEXTS.find(d => d.id === s.id)!
        if (s.title !== def.title || s.text !== def.text) agendioOverrides[s.id] = { title: s.title, text: s.text }
      }
      const plannerOverrides: Record<string, { label: string; text: string }> = {}
      for (const s of planner) {
        const def = DEFAULT_PLANNER_TEXTS.find(d => d.id === s.id)!
        if (s.label !== def.label || s.text !== def.text) plannerOverrides[s.id] = { label: s.label, text: s.text }
      }
      const res = await fetch('/api/saas/demo-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendio: agendioOverrides, planner: plannerOverrides }),
      })
      if (!res.ok) throw new Error()
      toast.success('Textos de la demo guardados')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.pageTitle}>Textos de la Demo</h2>
          <p className={styles.pageSub}>
            Edita los títulos y narraciones de los 14 pasos del recorrido público (/demo).
            Los campos vacíos o sin cambios usan el texto por defecto.
          </p>
        </div>
        <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Reserva pública <span className={styles.range}>pasos 1–6 · /demo/agendio</span></h3>
        {agendio.map((s, i) => (
          <div key={s.id} className={styles.stepCard}>
            <p className={styles.stepNum}>Paso {i + 1}</p>
            <label className={styles.field}>
              <span className={styles.label}>Título</span>
              <input className={styles.input} value={s.title} onChange={e => patchAgendio(s.id, 'title', e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Narración</span>
              <textarea className={styles.textarea} rows={3} value={s.text} onChange={e => patchAgendio(s.id, 'text', e.target.value)} />
            </label>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Planner y ciclo de vida <span className={styles.range}>pasos 7–14 · /demo/planner</span></h3>
        {planner.map((s, i) => (
          <div key={s.id} className={styles.stepCard}>
            <p className={styles.stepNum}>Paso {i + 7}</p>
            <label className={styles.field}>
              <span className={styles.label}>Etiqueta</span>
              <input className={styles.input} value={s.label} onChange={e => patchPlanner(s.id, 'label', e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Narración</span>
              <textarea className={styles.textarea} rows={3} value={s.text} onChange={e => patchPlanner(s.id, 'text', e.target.value)} />
            </label>
          </div>
        ))}
      </section>

      <div className={styles.footerBar}>
        <button type="button" className={styles.saveBtn} onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
