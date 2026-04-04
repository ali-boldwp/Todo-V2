import express from 'express';
import { authenticate, authorize, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';
import { getClients, createClient, getClient, toggleClientStatus, resetClientPassword, deleteClient, autoLoginClient } from '../controllers/client.controller';

const router = express.Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/', authorize(['admin', 'manager']), getClients);
router.post('/', authorize(['admin', 'manager']), createClient);
router.get('/:id', authorize(['admin', 'manager']), getClient);
router.patch('/:id/status', authorize(['admin', 'manager']), toggleClientStatus);
router.post('/:id/reset-password', authorize(['admin', 'manager']), resetClientPassword);
router.delete('/:id', authorize(['admin', 'manager']), deleteClient);
router.post('/:id/auto-login', authorize(['admin', 'manager']), autoLoginClient);

export default router;
