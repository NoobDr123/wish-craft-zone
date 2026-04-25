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
  unsubscribe_url?: string
}

const SongDeliveredEmail = ({
  recipient_name,
  buyer_name,
  listen_url,
  personal_note,
  role,
  unsubscribe_url,
}: SongDeliveredEmailProps) => {
  const recipient = recipient_name || 'your loved one'
  const buyer = buyer_name || 'Someone who loves you'
  const listenUrl = listen_url || `${BRAND.rootUrl}/login`
  const isRecipient = role === 'recipient'

  const preview = isRecipient
    ? `${buyer} made you a RibbonSong.`
    : `${recipient}'s RibbonSong is ready.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Img src={BRAND.logoUrl} alt={BRAND.name} width={120} style={styles.logo} />
          <Text style={styles.brandSub}>A song made with love</Text>

          <Heading style={styles.h1}>
            {isRecipient ? 'A song, just for you.' : 'Their song is ready to share.'}
          </Heading>
          <Text style={styles.text}>
            {isRecipient
              ? `${buyer} wrote a song for you. It was made one note at a time, with you in mind. Take a quiet moment and press play.`
              : `Your RibbonSong for ${recipient} is finished. Listen to it, share it, or save the link to send later.`}
          </Text>

          {personal_note ? (
            <Section style={noteBox}>
              <Text style={noteText}>“{personal_note}”</Text>
            </Section>
          ) : null}

          <Button style={styles.button} href={listenUrl}>
            Listen to the song
          </Button>

          <Text style={styles.textMuted}>
            Or copy this link:{' '}
            <a href={listenUrl} style={styles.link}>
              {listenUrl}
            </a>
          </Text>

          <div style={styles.divider} />
          <Text style={styles.footer}>Sent from {BRAND.name} — turning love into songs.</Text>
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
    return data.role === 'recipient'
      ? `${buyer} made you a song 💛`
      : `${recipient}'s song is ready`
  },
  displayName: 'Song delivered',
  previewData: {
    recipient_name: 'Rachel',
    buyer_name: 'Sylwester',
    listen_url: `${BRAND.rootUrl}/listen/sample-song`,
    personal_note: 'Every lyric came from the memories we shared — I hope this brings you comfort today.',
    role: 'buyer',
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
