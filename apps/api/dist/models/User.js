"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    profileImageUrl: { type: String },
    profileImageUploadedAt: { type: Date },
    githubUsername: { type: String },
    githubUserId: { type: String },
    githubProfileUrl: { type: String },
    githubConnectedAt: { type: Date },
    canVerifyTasks: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'member', 'client'], default: 'member' },
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
// Compound index for email to be unique is already handled by Schema definition
// UserSchema.index({ email: 1 }, { unique: true });
// Performance indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
exports.default = mongoose_1.default.model('User', UserSchema);
