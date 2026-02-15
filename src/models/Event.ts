import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    title: string;
    description: string;
    banner?: string;
    start_datetime: Date;
    end_datetime?: Date;
    location?: string;
    max_participants?: number;
    reward_points: number;
    is_active: boolean;
    created_at: Date;
}

const EventSchema = new Schema<IEvent>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: String,
    start_datetime: { type: Date, required: true, index: true },
    end_datetime: { type: Date, index: true },
    location: String,
    max_participants: Number,
    reward_points: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
});

const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
