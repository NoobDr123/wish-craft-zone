import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface Props {
  primaryColor: string;
  primaryColorGlow: string;
}

// Slow drifting radial gradient — gives the frame life without distracting from the vinyl.
export const Background: React.FC<Props> = ({ primaryColor, primaryColorGlow }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const seconds = frame / fps;
  // Sinusoidal drift over the full duration.
  const driftX = Math.sin(seconds * 0.15) * 8;
  const driftY = Math.cos(seconds * 0.12) * 6;

  // Gentle fade-in at the start.
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  // Gentle fade-out at the end.
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Deep base */}
      <AbsoluteFill style={{ backgroundColor: "#0f0a0a" }} />

      {/* Drifting brand-colored glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${50 + driftX}% ${45 + driftY}%, ${primaryColorGlow}55 0%, ${primaryColor}22 30%, transparent 60%)`,
        }}
      />

      {/* Subtle vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
