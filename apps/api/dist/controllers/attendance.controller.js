"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOut = exports.checkIn = exports.getAttendance = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const getAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const query = { userId: req.user.userId };
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }
        const attendance = await Attendance_1.default.find(query).sort({ date: -1 });
        res.json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAttendance = getAttendance;
const checkIn = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await Attendance_1.default.findOne({
            userId: req.user.userId,
            date: today,
        });
        if (existing) {
            return res.status(400).json({ message: 'Already checked in today' });
        }
        const attendance = await Attendance_1.default.create({
            userId: req.user.userId,
            date: today,
            checkInTime: new Date(),
            status: 'present',
        });
        res.status(201).json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.checkIn = checkIn;
const checkOut = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const attendance = await Attendance_1.default.findOne({
            userId: req.user.userId,
            date: today,
        });
        if (!attendance) {
            return res.status(404).json({ message: 'No check-in found for today' });
        }
        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'Already checked out' });
        }
        attendance.checkOutTime = new Date();
        // Calculate duration in minutes
        if (attendance.checkInTime) {
            const diff = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
            attendance.duration = Math.round(diff / 60000);
        }
        await attendance.save();
        res.json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.checkOut = checkOut;
