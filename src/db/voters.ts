import Dexie, { Table } from 'dexie';

export interface VoterRecord {
  seccion: string | null;
  circuito: string | null;
  mesa: string | null;
  dni: string;
  nombre: string;
  apellido: string;
  numero_de_orden: number;
  genero: string;
  fechaEnviado: string;
}

class VoterDatabase extends Dexie {
  voters!: Table<VoterRecord, number>;

  constructor() {
    super('voterDB');
    this.version(1).stores({
      voters: '++id,dni'
    });
  }
}

export const voterDB = new VoterDatabase();
