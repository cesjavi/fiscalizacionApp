const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname);
const targetVersion = 'JavaVersion.VERSION_17';

function findGradleFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findGradleFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'build.gradle') {
      files.push(fullPath);
    }
  }

  return files;
}

function replaceVersionInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('JavaVersion.VERSION_21')) {
    content = content.replace(/JavaVersion\.VERSION_21/g, targetVersion);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Reemplazado en: ${filePath}`);
  }
}

const gradleFiles = findGradleFiles(baseDir);
gradleFiles.forEach(replaceVersionInFile);
