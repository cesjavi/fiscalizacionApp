const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

const serviceAccount = require("./fiscalizacion-4dcfc-firebase-adminsdk-fbsvc-b9adc3fc76.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const archivos = [
  { path: "Listas.csv", coleccion: "listas", idCampo: null }
];

for (const archivo of archivos) {
  fs.createReadStream(archivo.path)
    .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace('\uFEFF', '') }))
    .on("data", async (row) => {
      const docId = archivo.idCampo ? row[archivo.idCampo]?.toString().trim() : undefined;
      if (!docId && archivo.idCampo) {
        console.warn(`⚠️ Fila omitida: falta el campo ${archivo.idCampo}`);
        return;
      }

      try {
        const ref = docId
          ? db.collection(archivo.coleccion).doc(docId)
          : db.collection(archivo.coleccion).doc();
        await ref.set(row);
        console.log(`✔️ Subido a ${archivo.coleccion}: ${docId || "(ID auto)"}`);
      } catch (err) {
        console.error(`❌ Error al subir a ${archivo.coleccion}:`, err.message);
      }
    })
    .on("end", () => {
      console.log(`✅ Finalizado: ${archivo.coleccion}`);
    });
}