import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.guest.count()
  console.log(`Total guests in Supabase: ${count}`)
  
  const sample = await prisma.guest.findMany({
    take: 5,
    orderBy: { firstName: 'asc' }
  })
  
  console.log('Sample guests (first 5):')
  for (const g of sample) {
    console.log(`- ${g.firstName} ${g.lastName} (RUT: ${g.rut || 'N/A'}, País: ${g.nationality})`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
