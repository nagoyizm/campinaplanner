import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rooms = await prisma.room.findMany({
    where: { sortOrder: 0 }
  })
  
  for (const room of rooms) {
    // Extract the first number found in the room name
    const match = /\d+/.exec(room.name)
    if (match) {
      const order = Number.parseInt(match[0], 10)
      await prisma.room.update({
        where: { id: room.id },
        data: { sortOrder: order }
      })
      console.log(`Updated ${room.name} to sortOrder ${order}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
