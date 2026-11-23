import mongoose, { type Document, Schema, type Types } from 'mongoose';

export const PROJECT_PRESET_COLORS = [
  '#156E30', // Green
  '#0088FF', // Blue
  '#C64B00', // Orange
  '#161E2E', // Dark Navy
  '#E84142', // Red
] as const;

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^#[0-9A-F]{6}$/,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectSchema.index({ userId: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
