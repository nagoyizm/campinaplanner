const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- RECENT RESERVATIONS ---')
  const rsvs = await prisma.reservation.findMany({
    include: {
      guest: true,
      rooms: {
        include: { room: true }
      }
    },
    orderBy: { id: 'desc' }
  })
  
  for (const r of rsvs) {
    console.log(`Rsv #${r.id} - Guest: ${r.guest.firstName} ${r.guest.lastName} - Status: ${r.status}`)
    for (const line of r.rooms) {
      console.log(`  - Room: ${line.room.name} (${line.room.code})`)
      console.log(`    Arrival: ${line.arrival.toISOString()} (Raw: ${line.arrival})`)
      console.log(`    Departure: ${line.departure.toISOString()} (Raw: ${line.departure})`)
      console.log(`    Nights: ${line.nights}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
