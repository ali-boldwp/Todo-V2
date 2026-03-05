import mongoose, { Document, Schema } from 'mongoose';

export interface IIdeUpdateConfig extends Document {
    latestVersion: string;
    downloadUrl: string;
    installUrl?: string;
    releaseNotesUrl?: string;
    message?: string;
    minSupportedVersion?: string;
    mandatory: boolean;
}

const IdeUpdateConfigSchema: Schema = new Schema(
    {
        latestVersion: { type: String, required: true, trim: true },
        downloadUrl: { type: String, required: true, trim: true },
        installUrl: { type: String, trim: true },
        releaseNotesUrl: { type: String, trim: true },
        message: { type: String, trim: true },
        minSupportedVersion: { type: String, trim: true },
        mandatory: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<IIdeUpdateConfig>('IdeUpdateConfig', IdeUpdateConfigSchema);
