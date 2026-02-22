import mongoose, { Document, Schema } from 'mongoose';

export interface IGithubConfig extends Document {
    personalAccessToken: string;
    repoOwner?: string;
    repoName?: string;
}

const GithubConfigSchema: Schema = new Schema({
    personalAccessToken: { type: String, required: true },
    repoOwner: { type: String },
    repoName: { type: String },
}, { timestamps: true });

export default mongoose.model<IGithubConfig>('GithubConfig', GithubConfigSchema);
