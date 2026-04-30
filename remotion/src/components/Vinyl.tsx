import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface Props {
  title: string;
  tags?: string;
  size: number;
  primaryColor: string;
  primaryColorGlow: string;
  displayFont: string;
  bodyFont: string;
}

// Spinning vinyl record with a center label showing song title + tags.
// Spins at 33⅓ RPM (the real-world speed of an LP) for authenticity.
export const Vinyl: React.FC<Props> = ({
  title,
  tags,
  size,
  primaryColor,
  primaryColorGlow,
  displayFont,
  bodyFont,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring-in entrance: scale + fade.
  const enter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80, mass: 1.2 },
  });
  const scale = interpolate(enter, [0, 1], [0.6, 1]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  // Continuous spin: 33⅓ RPM = ~200 degrees per second.
  const seconds = frame / fps;
  const rotation = seconds * 200;

  const labelSize = size * 0.4;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        opacity,
        boxShadow: `0 40px 80px -20px rgba(0,0,0,0.7), 0 0 60px ${primaryColor}33`,
        background: `radial-gradient(circle at center,
          #1a1a1a 0%,
          #0a0a0a 45%,
          #1a1a1a 50%,
          #0a0a0a 55%,
          #1a1a1a 60%,
          #0a0a0a 65%,
          #1a1a1a 70%,
          #0a0a0a 75%,
          #1a1a1a 80%,
          #0a0a0a 85%,
          #1a1a1a 100%)`,
      }}
    >
      {/* Glossy highlight sweep */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "conic-gradient(from 120deg, transparent 0deg, rgba(255,255,255,0.08) 45deg, transparent 90deg, transparent 360deg)",
        }}
      />

      {/* Center label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: labelSize,
          height: labelSize,
          marginLeft: -labelSize / 2,
          marginTop: -labelSize / 2,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColorGlow})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: labelSize * 0.12,
          boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: displayFont,
              fontWeight: 700,
              fontSize: labelSize * 0.13,
              color: "#fff",
              lineHeight: 1.1,
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {title}
          </div>
          {tags && (
            <div
              style={{
                marginTop: labelSize * 0.05,
                fontFamily: bodyFont,
                fontWeight: 600,
                fontSize: labelSize * 0.05,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {tags}
            </div>
          )}
        </div>

        {/* Center spindle hole */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: labelSize * 0.06,
            height: labelSize * 0.06,
            marginLeft: -(labelSize * 0.03),
            marginTop: -(labelSize * 0.03),
            borderRadius: "50%",
            background: "#0f0a0a",
          }}
        />
      </div>
    </div>
  );
};
