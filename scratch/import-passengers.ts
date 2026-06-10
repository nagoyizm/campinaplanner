import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

interface ExcelRow {
  Nombres?: string | number;
  Apellidos?: string | number;
  'PAX/Cliente'?: string | number;
  'Desc./Glosa/Estado'?: string | number;
  'Cosas perdidas'?: string | number;
  'Rut/ID/Pasaporte'?: string | number;
  'País'?: string | number;
  Fono?: string | number;
  Email?: string | number;
}

async function main() {
  console.log('📖 Iniciando importación de pasajeros...');
  
  const filePath = './scratch/Database PAX ene2022-jul2026.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as ExcelRow[];
  
  console.log(`📊 Filas encontradas en el Excel: ${rawRows.length}`);
  
  const guestsToInsert: any[] = [];
  const processedRuts = new Set<string>();
  const processedNames = new Set<string>();
  
  let skippedEmpty = 0;
  let skippedDuplicate = 0;

  for (const row of rawRows) {
    const firstName = row.Nombres ? String(row.Nombres).trim() : '';
    const lastName = row.Apellidos ? String(row.Apellidos).trim() : '';
    
    // Si no tiene nombre ni apellido, omitir
    if (!firstName && !lastName) {
      skippedEmpty++;
      continue;
    }
    
    // Limpieza de RUT
    let rut = row['Rut/ID/Pasaporte'] ? String(row['Rut/ID/Pasaporte']).trim() : null;
    if (rut === '-' || rut === '' || rut === 's/i' || rut === 'si') {
      rut = null;
    }

    // Limpieza de Email
    let email = row.Email ? String(row.Email).trim().toLowerCase() : null;
    if (email === '-' || email === '' || email === 's/i' || email === 'si') {
      email = null;
    }

    // Limpieza de Fono
    let phone = row.Fono ? String(row.Fono).trim() : null;
    if (phone === '-' || phone === '' || phone === 's/i' || phone === 'si') {
      phone = null;
    }

    // Limpieza de País
    let nationality = row['País'] ? String(row['País']).trim() : 'Chile';
    if (!nationality || nationality === '-' || nationality === 's/i') {
      nationality = 'Chile';
    }

    // Unificar comentarios y notas
    const rawPaxCliente = row['PAX/Cliente'] ? String(row['PAX/Cliente']).trim() : '';
    const rawGlosa = row['Desc./Glosa/Estado'] ? String(row['Desc./Glosa/Estado']).trim() : '';
    const rawLostItems = row['Cosas perdidas'] ? String(row['Cosas perdidas']).trim() : '';

    let notesParts: string[] = [];
    if (rawPaxCliente && rawPaxCliente.length > 20) {
      notesParts.push(`Nota cliente: ${rawPaxCliente}`);
    }
    if (rawGlosa) {
      notesParts.push(rawGlosa);
    }
    if (rawLostItems) {
      notesParts.push(`Cosas perdidas: ${rawLostItems}`);
    }
    const notes = notesParts.join(' | ') || null;

    // Procesar etiquetas (tags)
    let tagList: string[] = [];
    if (rawPaxCliente) {
      if (rawPaxCliente.length <= 20) {
        tagList.push(rawPaxCliente);
      } else {
        if (/ruidoso/i.test(rawPaxCliente)) tagList.push('ruidoso');
        if (/complicado/i.test(rawPaxCliente)) tagList.push('complicado');
        if (/dañ/i.test(rawPaxCliente)) tagList.push('daños');
        if (/vip/i.test(rawPaxCliente)) tagList.push('VIP');
        if (tagList.length === 0) tagList.push('Alerta');
      }
    }
    const tags = tagList.length > 0 ? JSON.stringify(tagList) : '[]';

    // Evitar duplicados exactos en la importación
    const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
    
    if (rut && processedRuts.has(rut)) {
      skippedDuplicate++;
      continue;
    }
    if (!rut && processedNames.has(nameKey) && email && processedNames.has(email)) {
      skippedDuplicate++;
      continue;
    }

    if (rut) processedRuts.add(rut);
    processedNames.add(nameKey);
    if (email) processedNames.add(email);

    guestsToInsert.push({
      firstName,
      lastName,
      rut,
      email,
      phone,
      nationality,
      notes,
      tags,
      totalStays: 0
    });
  }

  console.log(`🧹 Depuración completada:`);
  console.log(`   - Filas vacías omitidas: ${skippedEmpty}`);
  console.log(`   - Duplicados omitidos: ${skippedDuplicate}`);
  console.log(`   - Pasajeros listos para insertar: ${guestsToInsert.length}`);

  if (guestsToInsert.length > 0) {
    // Insertar en lotes de 100 para evitar límites de parámetros en PostgreSQL
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < guestsToInsert.length; i += batchSize) {
      const batch = guestsToInsert.slice(i, i + batchSize);
      await prisma.guest.createMany({
        data: batch
      });
      insertedCount += batch.length;
      console.log(`🚀 Insertados ${insertedCount}/${guestsToInsert.length}...`);
    }
    
    console.log(`✅ ¡Importación completada! Se insertaron exitosamente ${insertedCount} pasajeros en Supabase.`);
  } else {
    console.log('⚠️ No se encontraron pasajeros válidos para importar.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante la importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
