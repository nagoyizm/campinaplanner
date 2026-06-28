import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { requireOrg } from '@/lib/org'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  const { organizationId } = await requireOrg()

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId, organizationId }
  })

  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    notifyWspResConf: user.notifyWspResConf,
    notifyEmailResConf: user.notifyEmailResConf,
    notifyWspCheckOut: user.notifyWspCheckOut,
    notifyEmailCheckOut: user.notifyEmailCheckOut,
    notifyWspCleaning: user.notifyWspCleaning,
    notifyEmailCleaning: user.notifyEmailCleaning,
    notifyWspInvAlert: user.notifyWspInvAlert,
    notifyEmailInvAlert: user.notifyEmailInvAlert,
    defaultHomePage: user.defaultHomePage || '',
  })
}

export async function PUT(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  const { organizationId } = await requireOrg()

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  
  // Verify role
  const checkUser = await prisma.user.findUnique({ where: { id: userId, organizationId } })
  if (!checkUser || !['admin', 'superadmin'].includes(checkUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      notifyWspResConf: body.notifyWspResConf,
      notifyEmailResConf: body.notifyEmailResConf,
      notifyWspCheckOut: body.notifyWspCheckOut,
      notifyEmailCheckOut: body.notifyEmailCheckOut,
      notifyWspCleaning: body.notifyWspCleaning,
      notifyEmailCleaning: body.notifyEmailCleaning,
      notifyWspInvAlert: body.notifyWspInvAlert,
      notifyEmailInvAlert: body.notifyEmailInvAlert,
      defaultHomePage: body.defaultHomePage || null,
    }
  })

  return NextResponse.json({ success: true })
}
