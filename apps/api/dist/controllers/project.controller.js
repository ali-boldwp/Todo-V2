"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProject = exports.createProject = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const project_schema_1 = require("@devmanager/shared/dist/project.schema");
const getProjects = async (req, res) => {
    try {
        const projects = await Project_1.default.find({ organizationId: req.user.organizationId }).populate('clientId', 'name');
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProjects = getProjects;
const createProject = async (req, res) => {
    try {
        const validated = project_schema_1.ProjectSchema.parse(req.body);
        const project = await Project_1.default.create({
            ...validated,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(project);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createProject = createProject;
const getProject = async (req, res) => {
    try {
        const project = await Project_1.default.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        }).populate('clientId', 'name');
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProject = getProject;
