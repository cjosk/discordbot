const xlsx = require('xlsx');
const fs = require('fs');

try {
  const workbook = xlsx.readFile('sheet.xlsx');
  const sheetNames = workbook.SheetNames;
  
  const result = {
    sheetNames,
    sheets: {}
  };

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    result.sheets[sheetName] = data.slice(0, 30); // Get first 30 rows
  }

  fs.writeFileSync('output.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Saved to output.json');
} catch (err) {
  console.error('Error:', err);
}
