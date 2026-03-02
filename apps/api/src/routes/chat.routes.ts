import { Router } from 'express';
import { authenticate, requireGithubSetupForTeamMembers, requireProfileImageSetup } from '../middleware/auth';
import {
    createOrGetProjectGroup,
    createOrGetConversation,
    createOrGetTeamGroup,
    getChatUsers,
    getConversations,
    getMessages,
    getOnlineUsers,
    markConversationRead,
    sendMessage,
} from '../controllers/chat.controller';

const router = Router();

router.use(authenticate);
router.use(requireProfileImageSetup);
router.use(requireGithubSetupForTeamMembers);

router.get('/users', getChatUsers);
router.get('/presence/online-users', getOnlineUsers);
router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.post('/groups/team', createOrGetTeamGroup);
router.post('/groups/project/:projectId', createOrGetProjectGroup);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/conversations/:conversationId/read', markConversationRead);

export default router;
