const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const baseAccounts = [
    'Santander', 'Scotiabank', 'Banco de Chile', 'BE Chequera', 'BE Rut', 'BE Turismo', 'BE Turismo (POS/LP)', 'BCI/MACH', 'Caja'
  ]
  const orgs = await prisma.organization.findMany()

  for (const org of orgs) {
    const currentAccounts = org.bankAccounts ? org.bankAccounts.split(',').filter(Boolean).map(a => a.trim()) : []
    const combined = Array.from(new Set([...baseAccounts, ...currentAccounts]))
    
    await prisma.organization.update({
      where: { id: org.id },
      data: { bankAccounts: combined.join(',') }
    })
    console.log(`Updated org ${org.id} (${org.name}) with accounts: ${combined.join(',')}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
