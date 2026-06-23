import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tables = [
    'InventoryTransaction',
    'SaasEvent',
    'Memo',
    'WhatsAppSession',
    'InventoryItem',
    'SaasPayment'
  ]

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`)
      console.log(`✅ RLS activado para la tabla: ${table}`)
    } catch (e: any) {
      console.error(`❌ Error activando RLS en ${table}: ${e.message}`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
