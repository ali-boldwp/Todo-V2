import { Router } from 'express';
import { getPluginUpdateChannel } from '../controllers/ide.controller';

const router = Router();

router.get('/plugin/update-channel', getPluginUpdateChannel);

export default router;
