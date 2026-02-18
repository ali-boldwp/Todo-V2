"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSprint = exports.getSprints = exports.createEpic = exports.getEpics = void 0;
const Epic_1 = __importDefault(require("../models/Epic"));
const Sprint_1 = __importDefault(require("../models/Sprint"));
const planning_schema_1 = require("@devmanager/shared/dist/planning.schema");
const getEpics = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { organizationId: req.user.organizationId };
        if (projectId)
            query.projectId = projectId;
        const epics = await Epic_1.default.find(query);
        res.json(epics);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getEpics = getEpics;
const createEpic = async (req, res) => {
    try {
        const validated = planning_schema_1.EpicSchema.parse(req.body);
        const epic = await Epic_1.default.create({ ...validated, organizationId: req.user.organizationId });
        res.status(201).json(epic);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.createEpic = createEpic;
const getSprints = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { organizationId: req.user.organizationId };
        if (projectId)
            query.projectId = projectId;
        const sprints = await Sprint_1.default.find(query).sort({ startDate: 1 });
        res.json(sprints);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSprints = getSprints;
const createSprint = async (req, res) => {
    try {
        const validated = planning_schema_1.SprintSchema.parse(req.body);
        const sprint = await Sprint_1.default.create({ ...validated, organizationId: req.user.organizationId });
        res.status(201).json(sprint);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.createSprint = createSprint;
