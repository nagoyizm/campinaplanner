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
    if (memo.targetUserId && memo.targetUser?.phone) {
      const msg = `*Memo de ${memo.author}*\n${memo.content}`
      await sendWhatsAppMessage(memo.targetUser.phone, msg, organizationId).catch(console.error)
    } else if (!memo.targetUserId) {
      const users = await prisma.user.findMany({
        where: { organizationId, phone: { not: null } }
      })
      const msg = `*Memo general de ${memo.author}*\n${memo.content}`
      const promises = users.map(u => 
        sendWhatsAppMessage(u.phone as string, msg, organizationId).catch(console.error)
      )
      await Promise.all(promises)
    }

    return NextResponse.json(memo)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear el memo' }, { status: 500 })
  }
}
