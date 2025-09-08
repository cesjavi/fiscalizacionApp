import { Router } from 'express';
import { loginHandler } from './users.js';

const router = Router();

// Dedicated auth routes
router.post('/login', loginHandler);

export default router;
