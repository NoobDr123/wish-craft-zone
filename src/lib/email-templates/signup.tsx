import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { BRAND, styles } from "./_brand";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email — your songs are waiting at {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brand}>{BRAND.name}</Text>
        <Text style={styles.brandSub}>A song made with love</Text>

        <Heading style={styles.h1}>Welcome — let's confirm it's you.</Heading>
        <Text style={styles.text}>
          Tap the button below to confirm <strong>{recipient}</strong> and unlock
          your songs, order history, and gift-sharing.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Confirm my email
        </Button>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          If you didn't create a {BRAND.name} account, you can safely ignore
          this email — nothing will change.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SignupEmail;
