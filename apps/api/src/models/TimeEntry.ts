import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
    userId: mongoose.Types.ObjectId;
    taskId?: mongoose.Types.ObjectId;
    projectId?: mongoose.Types.ObjectId;
    description?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    isBillable: boolean;
}

const TimeEntrySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // in seconds/minutes? let's say minutes
    isBillable: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);
