"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_controller_1 = require("../controllers/client.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.getClients);
router.post('/', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.createClient);
router.get('/:id', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.getClient);
router.patch('/:id/status', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.toggleClientStatus);
router.post('/:id/reset-password', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.resetClientPassword);
router.delete('/:id', (0, auth_1.authorize)(['admin', 'manager']), client_controller_1.deleteClient);
exports.default = router;
