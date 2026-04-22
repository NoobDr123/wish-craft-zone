import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import { BRAND, styles } from "./_brand";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brand}>{BRAND.name}</Text>
        <Text style={styles.brandSub}>Verification code</Text>

        <Heading style={styles.h1}>Confirm it's really you.</Heading>
        <Text style={styles.text}>
          Use the code below to confirm your identity. It expires in a few
          minutes.
        </Text>
        <Text style={styles.code}>{token}</Text>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          Didn't request this code? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;
