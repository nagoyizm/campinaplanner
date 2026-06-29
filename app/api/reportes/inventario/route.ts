import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/org'

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrg()
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      organizationId,
      date: { gte: start, lte: end }
    },
    include: {
      item: true
    },
    orderBy: { date: 'asc' }
  })

  let totalPurchases = 0
  let totalUsage = 0
  
  const categoryMap: Record<string, { purchases: number, usage: number }> = {}
  const itemMap: Record<string, { name: string, category: string, purchases: number, usage: number, netChange: number }> = {}

  transactions.forEach(t => {
    // Removed useless variables
    
    // Some systems log totalCost as positive for purchases, and zero or positive for usage cost basis.
    // In our system, totalCost = quantityChange * unitCost.
    // For purchases: quantity > 0 -> totalCost > 0
    // For usage: quantity < 0 -> totalCost < 0
    
    const absCost = Math.abs(t.totalCost)
    
    if (t.type === 'purchase') totalPurchases += absCost
    if (t.type === 'usage' || t.type === 'adjustment' && t.quantityChange < 0) totalUsage += absCost

    const cat = t.item.category
    if (!categoryMap[cat]) categoryMap[cat] = { purchases: 0, usage: 0 }
    
    if (t.type === 'purchase') categoryMap[cat].purchases += absCost
    else categoryMap[cat].usage += absCost

    const itm = t.item.id
    if (!itemMap[itm]) itemMap[itm] = { name: t.item.name, category: cat, purchases: 0, usage: 0, netChange: 0 }
    
    if (t.type === 'purchase') itemMap[itm].purchases += absCost
    else itemMap[itm].usage += absCost
    
    itemMap[itm].netChange += t.quantityChange
  })

  const categories = Object.entries(categoryMap).map(([name, data]) => ({ name, ...data }))
  const items = Object.entries(itemMap).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.usage - a.usage)

  return NextResponse.json({
    summary: {
      totalPurchases,
      totalUsage,
      transactionCount: transactions.length
    },
    categories,
    items
  })
}
