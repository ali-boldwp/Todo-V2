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
const ProjectSchema = new mongoose_1.Schema({
    clientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Client', index: true },
    name: { type: String, required: true },
    description: { type: mongoose_1.Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'completed', 'archived', 'on_hold', 'draft'], default: 'active' },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    startDate: { type: Date },
    endDate: { type: Date },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true }],
    githubRepoOwner: { type: String },
    githubRepoName: { type: String },
    repoLocalPath: { type: String },
    repoClonedAt: { type: Date },
    projectUrl: { type: String },
    devWebsiteUrl: { type: String },
    accessAccounts: [{
            label: { type: String, required: true },
            username: { type: String, required: true },
            password: { type: String, required: true },
            notes: { type: String },
        }],
    documents: [{
            title: { type: String, required: true },
            description: { type: String },
            fileData: { type: String, required: true },
            mimeType: { type: String, required: true },
            fileName: { type: String, required: true },
            uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            uploadedAt: { type: Date, default: Date.now }
        }]
}, { timestamps: true });
exports.default = mongoose_1.default.model('Project', ProjectSchema);
