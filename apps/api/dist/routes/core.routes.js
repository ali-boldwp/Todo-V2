"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_controller_1 = require("../controllers/client.controller");
const project_controller_1 = require("../controllers/project.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.requireGithubSetupForTeamMembers);
router.get('/clients', client_controller_1.getClients);
router.post('/clients', client_controller_1.createClient);
router.get('/projects', project_controller_1.getProjects);
router.post('/projects', auth_1.requireAdmin, project_controller_1.createProject); // Note: Should clients be able to create projects? User said client shouldn't delete, maybe not create either? Let's stick to task strictly for now. Wait, I should make deleteProject requireAdmin.
router.put('/projects/:id', project_controller_1.updateProject);
router.get('/projects/:id', project_controller_1.getProject);
router.delete('/projects/:id', auth_1.requireAdmin, project_controller_1.deleteProject);
// Documents
router.post('/projects/:id/documents', project_controller_1.uploadProjectDocument);
router.delete('/projects/:id/documents/:docId', project_controller_1.deleteProjectDocument);
// Admin-only: manage project members
router.post('/projects/:id/members', auth_1.requireAdmin, project_controller_1.addProjectMember);
router.delete('/projects/:id/members/:userId', auth_1.requireAdmin, project_controller_1.removeProjectMember);
exports.default = router;
