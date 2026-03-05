import express, { Router } from 'express';
import { getIdeUpdateConfig, getPluginUpdateChannel, saveIdeUpdateConfig, uploadIdePluginPackage } from '../controllers/ide.controller';
import { authenticate, authorize, requireProfileImageSetup } from '../middleware/auth';

const router = Router();

router.get('/plugin/update-channel', getPluginUpdateChannel);
router.get('/config', authenticate, requireProfileImageSetup, authorize(['admin']), getIdeUpdateConfig);
router.post('/config', authenticate, requireProfileImageSetup, authorize(['admin']), saveIdeUpdateConfig);
router.post('/upload', authenticate, requireProfileImageSetup, authorize(['admin']), express.raw({ type: '*/*', limit: '200mb' }), uploadIdePluginPackage);

export default router;
