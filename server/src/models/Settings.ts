import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: unknown;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);

// Helper functions for typed access
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await Settings.findOne({ key });
  return setting ? (setting.value as T) : defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await Settings.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  );
}

// Setting keys
export const SETTING_KEYS = {
  EXCLUDED_PLEX_LIBRARIES: 'excludedPlexLibraries',
} as const;
