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

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Text style={styles.brand}>{BRAND.name}</Text>
        <Text style={styles.brandSub}>You're invited</Text>

        <Heading style={styles.h1}>Someone wants to share with you.</Heading>
        <Text style={styles.text}>
          You've been invited to join <strong>{BRAND.name}</strong> — where
          memories become songs. Accept your invite to set up your account.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Accept invitation
        </Button>

        <div style={styles.divider} />
        <Text style={styles.footer}>
          If this invite wasn't expected, you can safely ignore it.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;
