const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname);
const files = [];

// Recorrer recursivamente los archivos build.gradle
function findGradleFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findGradleFiles(fullPath);
    } else if (entry.isFile() && entry.name === 'build.gradle') {
      files.push(fullPath);
    }
  }
}

function fixVersionInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('JavaVersion.VERSION_21')) {
    const updated = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
    fs.writeFileSync(filePath, updated);
    console.log(`✅ Corregido: ${filePath}`);
  }
}

findGradleFiles(baseDir);
files.forEach(fixVersionInFile);

if (files.length === 0) {
  console.log('ℹ️ No se encontraron archivos build.gradle.');
}
