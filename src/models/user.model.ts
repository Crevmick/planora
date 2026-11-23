import mongoose, { type Document, Schema } from 'mongoose';

export type AuthProvider = 'local' | 'google' | 'apple';

export interface IRefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser extends Document {
  name?: string;
  email: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  passwordHash?: string;
  authProvider: AuthProvider;
  providerId?: string;
  isEmailVerified: boolean;
  refreshTokens: IRefreshTokenEntry[];
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: Date;
  emailVerificationAttempts: number;
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
  resetCodeAttempts: number;
  deletedAt?: Date;
  scheduledDeletionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenEntry>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    avatarPublicId: {
      type: String,
      select: false,
    },
    passwordHash: {
      type: String,
      required(this: IUser): boolean {
        return this.authProvider === 'local';
      },
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple'],
      default: 'local',
    },
    providerId: {
      type: String,
      sparse: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
    emailVerificationCodeHash: {
      type: String,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    resetCodeHash: {
      type: String,
      select: false,
    },
    resetCodeExpiresAt: {
      type: Date,
      select: false,
    },
    resetCodeAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    scheduledDeletionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.avatarPublicId;
        delete ret.refreshTokens;
        delete ret.emailVerificationCodeHash;
        delete ret.emailVerificationExpiresAt;
        delete ret.emailVerificationAttempts;
        delete ret.resetCodeHash;
        delete ret.resetCodeExpiresAt;
        delete ret.resetCodeAttempts;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
