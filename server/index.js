import express from 'express';
import cors from 'cors';
import './db.js';
import voterRoutes from './routes/voters.js';
import mesaRoutes from './routes/mesas.js';
import userRoutes from './routes/users.js';
import escrutinioRoutes from './routes/escrutinio.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/voters', voterRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/escrutinio', escrutinioRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
