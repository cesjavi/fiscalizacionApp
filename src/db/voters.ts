import Dexie, { Table } from 'dexie';

export interface VoterRecord {
  id?: number;
  seccion: string;
  circuito: string;
  mesa: string;
  dni: string;
  nombre: string;
  apellido: string;
  numero_de_orden: number;
  genero: string;
  fechaEnviado: string;
}

class VoterDB extends Dexie {
  voters!: Table<VoterRecord, number>;
  constructor() {
    super('VoterDB');
    this.version(1).stores({
      voters: '++id,dni,seccion,circuito,mesa'
    });
  }
}

export const voterDB = new VoterDB();
