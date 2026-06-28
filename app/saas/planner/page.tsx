import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/org'
import SaasCalendarioClient from './SaasCalendarioClient'

export const dynamic = 'force-dynamic'

function getTodayInSantiago(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

export default async function SaasPlannerPage() {
  await requireSuperAdmin()

  const orgs = await prisma.organization.findMany({
    where: { slug: { not: 'system-habita' } },
    orderBy: { name: 'asc' }
  })

  const payments = await prisma.saasPayment.findMany({
    orderBy: { startDate: 'asc' }
  })

  const events = await prisma.saasEvent.findMany({
    orderBy: { startDate: 'asc' }
  })

  const items = [
    ...payments.map(p => ({ ...p, _type: 'payment' as const })),
    ...events.map(e => ({ ...e, _type: 'event' as const }))
  ]

  return (
    <div style={{ height: 'calc(100vh - 64px)', width: 'calc(100% + 48px)', margin: '-24px', padding: 0 }}>
      <SaasCalendarioClient 
        orgs={orgs}
        items={items as any}
        fechaBase={getTodayInSantiago()}
        todayStr={getTodayInSantiago()}
      />
    </div>
  )
}


