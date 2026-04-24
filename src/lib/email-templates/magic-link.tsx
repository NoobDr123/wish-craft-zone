import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";
import { BRAND, styles } from "./_brand";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your one-tap sign-in for {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt={BRAND.name} width={120} style={styles.logo} />
        <Text style={styles.brandSub}>One-tap sign in</Text>

        <Heading style={styles.h1}>Your sign-in link is ready.</Heading>
        <Text style={styles.text}>
          Tap below to open your account and listen to your songs. This link
          will expire in a few minutes for your security.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Sign in to {BRAND.name}
        </Button>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          Didn't ask to sign in? You can safely ignore this email — no one can
          access your account without this link.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;
