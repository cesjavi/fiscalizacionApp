const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'android', 'capacitor-android', 'build.gradle');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content
    .replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');

  if (content !== updated) {
    fs.writeFileSync(filePath, updated);
    console.log('✅ Se reemplazó VERSION_21 por VERSION_17 en build.gradle');
  } else {
    console.log('ℹ️ No se encontraron referencias a VERSION_21. No se hicieron cambios.');
  }
} catch (err) {
  console.error('❌ Error modificando build.gradle:', err.message);
}
