"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const team_controller_1 = require("../controllers/team.controller");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
// Admin-only team member management
router.get('/team-members', auth_1.authenticate, auth_1.requireAdmin, team_controller_1.getTeamMembers);
router.post('/team-members', auth_1.authenticate, auth_1.requireAdmin, team_controller_1.createTeamMember);
router.patch('/team-members/:id', auth_1.authenticate, auth_1.requireAdmin, team_controller_1.updateTeamMember);
router.delete('/team-members/:id', auth_1.authenticate, auth_1.requireAdmin, team_controller_1.deleteTeamMember);
router.post('/team-members/:id/reset-password', auth_1.authenticate, auth_1.requireAdmin, team_controller_1.resetTeamMemberPassword);
exports.default = router;
