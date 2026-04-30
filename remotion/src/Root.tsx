import React from "react";
import { Composition } from "remotion";
import { SongVideo } from "./SongVideo";
import { songVideoSchema } from "./schema";

// Default props are used when previewing in Studio.
// In production, props are passed at render time via Lambda.
const DEFAULT_DURATION_SECONDS = 30;
const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SongVideo"
      component={SongVideo}
      durationInFrames={DEFAULT_DURATION_SECONDS * FPS}
      fps={FPS}
      width={1080}
      height={1080}
      schema={songVideoSchema}
      defaultProps={{
        audioUrl: "",
        title: "Your Song",
        tags: "FOR SOMEONE SPECIAL",
        durationInSeconds: DEFAULT_DURATION_SECONDS,
        lyrics: [
          { text: "This is your song", start: 1, end: 4 },
          { text: "Made just for you", start: 4, end: 7 },
          { text: "With every note", start: 8, end: 11 },
          { text: "And every word true", start: 11, end: 14 },
        ],
        primaryColor: "#d4546a",
        primaryColorGlow: "#f59e9e",
      }}
      // Compute actual duration based on the song length passed in props.
      calculateMetadata={({ props }) => {
        return {
          durationInFrames: Math.ceil(props.durationInSeconds * FPS),
        };
      }}
    />
  );
};
