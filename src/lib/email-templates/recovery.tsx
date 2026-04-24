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

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND.name} password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt={BRAND.name} width={120} style={styles.logo} />
        <Text style={styles.brandSub}>Password reset</Text>

        <Heading style={styles.h1}>Choose a new password.</Heading>
        <Text style={styles.text}>
          We received a request to reset the password on your {BRAND.name}{" "}
          account. Tap the button below to set a new one.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Reset my password
        </Button>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          Didn't request this? You can safely ignore the email — your password
          won't change.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;
