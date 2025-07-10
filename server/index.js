import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import voterRoutes from './routes/voters.js';

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fiscalizacion';
mongoose.connect(MONGODB_URI);

app.use('/api/voters', voterRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
