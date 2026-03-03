import mongoose, { Document, Schema } from 'mongoose';

export interface IDockployConfig extends Document {
    baseUrl: string;
    apiToken: string;
    deployPathTemplate?: string;
    appStatusPathTemplate?: string;
}

const DockployConfigSchema: Schema = new Schema({
    baseUrl: { type: String, required: true },
    apiToken: { type: String, required: true },
    deployPathTemplate: { type: String, default: '/api/apps/{appId}/deploy' },
    appStatusPathTemplate: { type: String, default: '/api/apps/{appId}' },
}, { timestamps: true });

export default mongoose.model<IDockployConfig>('DockployConfig', DockployConfigSchema);
