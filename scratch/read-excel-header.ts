import XLSX from 'xlsx';

function main() {
  const filePath = './scratch/Database PAX ene2022-jul2026.xlsx';
  console.log('Reading file:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet names:', sheetNames);
  
  if (sheetNames.length > 0) {
    const sheet = workbook.Sheets[sheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    console.log('Total objects:', data.length);
    console.log('First 5 objects:');
    console.log(data.slice(0, 5));
  }
}

main();
