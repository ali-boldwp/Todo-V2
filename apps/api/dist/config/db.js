"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("../app");
const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://admin:password123@localhost:27017/devmanager?authSource=admin';
    try {
        await mongoose_1.default.connect(mongoURI);
        app_1.logger.info('MongoDB Connected');
    }
    catch (error) {
        app_1.logger.error(error, 'MongoDB Connection Error');
        process.exit(1);
    }
};
exports.connectDB = connectDB;
