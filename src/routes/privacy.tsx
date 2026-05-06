import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy · PawPrint Song" },
      {
        name: "description",
        content:
          "PawPrint Song Privacy Policy — what personal information we collect, how we use it, who we share it with, and the choices you have. Governed by the laws of the State of Delaware.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function PrivacyPage() {
  const updated = "April 22, 2026";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-6 [&_li]:my-1 [&_ul]:list-disc">
          <p>
            This Privacy Policy explains how PawPrint Song
            (&ldquo;PawPrint Song&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
            collects, uses, shares, and protects your personal information when
            you use ribbonsong.com and our song-creation service (the
            &ldquo;Service&rdquo;). By using the Service you agree to this
            Policy and our <Link to="/terms">Terms of Service</Link>.
          </p>

          <h2>1. Information we collect</h2>
          <h3>You give us</h3>
          <ul>
            <li>
              <strong>Account &amp; contact info:</strong> your name and email
              address.
            </li>
            <li>
              <strong>Recipient info:</strong> the recipient&rsquo;s first name,
              your relationship to them, and (optionally) their email and a
              personal note.
            </li>
            <li>
              <strong>Story content:</strong> the answers you give in the quiz —
              for example where they are in their journey, qualities you love,
              shared memories, the message you want to send, and the song style
              preferences.
            </li>
            <li>
              <strong>Payment info:</strong> when you check out, our payment
              processor collects your card details directly. We receive a
              transaction ID and the last four digits of the card — we do not
              store your full card number.
            </li>
            <li>
              <strong>Support communications:</strong> when you email us we
              keep a record so we can help you.
            </li>
          </ul>
          <h3>Collected automatically</h3>
          <ul>
            <li>
              <strong>Device &amp; usage data:</strong> IP address, browser,
              device type, pages viewed, and timestamps.
            </li>
            <li>
              <strong>Cookies and similar technologies:</strong> small files
              used to keep you signed in, remember quiz progress, and measure
              how the site is used. You can control cookies in your browser.
            </li>
          </ul>

          <h2>2. Sensitive information</h2>
          <p>
            Many of our customers tell us about a serious illness, hospice
            stay, or the loss of a loved one. This information may be
            considered sensitive. We treat it with care, only use it to create
            your song and provide the Service, and never sell it.
          </p>

          <h2>3. How we use your information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create, deliver, and revise your personalized song.</li>
            <li>Process payments and prevent fraud.</li>
            <li>Send order confirmations, delivery emails, and replies to support requests.</li>
            <li>Operate, secure, and improve the Service.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2>4. AI providers</h2>
          <p>
            We use third-party artificial-intelligence providers to help write
            lyrics and produce music from the brief generated from your quiz
            answers. We send only the information needed to create the song
            (the recipient&rsquo;s first name, your relationship, the journey
            stage, your story details, and style preferences) and not your
            payment information. These providers are contractually limited to
            using the data to perform the task we asked them to perform.
          </p>

          <h2>5. How we share information</h2>
          <p>We share personal information only with:</p>
          <ul>
            <li>
              <strong>Service providers</strong> who help us run the Service —
              cloud hosting, database, email delivery, payments, and AI music
              generation.
            </li>
            <li>
              <strong>Legal authorities</strong> when required by law,
              subpoena, or to protect rights and safety.
            </li>
            <li>
              <strong>Successors</strong> in the event of a merger,
              acquisition, or sale of assets.
            </li>
          </ul>
          <p>
            <strong>We do not sell your personal information.</strong> We do
            not share it for cross-context behavioral advertising.
          </p>

          <h2>6. Data retention</h2>
          <p>
            We keep order information (including the brief, lyrics, and audio)
            so you can re-download your song and request revisions. You may ask
            us to delete your account and associated data at any time
            (see Section 8).
          </p>

          <h2>7. Security</h2>
          <p>
            We use industry-standard technical and organizational measures —
            encryption in transit, role-based access controls, and database
            row-level security — to protect your information. No system is
            perfectly secure, but we work hard to keep yours safe.
          </p>

          <h2>8. Your rights &amp; choices</h2>
          <p>
            Depending on where you live, you may have the right to access,
            correct, delete, or port your personal information, to opt out of
            certain processing, and to withdraw consent. To exercise any of
            these rights email us at{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>. We
            will not discriminate against you for exercising these rights.
          </p>

          <h2>9. Children</h2>
          <p>
            The Service is not directed to children under 13 and we do not
            knowingly collect personal information from them. If you believe a
            child has provided us with personal information, please contact us
            and we will delete it.
          </p>

          <h2>10. International users</h2>
          <p>
            PawPrint Song is operated from the United States. If you access the
            Service from outside the U.S., you understand that your information
            may be processed in the U.S. and other countries that may have
            different data-protection laws than your home country.
          </p>

          <h2>11. Governing law</h2>
          <p>
            This Privacy Policy is governed by the laws of the{" "}
            <strong>State of Delaware, USA</strong>, without regard to its
            conflict-of-laws principles, except where superseded by mandatory
            local law.
          </p>

          <h2>12. Changes to this Policy</h2>
          <p>
            We may update this Policy from time to time. We&rsquo;ll update the
            &ldquo;Last updated&rdquo; date and, when changes are material,
            notify you by email or in-product notice.
          </p>

          <h2>13. Contact</h2>
          <p>
            For privacy questions or to exercise your rights, email us at{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
