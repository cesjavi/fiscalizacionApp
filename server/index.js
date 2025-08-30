// index.js
import express from 'express';
import cors from 'cors';
import './db.js';
import voterRoutes from './routes/voters.js';
import mesaRoutes from './routes/mesas.js';
import userRoutes from './routes/users.js';
import escrutinioRoutes from './routes/escrutinio.js';
import logger from './logger.js';

const app = express();

// Si hay proxy (NGINX, Railway, Render, etc.)
app.set('trust proxy', 1);

// === CORS CONFIG ===
const allowedOrigins = [
  'http://localhost:5173',     // Vite
  'http://localhost:8100',     // Ionic (dev)
  'capacitor://localhost',     // Capacitor Android/iOS
  'ionic://localhost',
  //'https://api.lalibertadavanzacomuna7.com', // si llamás desde el mismo dominio (opcional)
  //'https://lalibertadavanzacomuna7.com',     // tu web (opcional)
];

const corsOptions = {
  origin(origin, cb) {
    // permitir requests sin origin (apps nativas, curl) y los orígenes listados
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,            // ponlo en false si NO usas cookies/sesiones
  optionsSuccessStatus: 204,    // para algunos navegadores viejos
};

// Responder preflight ANTES que cualquier otra cosa
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());

// (Opcional) healthcheck rápido
app.get('/health', (_req, res) => res.status(200).send('OK'));

// === RUTAS ===
app.use('/api/voters', voterRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/users', userRoutes);           // aquí debería estar /api/auth/login si lo manejás en users
app.use('/api/escrutinio', escrutinioRoutes);

// IMPORTANTE: no redirijas OPTIONS ni /api/auth/login en ningún middleware

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
