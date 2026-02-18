import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
    organizationId: mongoose.Types.ObjectId;
    name: string;
    type: 'internal' | 'external';
    email?: string;
    phone?: string;
    address?: string;
}

const ClientSchema: Schema = new Schema({
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['internal', 'external'], default: 'external' },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
}, { timestamps: true });

export default mongoose.model<IClient>('Client', ClientSchema);
