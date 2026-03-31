"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_controller_1 = require("../controllers/client.controller");
const project_controller_1 = require("../controllers/project.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.requireProfileImageSetup);
router.use(auth_1.requireGithubSetupForTeamMembers);
router.get('/clients', client_controller_1.getClients);
router.post('/clients', client_controller_1.createClient);
router.get('/projects', project_controller_1.getProjects);
router.post('/projects', (0, auth_1.authorize)(['admin', 'client']), project_controller_1.createProject);
router.put('/projects/:id', project_controller_1.updateProject);
router.get('/projects/:id', project_controller_1.getProject);
router.delete('/projects/:id', auth_1.requireAdmin, project_controller_1.deleteProject);
router.post('/projects/:id/fix-repo', auth_1.requireAdmin, project_controller_1.fixProjectRepo);
router.get('/projects/:id/repo-status', auth_1.requireAdmin, project_controller_1.getProjectRepoStatus);
// Antigravity repo setup
router.post('/projects/:id/setup-repo', auth_1.requireAdmin, project_controller_1.setupProjectRepo);
router.get('/projects/:id/ai-repo-status', auth_1.requireAdmin, project_controller_1.getProjectAIRepoStatus);
// Documents
router.post('/projects/:id/documents', project_controller_1.uploadProjectDocument);
router.delete('/projects/:id/documents/:docId', project_controller_1.deleteProjectDocument);
router.get('/projects/:id/documents/:docId/download', project_controller_1.downloadProjectDocument);
// Admin-only: manage project members
router.post('/projects/:id/members', auth_1.requireAdmin, project_controller_1.addProjectMember);
router.delete('/projects/:id/members/:userId', auth_1.requireAdmin, project_controller_1.removeProjectMember);
exports.default = router;
