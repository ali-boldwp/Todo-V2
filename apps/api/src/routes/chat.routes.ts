import { Router } from 'express';
import { authenticate, requireGithubSetupForTeamMembers } from '../middleware/auth';
import {
    createOrGetConversation,
    getChatUsers,
    getConversations,
    getMessages,
    sendMessage,
} from '../controllers/chat.controller';

const router = Router();

router.use(authenticate);
router.use(requireGithubSetupForTeamMembers);

router.get('/users', getChatUsers);
router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;
