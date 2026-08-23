/* Textos de la demo: valores por defecto + merge con lo editado en /saas/demo */

export interface AgendioText { id: string; title: string; text: string }
export interface PlannerText { id: string; label: string; text: string }

export const DEFAULT_AGENDIO_TEXTS: AgendioText[] = [
  { id: 'sitio', title: 'Sitio público', text: 'Estamos en reservas.agendio.cl, la página pública donde los huéspedes de tu recinto reservan solos. Se muestran tus opciones de alojamiento. ESPACIO para que el huésped elija una.' },
  { id: 'calendario', title: 'Calendario de disponibilidad', text: 'Al elegir una opción se despliega el calendario del mes: verde libre, rojo ocupado y un contador de unidades libres por noche. ESPACIO elige la llegada (15).' },
  { id: 'salida', title: 'Elegir salida', text: 'La llegada quedó marcada como inicio de la estadía. ESPACIO elige la salida (18): al cerrar el rango se despliega el formulario con la cotización calculada al instante según tarifa y ocupación.' },
  { id: 'datos', title: 'Completar datos', text: 'Al cerrar el rango de fechas, el formulario se despliega ya autocompletado con los datos de un huésped ficticio (Tu Huésped): nombre, RUT validado, correo, teléfono y mascota — dato obligatorio en la página real. ESPACIO para continuar.' },
  { id: 'reservar', title: 'Reservar', text: 'Con todo revisado se presiona Reservar. La página crea la solicitud en estado POR CONFIRMAR: sin pago automático ni confirmación instantánea. ESPACIO para enviarla.' },
  { id: 'exito', title: 'Reserva registrada', text: 'Pantalla real de éxito: número de reserva, resumen de la estadía y datos bancarios para transferir la garantía. Tu recinto recibe la solicitud al instante. ESPACIO para seguirla dentro del planner.' },
]

export const DEFAULT_PLANNER_TEXTS: PlannerText[] = [
  { id: 'pendiente', label: 'Reserva recibida', text: 'Estamos dentro del planner, en la pestaña Calendario. La reserva creada en reservas.agendio.cl aparece sola como un bloque ámbar POR CONFIRMAR sobre Tu Cabaña 1, con escudo rojo porque aún no tiene garantía.' },
  { id: 'confirmada', label: 'Confirmación', text: 'Recepción revisa la solicitud y la confirma: el bloque pasa a verde CONFIRMADO y el escudo cambia a garantía pagada. Los días quedan asegurados para el huésped.' },
  { id: 'checkin', label: 'Check-in', text: 'Llega el día de entrada: se registra el check-in, se cobra la garantía y el estado pasa a OCUPADA. El huésped ya está disfrutando tu cabaña.' },
  { id: 'checkout', label: 'Check-out', text: 'Pasó la fecha de salida (hoy): se cierra la cuenta, se registra el pago final y se hace el CHECK-OUT. El bloque queda gris como estadía cerrada y la unidad se libera.' },
  { id: 'huesped', label: 'Huésped en la base de datos', text: 'Al hacer el check-out, el sistema guardó automáticamente al huésped en la base de datos: pestaña Huéspedes muestra su ficha con nombre, RUT, contactos y sus estadías acumuladas para futuras visitas.' },
  { id: 'sucia', label: 'Limpieza pendiente', text: 'Housekeeping trabaja desde la pestaña Habitaciones: Tu Cabaña 1 aparece SIN LIMPIEZA (Limpieza Pendiente) después del huésped, junto al resto de unidades del recinto.' },
  { id: 'lista', label: 'Limpieza lista', text: 'Con un clic se cambia Limpieza Pendiente → Limpia y Lista: la unidad queda disponible en el inventario y puede venderse otra vez.' },
  { id: 'notificaciones', label: 'Notificaciones', text: 'Al cerrar el ciclo, el huésped recibe las notificaciones automáticas: a la izquierda el WhatsApp que llega a su celular y a la derecha el correo en Gmail con el resumen del check-out.' },
]

export type DemoTexts = {
  agendio?: Partial<Record<string, { title?: string; text?: string }>>
  planner?: Partial<Record<string, { label?: string; text?: string }>>
}

/** Aplica los textos guardados sobre los valores por defecto */
export function mergeAgendio(saved: DemoTexts['agendio']): AgendioText[] {
  return DEFAULT_AGENDIO_TEXTS.map(s => ({
    ...s,
    title: saved?.[s.id]?.title ?? s.title,
    text: saved?.[s.id]?.text ?? s.text,
  }))
}

export function mergePlanner(saved: DemoTexts['planner']): PlannerText[] {
  return DEFAULT_PLANNER_TEXTS.map(s => ({
    ...s,
    label: saved?.[s.id]?.label ?? s.label,
    text: saved?.[s.id]?.text ?? s.text,
  }))
}
