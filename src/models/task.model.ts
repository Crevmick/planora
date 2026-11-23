import mongoose, { type Document, Schema, type Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask extends Document {
  userId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  dueDate?: Date;
  dueTime?: string;
  priority: TaskPriority;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    dueTime: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
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

taskSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
