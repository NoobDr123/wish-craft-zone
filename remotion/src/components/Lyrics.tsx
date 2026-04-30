import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import type { LyricLine } from "../schema";

interface Props {
  lyrics: LyricLine[];
  bodyFont: string;
  displayFont: string;
}

const FADE_FRAMES = 12;

// Bottom-anchored synced lyrics. Shows the active line with a soft fade.
export const Lyrics: React.FC<Props> = ({ lyrics, displayFont }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  if (!lyrics || lyrics.length === 0) return null;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 90,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "85%",
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {lyrics.map((line, i) => {
          const startFrame = line.start * fps;
          const endFrame = line.end * fps;

          // Only render lines that are currently visible (with fade buffer).
          if (frame < startFrame - FADE_FRAMES || frame > endFrame + FADE_FRAMES) {
            return null;
          }

          const opacity = interpolate(
            frame,
            [
              startFrame - FADE_FRAMES,
              startFrame,
              endFrame,
              endFrame + FADE_FRAMES,
            ],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          // Subtle rise-in.
          const translateY = interpolate(
            frame,
            [startFrame - FADE_FRAMES, startFrame],
            [20, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                opacity,
                transform: `translateY(${translateY}px)`,
                fontFamily: displayFont,
                fontWeight: 600,
                fontSize: 52,
                color: "#fff",
                textAlign: "center",
                lineHeight: 1.2,
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                padding: "0 40px",
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
