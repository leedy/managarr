import mongoose, { Schema, Document } from 'mongoose';

export type InstanceType = 'sonarr' | 'radarr' | 'plex';

export interface IInstance extends Document {
  name: string;
  type: InstanceType;
  url: string;
  apiKey: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InstanceSchema = new Schema<IInstance>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['sonarr', 'radarr', 'plex'],
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups by type
InstanceSchema.index({ type: 1 });

export const Instance = mongoose.model<IInstance>('Instance', InstanceSchema);
