"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ide_controller_1 = require("../controllers/ide.controller");
const router = (0, express_1.Router)();
router.get('/plugin/update-channel', ide_controller_1.getPluginUpdateChannel);
exports.default = router;
