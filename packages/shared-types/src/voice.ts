import { z } from 'zod';

export const VoicePromptCategorySchema = z.enum(['mandatory', 'elective']);

export const VoicePromptSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  locale: z.string(),
  category: VoicePromptCategorySchema,
});
export type VoicePrompt = z.infer<typeof VoicePromptSchema>;

export const VoiceRecordingStatusSchema = z.enum([
  'processing',
  'active',
  'rejected',
  'archived',
]);

export const VoiceRecordingSchema = z.object({
  id: z.string().uuid(),
  promptText: z.string(),
  durationSeconds: z.number().min(1).max(30),
  status: VoiceRecordingStatusSchema,
  audioUrl: z.string().url().optional(),
  waveformPeaks: z.array(z.number()),
  transcript: z.string().nullable(),
  position: z.number().int().min(1).max(9),
  stats: z.object({
    listened: z.number().int().nonnegative(),
    saved: z.number().int().nonnegative(),
    replied: z.number().int().nonnegative(),
  }),
  createdAt: z.string().datetime(),
});
export type VoiceRecording = z.infer<typeof VoiceRecordingSchema>;

export const VoiceFeedItemSchema = z.object({
  recording: z.object({
    id: z.string().uuid(),
    promptText: z.string(),
    durationSeconds: z.number(),
    audioUrl: z.string().url(),
    waveformPeaks: z.array(z.number()),
    anonymousAvatar: z.object({
      color: z.string(),
      shape: z.string(),
    }),
  }),
  anonymizedUser: z.object({
    ageBucket: z.string(),
    distanceBucket: z.string(),
    anonymousId: z.string(),
  }),
  nextCursor: z.string().nullable(),
});
export type VoiceFeedItem = z.infer<typeof VoiceFeedItemSchema>;
