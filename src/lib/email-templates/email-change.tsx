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

interface EmailChangeEmailProps {
  siteName: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new {BRAND.name} email</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={BRAND.logoUrl} alt={BRAND.name} width={120} style={styles.logo} />
        <Text style={styles.brandSub}>Email change</Text>

        <Heading style={styles.h1}>Confirm your new email.</Heading>
        <Text style={styles.text}>
          You requested to change the email on your {BRAND.name} account from{" "}
          <strong>{email}</strong> to <strong>{newEmail}</strong>. Tap below to
          confirm.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Confirm email change
        </Button>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;
