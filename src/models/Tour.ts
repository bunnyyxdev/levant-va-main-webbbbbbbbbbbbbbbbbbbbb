import mongoose, { Schema, Document } from 'mongoose';

export interface ITour extends Document {
    title: string;
    description: string;
    banner?: string;
    start_date: Date;
    end_date?: Date;
    min_rank?: string;
    reward_points: number;
    is_active: boolean;
    created_at: Date;
}

const TourSchema = new Schema<ITour>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    banner: String,
    start_date: { type: Date, required: true, index: true },
    end_date: { type: Date, index: true },
    min_rank: String,
    reward_points: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
});

const Tour = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);
export default Tour;
