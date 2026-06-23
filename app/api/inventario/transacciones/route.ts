import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { auth } from '@/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { organizationId, role } = await requireOrg()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const session = await auth()
    const userId = session?.user?.id

    const body = await req.json()
    const { itemId, type, quantity, notes } = body

    if (!itemId || !['purchase', 'usage', 'adjustment'].includes(type) || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Usar una transacción de prisma para garantizar la atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener el item actual para sacar su costo y balance
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId, organizationId }
      })

      if (!item) throw new Error('Item no encontrado')

      // Determinar el cambio (+ o -)
      let change = 0
      if (type === 'purchase') change = quantity
      else if (type === 'usage') change = -quantity
      else {
        // Para 'adjustment', quantity es el nuevo valor absoluto, por lo que el cambio es:
        change = quantity - item.currentQuantity
      }

      const totalCost = type === 'purchase' ? quantity * item.unitCost : 0

      // 2. Actualizar la cantidad
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentQuantity: item.currentQuantity + change
        }
      })

      // 3. Registrar la transacción
      const transaction = await tx.inventoryTransaction.create({
        data: {
          organizationId,
          itemId,
          type,
          quantityChange: change,
          unitCost: item.unitCost,
          totalCost: totalCost,
          notes,
          userId
        }
      })

      // 4. Alertar si baja del mínimo
      if (item.currentQuantity > item.minQuantity && updatedItem.currentQuantity <= item.minQuantity) {
        try {
          const notifyAdmins = await tx.user.findMany({
            where: {
              organizationId,
              role: { in: ['admin', 'superadmin'] },
              OR: [{ notifyWspInvAlert: true }, { notifyEmailInvAlert: true }]
            }
          })

          const msg = `⚠️ *Alerta de Inventario:*\nEl ítem *${item.name}* ha alcanzado su stock mínimo (${updatedItem.currentQuantity} / ${item.minQuantity}).`

          for (const admin of notifyAdmins) {
            if (admin.notifyWspInvAlert && admin.phone) {
              await sendWhatsAppMessage(admin.phone, msg, organizationId).catch(console.error)
            }
            if (admin.notifyEmailInvAlert && admin.email) {
              await sendEmail(admin.email, `Alerta de Stock: ${item.name}`, `<p>El ítem <b>${item.name}</b> ha bajado a <b>${updatedItem.currentQuantity}</b> unidades (mínimo esperado: ${item.minQuantity}).</p>`).catch(console.error)
            }
          }
        } catch (notificationError) {
          console.error('Error al enviar notificaciones de inventario:', notificationError)
        }
      }

      return { item: updatedItem, transaction }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Error recording inventory transaction:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
