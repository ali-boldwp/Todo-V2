import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getClients, createClient, getClient, toggleClientStatus, resetClientPassword, deleteClient } from '../controllers/client.controller';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(['admin', 'manager']), getClients);
router.post('/', authorize(['admin', 'manager']), createClient);
router.get('/:id', authorize(['admin', 'manager']), getClient);
router.patch('/:id/status', authorize(['admin', 'manager']), toggleClientStatus);
router.post('/:id/reset-password', authorize(['admin', 'manager']), resetClientPassword);
router.delete('/:id', authorize(['admin', 'manager']), deleteClient);

export default router;
