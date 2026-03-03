import { Router } from 'express';
import { getDockployConfig, saveDockployConfig, getDockployConnectionStatus } from '../controllers/dockploy.controller';
import { authenticate, authorize, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);

router.get('/config', authorize(['admin']), getDockployConfig);
router.post('/config', authorize(['admin']), saveDockployConfig);
router.get('/status', authorize(['admin']), getDockployConnectionStatus);

export default router;
