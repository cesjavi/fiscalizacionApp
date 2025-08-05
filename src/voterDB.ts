import Dexie, { Table } from 'dexie';

export interface VoterRecord {
  establecimiento?: {
    seccion?: string;
    circuito?: string;
    mesa?: string;
  };
  persona: {
    dni?: string;
    nombre: string;
    apellido: string;
  };
  personasVotantes: {
    numero_de_orden: number;
    dni: string;
    genero: string;
  }[];
  fechaEnviado: string;
  voto?: boolean;
}

class VoterDexie extends Dexie {
  voters!: Table<VoterRecord, number>;

  constructor() {
    super('voterDB');
    this.version(1).stores({
      voters: '++id'
    });
  }
}

export const voterDB = new VoterDexie();

if (typeof window !== 'undefined') {
  // expose for tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).voterDB = voterDB;
}
