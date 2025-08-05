import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.prepare(`CREATE TABLE IF NOT EXISTS mesas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seccion TEXT,
  circuito TEXT,
  mesa TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS votantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seccion TEXT,
  circuito TEXT,
  mesa TEXT,
  dni TEXT,
  nombre TEXT,
  apellido TEXT,
  numero_de_orden INTEGER,
  genero TEXT,
  fechaEnviado TEXT,
  voto INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS escrutinio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa_id INTEGER,
  datos TEXT,
  foto TEXT,
  FOREIGN KEY(mesa_id) REFERENCES mesas(id)
)`).run();

// Ensure "foto" column exists for existing databases
const escrutinioColumns = db.prepare("PRAGMA table_info(escrutinio)").all();
const hasFoto = escrutinioColumns.some(column => column.name === 'foto');
if (!hasFoto) {
  db.prepare('ALTER TABLE escrutinio ADD COLUMN foto TEXT').run();
}

export default db;
