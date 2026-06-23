import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const checkedIn = await prisma.reservation.findMany({
    where: { status: 'checked_in' },
    include: { rooms: { include: { room: true } } }
  })
  
  console.log('Checked-in reservations:')
  checkedIn.forEach(r => {
    console.log(`- Res ${r.id} | Arr: ${r.rooms[0]?.arrival.toISOString()} | Dep: ${r.rooms[0]?.departure.toISOString()}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
