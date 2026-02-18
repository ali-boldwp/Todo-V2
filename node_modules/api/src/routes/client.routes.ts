import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getClients, createClient, getClient } from '../controllers/client.controller';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(['admin', 'manager']), getClients);
router.post('/', authorize(['admin', 'manager']), createClient);
router.get('/:id', authorize(['admin', 'manager']), getClient);

export default router;
