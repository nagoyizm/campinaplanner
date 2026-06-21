import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'
import { auth } from '@/auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const memos = await prisma.memo.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
  return NextResponse.json(memos)
}

export async function POST(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const session = await auth()
  try {
    const { content, targetUserId } = await req.json()
    if (!content) return NextResponse.json({ error: 'Falta contenido' }, { status: 400 })

    const memo = await prisma.memo.create({
      data: {
        organizationId,
        content,
        author: session?.user?.name || 'Administración',
        targetUserId: targetUserId || null
      },
      include: { targetUser: { select: { name: true, roleName: true, phone: true } } }
    })

    // Send WhatsApp Notification
    if (memo.targetUser?.phone) {
      const msg = `*Nuevo Memo en Campiña Planner*\nDe: ${memo.author}\nPara: ${memo.targetUser.name}\n\n${memo.content}`
      // Fire and forget (don't await so it doesn't block response)
      sendWhatsAppMessage(memo.targetUser.phone, msg).catch(console.error)
    }

    return NextResponse.json(memo)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear el memo' }, { status: 500 })
  }
}
