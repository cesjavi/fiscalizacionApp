import mongoose from 'mongoose';
import '../mongoose.js';

const personaSchema = new mongoose.Schema({
  dni: String,
  nombre: String,
  apellido: String,
});

const personasVotantesSchema = new mongoose.Schema({
  numero_de_orden: Number,
  dni: String,
  genero: String,
});

const votanteEstablecimientoSchema = new mongoose.Schema({
  establecimiento: {
    seccion: String,
    circuito: String,
    mesa: String,
  },
  persona: personaSchema,
  personasVotantes: [personasVotantesSchema],
  fechaEnviado: String,
  voto: Boolean,
});

export default mongoose.model('VotanteEstablecimiento', votanteEstablecimientoSchema);
