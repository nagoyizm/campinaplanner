const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findFirst({
    where: { slug: 'campina' },
    include: {
      unitTypes: {
        include: {
          rooms: true
        }
      }
    }
  })

  console.log('ORG:', org?.name, 'SLUG:', org?.slug)
  console.log('UNITS:')
  org?.unitTypes.forEach(u => {
    console.log(`- ${u.name} (id: ${u.id}, active: ${u.active}, rooms: ${u.rooms.length})`)
  })
}

main().finally(() => prisma.$disconnect())
