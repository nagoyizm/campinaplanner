import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.findMany()
  console.log('Organizations:', orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })))

  const termasOrg = orgs.find(o => o.name.toLowerCase().includes('termas') || o.slug.toLowerCase().includes('termas'))
  if (!termasOrg) {
    console.log('Termas del Sur org not found.')
    return
  }
  console.log('Found org:', termasOrg.name, termasOrg.id)

  const guests = await prisma.guest.findMany({
    where: { organizationId: termasOrg.id },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Found ${guests.length} guests in ${termasOrg.name}`)

  for (let i = 0; i < guests.length; i++) {
    await prisma.guest.update({
      where: { id: guests[i].id },
      data: {
        firstName: 'Huésped',
        lastName: `${i + 1}`,
      }
    })
  }

  console.log('Successfully renamed guests.')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
