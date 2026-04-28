"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const assistant_controller_1 = require("../controllers/assistant.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.requireProfileImageSetup);
// Only clients can access these routes
router.use((0, auth_1.authorize)(['client']));
router.get('/', assistant_controller_1.getAssistants);
router.post('/', assistant_controller_1.createAssistant);
router.delete('/:id', assistant_controller_1.deleteAssistant);
router.post('/:id/projects', assistant_controller_1.assignAssistantToProject);
router.delete('/:id/projects/:projectId', assistant_controller_1.unassignAssistantFromProject);
exports.default = router;
