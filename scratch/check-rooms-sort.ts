import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rooms = await prisma.room.findMany({
    orderBy: { sortOrder: 'asc' }
  })
  
  console.log('Current rooms in DB:')
  rooms.forEach(r => {
    console.log(`- ${r.name} (sortOrder: ${r.sortOrder})`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
