"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopTimer = exports.startTimer = exports.createTimeEntry = exports.getTimeEntries = void 0;
const TimeEntry_1 = __importDefault(require("../models/TimeEntry"));
const time_schema_1 = require("@devmanager/shared/dist/time.schema");
const getTimeEntries = async (req, res) => {
    try {
        const entries = await TimeEntry_1.default.find({
            userId: req.user.userId
        }).sort({ startTime: -1 });
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getTimeEntries = getTimeEntries;
const createTimeEntry = async (req, res) => {
    try {
        const validated = time_schema_1.TimeEntrySchema.parse(req.body);
        const entry = await TimeEntry_1.default.create({
            ...validated,
            userId: req.user.userId,
        });
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(400).json({ errors: error.issues || error.message });
    }
};
exports.createTimeEntry = createTimeEntry;
const startTimer = async (req, res) => {
    try {
        // Check if running timer exists
        const running = await TimeEntry_1.default.findOne({
            userId: req.user.userId,
            endTime: null,
        });
        if (running) {
            return res.status(400).json({ message: 'Timer already running' });
        }
        const { taskId, projectId, description } = req.body;
        const entry = await TimeEntry_1.default.create({
            userId: req.user.userId,
            taskId,
            projectId,
            description,
            startTime: new Date(),
        });
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.startTimer = startTimer;
const stopTimer = async (req, res) => {
    try {
        const entry = await TimeEntry_1.default.findOne({
            userId: req.user.userId,
            endTime: null,
        });
        if (!entry) {
            return res.status(404).json({ message: 'No running timer' });
        }
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000 / 60); // minutes
        entry.endTime = endTime;
        entry.duration = duration;
        await entry.save();
        res.json(entry);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.stopTimer = stopTimer;
