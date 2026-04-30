import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

interface Props {
  bodyFont: string;
}

// Top "RibbonSong" wordmark — small, refined, springs in at the start.
export const Branding: React.FC<Props> = ({ bodyFont }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 200 },
  });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const translateY = interpolate(enter, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 60,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          fontFamily: bodyFont,
          fontWeight: 600,
          fontSize: 22,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
        }}
      >
        RibbonSong
      </div>
    </AbsoluteFill>
  );
};
