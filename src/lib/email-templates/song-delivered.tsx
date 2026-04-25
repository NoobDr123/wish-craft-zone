import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { BRAND, EmailFooter, styles } from './_brand'
import type { TemplateEntry } from './registry'

interface SongDeliveredEmailProps {
  recipient_name?: string
  buyer_name?: string
  listen_url?: string
  personal_note?: string | null
  role?: 'buyer' | 'recipient'
  delivery_tier?: 'standard' | 'express_48h' | 'rush_24h'
  unsubscribe_url?: string
}

const TIER_HEADLINE: Record<string, string> = {
  standard: 'finished ahead of schedule',
  express_48h: 'ready early',
  rush_24h: 'ready — we put you at the front of the line',
}

const TIER_BODY: Record<string, string> = {
  standard:
    'We told you 5 days. Our team had a slot open up, so we moved your song to the front of the queue and finished it early. No extra charge — just our way of saying thanks for trusting us.',
  express_48h:
    'You paid for 48-hour delivery and we got it done in less. The studio had room and we used it.',
  rush_24h:
    'You paid for the rush. We delivered ahead of the 24-hour mark.',
}

const SongDeliveredEmail = ({
  recipient_name,
  buyer_name,
  listen_url,
  personal_note,
  role,
  delivery_tier,
  unsubscribe_url,
}: SongDeliveredEmailProps) => {
  const recipient = recipient_name || 'your loved one'
  const buyer = buyer_name || 'Someone who loves you'
  const listenUrl = listen_url || `${BRAND.rootUrl}/login`
  const isRecipient = role === 'recipient'
  const tier = delivery_tier ?? 'standard'
  const earlyHeadline = TIER_HEADLINE[tier] ?? TIER_HEADLINE.standard
  const earlyBody = TIER_BODY[tier] ?? TIER_BODY.standard

  const preview = isRecipient
    ? `${buyer} made you a RibbonSong — it's ready now.`
    : `${recipient}'s RibbonSong is ${earlyHeadline}.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt={BRAND.name} width={120} style={styles.logo} />
          <Text style={styles.brandSub}>Your song is ready</Text>

          <Heading style={styles.h1}>
            {isRecipient
              ? `${buyer} wrote you a song.`
              : `${recipient}'s song is ${earlyHeadline}.`}
          </Heading>

          {!isRecipient ? (
            <Text style={styles.text}>{earlyBody}</Text>
          ) : (
            <Text style={styles.text}>
              Every line was written for you. Press play when you have a quiet moment — it's worth it.
            </Text>
          )}

          {personal_note ? (
            <Section style={noteBox}>
              <Text style={noteText}>“{personal_note}”</Text>
            </Section>
          ) : null}

          <Button style={styles.button} href={listenUrl}>
            {isRecipient ? 'Listen to your song' : 'Listen now'}
          </Button>

          <Text style={styles.textMuted}>
            Or open this link in your browser:{' '}
            <a href={listenUrl} style={styles.link}>
              {listenUrl}
            </a>
          </Text>

          {!isRecipient ? (
            <Text style={styles.textMuted}>
              Share the link with {recipient} when you're ready. The page works on any phone — no
              app, no login, nothing to install.
            </Text>
          ) : null}

          <div style={styles.divider} />
          <EmailFooter unsubscribeUrl={unsubscribe_url} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SongDeliveredEmail,
  subject: (data) => {
    const recipient = data.recipient_name || 'Their'
    const buyer = data.buyer_name || 'Someone who loves you'
    const tier = (data.delivery_tier as string) ?? 'standard'
    if (data.role === 'recipient') {
      return `${buyer} wrote you a song 💛`
    }
    if (tier === 'standard') {
      return `${recipient}'s song is ready — earlier than promised`
    }
    return `${recipient}'s song is ready`
  },
  displayName: 'Song delivered',
  previewData: {
    recipient_name: 'Rachel',
    buyer_name: 'Sylwester',
    listen_url: `${BRAND.rootUrl}/listen/sample-song`,
    personal_note:
      'Every lyric came from the memories we shared — I hope this brings you comfort today.',
    role: 'buyer',
    delivery_tier: 'standard',
  },
} satisfies TemplateEntry

const noteBox = {
  backgroundColor: BRAND.colors.accent,
  borderLeft: `3px solid ${BRAND.colors.primary}`,
  margin: '0 0 22px',
  padding: '14px 18px',
}

const noteText = {
  color: BRAND.colors.foreground,
  fontSize: '15px',
  fontStyle: 'italic',
  lineHeight: '1.55',
  margin: '0',
}
