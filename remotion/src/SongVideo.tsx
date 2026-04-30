import React from "react";
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import type { SongVideoProps } from "./schema";
import { Vinyl } from "./components/Vinyl";
import { Lyrics } from "./components/Lyrics";
import { Background } from "./components/Background";
import { Branding } from "./components/Branding";

const { fontFamily: displayFont } = loadDisplay("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

const { fontFamily: bodyFont } = loadBody("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const SongVideo: React.FC<SongVideoProps> = ({
  audioUrl,
  title,
  tags,
  lyrics,
  primaryColor,
  primaryColorGlow,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0a0a", fontFamily: bodyFont }}>
      {/* Animated gradient backdrop */}
      <Background primaryColor={primaryColor} primaryColorGlow={primaryColorGlow} />

      {/* Centered spinning vinyl */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Vinyl
          title={title}
          tags={tags}
          size={Math.min(width, height) * 0.62}
          primaryColor={primaryColor}
          primaryColorGlow={primaryColorGlow}
          displayFont={displayFont}
          bodyFont={bodyFont}
        />
      </AbsoluteFill>

      {/* Synced lyrics overlay (bottom) */}
      <Lyrics lyrics={lyrics} bodyFont={bodyFont} displayFont={displayFont} />

      {/* RibbonSong branding (top) */}
      <Branding bodyFont={bodyFont} />

      {/* The actual song audio — Lambda fetches and embeds it */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
