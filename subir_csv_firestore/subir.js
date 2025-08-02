const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

// Cargar credenciales Firebase
const serviceAccount = require("./fiscalizacion-4dcfc-firebase-adminsdk-fbsvc-b9adc3fc76.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Leer y subir CSV
fs.createReadStream("lista_votantes_genero_corregido.csv")
  .pipe(csv({
    mapHeaders: ({ header }) => header.trim().replace('\uFEFF', '') // limpia BOM y espacios
  }))
  .on("data", async (row) => {
    const nombre = row["Nombre"]?.trim();
    const apellido = row["Apellido"]?.trim();
    const numeroOrden = parseInt(row["Número de Orden"]);
    const genero = row["Género"]?.trim();
    const dni = row["DNI Votante"]?.trim();

    if (!nombre || !apellido || isNaN(numeroOrden) || !genero || !dni) {
      console.warn(`⚠️ Datos incompletos para DNI ${dni || "(sin DNI)"}, se omite`);
      return;
    }

    const docData = {
      nombre,
      apellido,
      numeroOrden,
      genero
    };

    try {
      await db.collection("votantes").doc(dni).set(docData);
      console.log(`✔️ Subido: ${dni}`);
    } catch (err) {
      console.error(`❌ Error al subir ${dni}:`, err.message);
    }
  })
  .on("end", () => {
    console.log("✅ Importación completada.");
  });
