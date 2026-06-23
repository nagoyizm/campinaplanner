// ponytail: static knowledge base — zero API cost, instant response
export interface KnowledgeEntry {
  keywords: string[]
  answer: string
  route?: string
  routeLabel?: string
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ── DASHBOARD ──────────────────────────────────────────────────
  {
    keywords: ['dashboard', 'home', 'inicio', 'panel', 'resumen', 'kpi', 'métricas', 'indicadores', 'principal'],
    answer: 'El Dashboard muestra un resumen del día: ocupación actual, reservas pendientes, check-ins y check-outs del día, e ingresos del mes. Es la pantalla de inicio del sistema.',
    route: '/dashboard',
    routeLabel: 'Dashboard',
  },

  // ── RECEPCIÓN ──────────────────────────────────────────────────
  {
    keywords: ['recepcion', 'recepción', 'turno', 'arrivals', 'departures', 'llegadas', 'salidas', 'hoy'],
    answer: 'La pantalla de Recepción muestra las llegadas y salidas del día en curso, permitiendo hacer check-in y check-out de forma rápida. Es la pantalla principal para el personal de turno.',
    route: '/recepcion',
    routeLabel: 'Recepción',
  },
  {
    keywords: ['checkin', 'check-in', 'check in', 'hacer checkin', 'registrar llegada', 'ingresar huesped', 'ingreso'],
    answer: 'Para hacer un Check-In: ve a **Recepción**, busca la reserva en la lista de "Llegadas de Hoy" y haz clic en "Check-In". Puedes también ir a la reserva desde el módulo de Reservas y usar el botón de acción.',
    route: '/recepcion',
    routeLabel: 'Recepción',
  },
  {
    keywords: ['checkout', 'check-out', 'check out', 'hacer checkout', 'registrar salida', 'salida huesped'],
    answer: 'Para hacer un Check-Out: ve a **Recepción**, busca la reserva en la lista de "Salidas de Hoy" y haz clic en "Check-Out". Puedes marcar ítems pendientes (pago, estado de limpieza) antes de confirmar.',
    route: '/recepcion',
    routeLabel: 'Recepción',
  },

  // ── CALENDARIO ──────────────────────────────────────────────────
  {
    keywords: ['calendario', 'calendar', 'gantt', 'ocupacion', 'ocupación', 'grilla', 'vista mensual', 'disponibilidad'],
    answer: 'El Calendario muestra una vista tipo Gantt de todas las habitaciones y sus reservas a lo largo del tiempo. Puedes ver ocupación, fechas libres y navegar entre meses.',
    route: '/calendario',
    routeLabel: 'Calendario',
  },

  // ── RESERVAS ────────────────────────────────────────────────────
  {
    keywords: ['reserva', 'reservas', 'nueva reserva', 'crear reserva', 'agregar reserva', 'booking'],
    answer: 'En el módulo de **Reservas** puedes ver todas las reservas, filtrarlas por estado, y crear nuevas usando el botón "+ Nueva Reserva". También puedes hacer check-in/out y registrar pagos desde aquí.',
    route: '/reservas',
    routeLabel: 'Reservas',
  },
  {
    keywords: ['pago', 'pagos', 'registrar pago', 'abono', 'cobrar', 'monto', 'total'],
    answer: 'Para registrar un pago: ve a la reserva específica en **Reservas**, y dentro del detalle encontrarás la sección de "Pagos" donde puedes agregar un abono indicando monto y método de pago.',
    route: '/reservas',
    routeLabel: 'Reservas',
  },
  {
    keywords: ['cancelar reserva', 'cancelacion', 'cancelación', 'anular reserva'],
    answer: 'Para cancelar una reserva: abre la reserva desde el módulo de **Reservas** y cambia su estado a "Cancelada" usando el menú de acciones o el botón de estado.',
    route: '/reservas',
    routeLabel: 'Reservas',
  },
  {
    keywords: ['extra', 'extras', 'servicio adicional', 'agregar servicio', 'amenity'],
    answer: 'Para agregar extras a una reserva (ej: desayuno, leña, etc.): abre la reserva en **Reservas** y usa la sección de "Extras" para agregar ítems del catálogo de amenities.',
    route: '/reservas',
    routeLabel: 'Reservas',
  },

  // ── HABITACIONES ────────────────────────────────────────────────
  {
    keywords: ['habitacion', 'habitaciones', 'cabaña', 'cabañas', 'suite', 'estado limpieza', 'limpiar', 'mantenimiento'],
    answer: 'El módulo de **Habitaciones** muestra el estado de limpieza de cada unidad (limpia, sucia, en mantenimiento). Puedes actualizar el estado de limpieza y ver notas de cada habitación.',
    route: '/habitaciones',
    routeLabel: 'Habitaciones',
  },
  {
    keywords: ['estado habitacion', 'marcar limpia', 'marcar sucia', 'limpieza', 'housekeeping'],
    answer: 'Ve a **Habitaciones** para ver y actualizar el estado de limpieza de cada unidad. Puedes marcar una habitación como limpia, sucia o en mantenimiento con un solo clic.',
    route: '/habitaciones',
    routeLabel: 'Habitaciones',
  },

  // ── HUÉSPEDES ────────────────────────────────────────────────────
  {
    keywords: ['huesped', 'huéspedes', 'pasajero', 'pasajeros', 'cliente', 'clientes', 'crm', 'buscar huesped'],
    answer: 'El módulo de **Huéspedes** es el CRM del sistema. Puedes buscar, ver el historial de estadías, editar datos de contacto, agregar notas y tags (VIP, Frecuente, etc.) de cada huésped.',
    route: '/huespedes',
    routeLabel: 'Huéspedes',
  },
  {
    keywords: ['tag', 'etiqueta', 'vip', 'marcar vip', 'nota huesped'],
    answer: 'Para agregar tags (VIP, Ruidoso, Frecuente, etc.) a un huésped: ve a **Huéspedes**, busca al huésped y edita su perfil para agregar o quitar etiquetas.',
    route: '/huespedes',
    routeLabel: 'Huéspedes',
  },

  // ── PIZARRA / MEMO ──────────────────────────────────────────────
  {
    keywords: ['pizarra', 'memo', 'nota', 'notas', 'aviso', 'mensaje interno', 'comunicacion interna'],
    answer: 'La **Pizarra** es el sistema de notas y avisos internos entre el personal. Puedes publicar memos visibles para todo el equipo o para un usuario específico.',
    route: '/pizarra',
    routeLabel: 'Pizarra / Memo',
  },

  // ── INVENTARIO ──────────────────────────────────────────────────
  {
    keywords: ['inventario', 'stock', 'productos', 'insumos', 'limpieza', 'amenidades', 'compras'],
    answer: 'El módulo de **Inventario** gestiona el stock de insumos (limpieza, amenidades, etc.) y sus costos. Puedes registrar compras, usar ítems y ver el historial de transacciones.',
    route: '/inventario',
    routeLabel: 'Inventario',
  },
  {
    keywords: ['agregar item inventario', 'nuevo item', 'crear producto', 'registrar compra'],
    answer: 'Para agregar un ítem al inventario: ve a **Inventario** y usa el botón "+ Nuevo Ítem". Para registrar una compra o uso, selecciona el ítem y agrega una transacción.',
    route: '/inventario',
    routeLabel: 'Inventario',
  },

  // ── REPORTES ────────────────────────────────────────────────────
  {
    keywords: ['reporte', 'reportes', 'informe', 'estadisticas', 'estadísticas', 'analisis', 'análisis'],
    answer: 'El módulo de **Reportes** tiene 5 sub-secciones: Financiero, Habitaciones, Huéspedes, Inventario y Fechas. Cada uno ofrece gráficos y tablas exportables.',
    route: '/reportes/financiero',
    routeLabel: 'Reportes',
  },
  {
    keywords: ['reporte financiero', 'ingresos', 'facturacion', 'facturación', 'ventas', 'dinero'],
    answer: 'El **Reporte Financiero** muestra ingresos por período, desglose por método de pago, y comparativas. Puedes exportarlo a Excel o PDF.',
    route: '/reportes/financiero',
    routeLabel: 'Reporte Financiero',
  },
  {
    keywords: ['reporte habitaciones', 'ocupacion habitaciones', 'noches vendidas'],
    answer: 'El **Reporte de Habitaciones** muestra la tasa de ocupación por unidad, noches vendidas y comparativas. Ve a Reportes → Habitaciones.',
    route: '/reportes/habitaciones',
    routeLabel: 'Reporte Habitaciones',
  },
  {
    keywords: ['reporte huespedes', 'reporte pasajeros', 'origen', 'nacionalidad'],
    answer: 'El **Reporte de Huéspedes** muestra estadísticas de pasajeros: nacionalidades, huéspedes frecuentes, nuevos vs recurrentes. Ve a Reportes → Huéspedes.',
    route: '/reportes/huespedes',
    routeLabel: 'Reporte Huéspedes',
  },
  {
    keywords: ['reporte inventario', 'gasto inventario', 'costo insumos'],
    answer: 'El **Reporte de Inventario** muestra los gastos en insumos por categoría y período. Ve a Reportes → Inventario.',
    route: '/reportes/inventario',
    routeLabel: 'Reporte Inventario',
  },
  {
    keywords: ['exportar excel', 'descargar excel', 'exportar pdf', 'descargar reporte'],
    answer: 'Puedes exportar los reportes a Excel o PDF desde la pantalla de cada reporte. Busca los botones de descarga en la parte superior de la tabla.',
    route: '/reportes/financiero',
    routeLabel: 'Reportes',
  },

  // ── ADMINISTRACIÓN ──────────────────────────────────────────────
  {
    keywords: ['administracion', 'administración', 'admin', 'configurar org', 'datos empresa'],
    answer: 'El módulo de **Administración** permite configurar los datos de la organización, paleta de colores, logo, y preferencias generales.',
    route: '/administracion',
    routeLabel: 'Administración',
  },

  // ── CONFIGURACIÓN ────────────────────────────────────────────────
  {
    keywords: ['configuracion', 'configuración', 'setup', 'ajustes'],
    answer: 'La sección de **Configuración** tiene varios sub-módulos: Tarifas, Tipos de Unidad, Habitaciones, Amenities, Usuarios y WhatsApp Bot.',
    route: '/setup/tarifas',
    routeLabel: 'Configuración',
  },
  {
    keywords: ['tarifa', 'tarifas', 'precio', 'rack rate', 'precio por noche', 'temporada'],
    answer: 'Para configurar tarifas: ve a **Configuración → Tarifas**. Puedes crear y editar tarifas por tipo de unidad, incluyendo precio base, recargos por persona extra y recargo de fin de semana.',
    route: '/setup/tarifas',
    routeLabel: 'Configuración Tarifas',
  },
  {
    keywords: ['usuario', 'usuarios', 'nuevo usuario', 'crear usuario', 'permisos', 'rol', 'roles'],
    answer: 'Para gestionar usuarios: ve a **Configuración → Usuarios**. Puedes crear, editar y desactivar usuarios, y asignar roles (admin, operator, observer).',
    route: '/setup/usuarios',
    routeLabel: 'Configuración Usuarios',
  },
  {
    keywords: ['whatsapp', 'bot whatsapp', 'qr', 'conectar whatsapp', 'notificaciones whatsapp'],
    answer: 'La configuración del **Bot de WhatsApp** está en Configuración → WhatsApp Bot. Desde ahí puedes escanear el QR para conectar, ver el estado de conexión y configurar las notificaciones automáticas.',
    route: '/setup/whatsapp',
    routeLabel: 'WhatsApp Bot',
  },
  {
    keywords: ['amenity', 'amenities', 'servicio', 'servicios', 'catalogo', 'catálogo'],
    answer: 'Los Amenities son los servicios extras del catálogo (desayuno, leña, etc.). Para configurarlos: ve a **Configuración → Amenities**.',
    route: '/setup/amenities',
    routeLabel: 'Configuración Amenities',
  },
  {
    keywords: ['unidad', 'unidades', 'tipo unidad', 'tipo habitacion', 'tipo cabaña'],
    answer: 'Los tipos de unidad (Cabaña 5P, Suite Deluxe, etc.) se configuran en **Configuración → Unidades**. Define el nombre, capacidad máxima y descripción.',
    route: '/setup/unidades',
    routeLabel: 'Configuración Unidades',
  },

  // ── NOTIFICACIONES ──────────────────────────────────────────────
  {
    keywords: ['notificacion', 'notificaciones', 'alerta', 'alertas', 'aviso automático'],
    answer: 'Las notificaciones automáticas por WhatsApp y Email se configuran por usuario en **Configuración → Usuarios**. Cada usuario puede elegir si recibe avisos de check-in, check-out, limpieza o inventario bajo.',
    route: '/setup/usuarios',
    routeLabel: 'Configuración Usuarios',
  },

  // ── SAAS (solo superadmin) ────────────────────────────────────────
  {
    keywords: ['saas', 'clientes saas', 'gestion clientes', 'organizaciones', 'tenants'],
    answer: 'El panel **SaaS** es exclusivo para el superadministrador. Desde ahí puedes ver y gestionar todas las organizaciones clientes, sus pagos y estado de suscripción.',
    route: '/saas',
    routeLabel: 'SaaS Dashboard',
  },
]

// Simple keyword scoring: counts normalized keyword matches
export function scoreEntry(entry: KnowledgeEntry, query: string): number {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let score = 0
  for (const kw of entry.keywords) {
    const normalized = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (q.includes(normalized)) score += normalized.split(' ').length // multi-word keywords score higher
  }
  return score
}

export function searchKnowledge(query: string): { entry: KnowledgeEntry; score: number } | null {
  let best: { entry: KnowledgeEntry; score: number } | null = null
  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreEntry(entry, query)
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score }
    }
  }
  return best
}
