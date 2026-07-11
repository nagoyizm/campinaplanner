import { prisma } from '@/lib/prisma'

/**
 * Registra un evento crítico en la tabla de auditoría (AuditLog).
 * Útil para acciones destructivas, cambios de seguridad, importaciones/exportaciones, etc.
 */
export async function logAudit({
  organizationId,
  userId,
  action,
  details,
  reservationId,
}: {
  organizationId: string;
  userId?: string;
  action: string;
  details?: string;
  reservationId?: number;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        details,
        reservationId,
      }
    })
  } catch (error) {
    console.error('Error guardando AuditLog:', error)
  }
}
