import mongoose, { Document, Schema } from 'mongoose';

export interface IGithubConfig extends Document {
    organizationId: mongoose.Types.ObjectId;
    personalAccessToken: string;
    repoOwner: string;
    repoName: string;
}

const GithubConfigSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    personalAccessToken: { type: String, required: true },
    repoOwner: { type: String, required: true },
    repoName: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<IGithubConfig>('GithubConfig', GithubConfigSchema);
