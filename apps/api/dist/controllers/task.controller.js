"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTask = exports.createTask = exports.getTasks = void 0;
const Task_1 = __importDefault(require("../models/Task"));
const task_schema_1 = require("@devmanager/shared/dist/task.schema");
const getTasks = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { organizationId: req.user.organizationId };
        if (projectId)
            query.projectId = projectId;
        const tasks = await Task_1.default.find(query).populate('assigneeId', 'firstName lastName email');
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
    try {
        const validated = task_schema_1.TaskSchema.parse(req.body);
        const task = await Task_1.default.create({
            ...validated,
            organizationId: req.user.organizationId,
        });
        res.status(201).json(task);
    }
    catch (error) {
        if (error.issues)
            return res.status(400).json({ errors: error.issues });
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const task = await Task_1.default.findOneAndUpdate({ _id: req.params.id, organizationId: req.user.organizationId }, req.body, { new: true });
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateTask = updateTask;
