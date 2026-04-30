import { z } from "zod";

// Each lyric line with its start + end time in seconds.
export const lyricLineSchema = z.object({
  text: z.string(),
  start: z.number(), // seconds
  end: z.number(), // seconds
});

export const songVideoSchema = z.object({
  // Public URL to the song MP3 (must be publicly accessible — Lambda fetches it).
  audioUrl: z.string(),
  // Display title shown on the vinyl label.
  title: z.string(),
  // Tagline / tags shown under the title.
  tags: z.string().optional(),
  // Total duration of the song in seconds.
  durationInSeconds: z.number(),
  // Synced lyrics. If empty, no lyrics overlay is shown.
  lyrics: z.array(lyricLineSchema).default([]),
  // Brand color (hex). Defaults to RibbonSong primary.
  primaryColor: z.string().default("#d4546a"),
  primaryColorGlow: z.string().default("#f59e9e"),
});

export type SongVideoProps = z.infer<typeof songVideoSchema>;
export type LyricLine = z.infer<typeof lyricLineSchema>;
