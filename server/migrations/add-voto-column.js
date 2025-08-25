import db from '../db.js';
import logger from '../logger.js';

const columns = db.prepare("PRAGMA table_info(votantes)").all();
const hasVoto = columns.some(column => column.name === 'voto');

if (!hasVoto) {
  db.prepare('ALTER TABLE votantes ADD COLUMN voto INTEGER DEFAULT 0').run();
  logger.info('Added voto column to votantes table');
} else {
  logger.info('voto column already exists in votantes table');
}
