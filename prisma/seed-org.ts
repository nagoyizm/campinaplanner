/**
 * prisma/seed-org.ts
 * Crea la organización raíz "Cabañas La Campiña" con el ID fijo
 * que se usa como @default en todos los modelos.
 * Ejecutar ANTES de hacer db push con las FKs.
 *
 * npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-org.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Desactivar las FKs temporalmente no es posible en Postgres,
  // por eso insertamos la org primero.
  await prisma.$executeRaw`
    INSERT INTO "Organization" (id, name, slug, timezone, currency, plan, active, "createdAt", "updatedAt")
    VALUES (
      'seed-org-campina',
      'Cabañas La Campiña',
      'campina',
      'America/Santiago',
      'CLP',
      'pro',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `
  console.log('✅ Organización "campina" creada o ya existía.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
