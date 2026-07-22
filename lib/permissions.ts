export type PermissionLevel = 'none' | 'read' | 'write' | 'full'

export interface ModuleDef {
  key: string
  label: string
  category: 'operaciones' | 'reportes' | 'configuracion'
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Home / Dashboard', category: 'operaciones' },
  { key: 'recepcion', label: 'Recepción', category: 'operaciones' },
  { key: 'calendario', label: 'Calendario', category: 'operaciones' },
  { key: 'reservas', label: 'Reservas', category: 'operaciones' },
  { key: 'habitaciones', label: 'Estado de Habitaciones', category: 'operaciones' },
  { key: 'huespedes', label: 'Base de Huéspedes', category: 'operaciones' },
  { key: 'pizarra', label: 'Pizarra / Memos', category: 'operaciones' },
  { key: 'inventario', label: 'Inventario', category: 'operaciones' },
  { key: 'administracion', label: 'Administración', category: 'operaciones' },
  
  { key: 'reportes', label: 'Reportes (Financiero, etc.)', category: 'reportes' },

  { key: 'setup_tarifas', label: 'Configuración — Tarifas', category: 'configuracion' },
  { key: 'setup_unidades', label: 'Configuración — Unidades', category: 'configuracion' },
  { key: 'setup_rooms', label: 'Configuración — Habitaciones', category: 'configuracion' },
  { key: 'setup_amenities', label: 'Configuración — Amenities', category: 'configuracion' },
  { key: 'setup_pagos', label: 'Configuración — Pagos y DTE', category: 'configuracion' },
  { key: 'setup_usuarios', label: 'Configuración — Usuarios y Permisos', category: 'configuracion' },
  { key: 'setup_whatsapp', label: 'Configuración — WhatsApp Bot', category: 'configuracion' },
]

export type UserPermissions = Record<string, PermissionLevel>

const LEVEL_WEIGHT: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
  full: 3,
}

export function getDefaultPermissionsForRole(role: string): UserPermissions {
  const perms: UserPermissions = {}

  MODULES.forEach(m => {
    if (role === 'admin' || role === 'superadmin') {
      perms[m.key] = 'full'
    } else if (role === 'observer') {
      perms[m.key] = m.category === 'configuracion' ? 'none' : 'read'
    } else if (role === 'recepcionista') {
      const allowed = ['recepcion', 'calendario', 'reservas', 'habitaciones', 'huespedes', 'pizarra']
      perms[m.key] = allowed.includes(m.key) ? 'write' : 'none'
    } else if (role === 'empleado') {
      const allowed = ['pizarra', 'habitaciones']
      perms[m.key] = allowed.includes(m.key) ? 'write' : 'none'
    } else {
      // operator
      if (m.category === 'configuracion') {
        perms[m.key] = 'none'
      } else if (m.key === 'inventario' || m.key === 'reportes' || m.key === 'administracion') {
        perms[m.key] = 'read'
      } else {
        perms[m.key] = 'write'
      }
    }
  })

  return perms
}

export function parsePermissions(rawJson: string | null | undefined, userRole: string): UserPermissions {
  const defaults = getDefaultPermissionsForRole(userRole)
  if (!rawJson) return defaults

  try {
    const parsed = JSON.parse(rawJson)
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...defaults, ...parsed }
    }
  } catch (err) {
    console.error('Error parsing user permissions JSON:', err)
  }

  return defaults
}

export function hasModulePermission(
  userPermissions: UserPermissions | null | undefined,
  userRole: string,
  moduleKey: string,
  requiredLevel: PermissionLevel = 'read'
): boolean {
  if (userRole === 'admin' || userRole === 'superadmin') return true

  const perms = userPermissions || getDefaultPermissionsForRole(userRole)
  const currentLevel = perms[moduleKey] || (userRole === 'observer' ? 'read' : 'none')

  return LEVEL_WEIGHT[currentLevel] >= LEVEL_WEIGHT[requiredLevel]
}
