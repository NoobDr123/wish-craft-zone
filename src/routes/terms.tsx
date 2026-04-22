import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service · RibbonSong" },
      {
        name: "description",
        content:
          "RibbonSong Terms of Service — the agreement between you and RibbonSong governing use of our personalized song service. Governed by the laws of the State of Delaware.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function TermsPage() {
  const updated = "April 22, 2026";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-6 [&_li]:my-1 [&_ul]:list-disc">
          <p>
            Welcome to RibbonSong. These Terms of Service (&ldquo;Terms&rdquo;)
            form a binding agreement between you and RibbonSong
            (&ldquo;RibbonSong&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) and govern your access to and use of the
            ribbonsong.com website, the song-creation quiz, and all related
            services (together, the &ldquo;Service&rdquo;). By using the
            Service, taking the quiz, or purchasing a song you agree to these
            Terms and our{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <h2>1. Who we are</h2>
          <p>
            RibbonSong creates personalized songs as a thoughtful gift, often
            for someone facing illness, in hospice, or in loving memory. Songs
            are produced with the help of artificial intelligence and refined by
            our team. We are not a medical, grief-counseling, or therapeutic
            service.
          </p>

          <h2>2. Eligibility &amp; account</h2>
          <p>
            You must be at least 18 years old to purchase a song. You agree to
            provide accurate information about yourself and the recipient and
            to keep your account credentials secure.
          </p>

          <h2>3. Your story &amp; content you provide</h2>
          <p>
            When you fill out the quiz you give us details about you and the
            person the song is for (their name, your relationship, where they
            are in their journey, memories, and a personal note). You confirm
            that:
          </p>
          <ul>
            <li>
              You have the right to share this information for the purpose of
              creating the song.
            </li>
            <li>
              The information is true to the best of your knowledge and does
              not violate anyone&rsquo;s rights.
            </li>
            <li>
              You will not submit content that is unlawful, hateful, harassing,
              defamatory, sexually explicit, or otherwise inappropriate.
            </li>
          </ul>
          <p>
            You retain ownership of the personal facts and stories you share.
            You grant RibbonSong a worldwide, royalty-free license to use that
            information solely to produce, deliver, and improve your song and
            the Service.
          </p>

          <h2>4. The song &amp; your rights to it</h2>
          <p>
            Once your song is delivered and fully paid for, you receive a
            perpetual, worldwide, non-exclusive license to use the song for
            personal, non-commercial purposes — playing it, sharing it
            privately, posting it on personal social media, and including it in
            personal memorial materials. RibbonSong retains ownership of the
            underlying composition and recording so we can continue to operate
            and improve the Service. Commercial use (selling, sync licensing,
            broadcast, paid streaming distribution) is not permitted without
            our prior written consent.
          </p>

          <h2>5. Pricing, payment &amp; upsells</h2>
          <p>
            The base price for a song is shown at checkout (currently
            $69.99 USD). After your purchase you may be offered optional
            upgrades (for example, an extra verse, rush delivery, or unlimited
            edits). Optional upgrades are charged to the payment method you
            used at checkout only after you click to accept them. All payments
            are processed by our payment provider; we do not store your full
            card number.
          </p>

          <h2>6. Delivery</h2>
          <p>
            Standard delivery is typically within 7 days. Rush delivery, when
            purchased, targets 24 hours. Delivery times are estimates, not
            guarantees, and can be affected by quality review, AI provider
            availability, or other factors.
          </p>

          <h2>7. Revisions &amp; refunds</h2>
          <p>
            Because each song is custom-made for a specific person and contains
            their name and story, songs are non-returnable in the traditional
            sense. We will, however, work in good faith to make your song right:
          </p>
          <ul>
            <li>
              <strong>Free revision:</strong> every order includes one free
              round of revisions to lyrics or tone within 14 days of delivery.
            </li>
            <li>
              <strong>Unlimited Edits add-on:</strong> if purchased, allows
              additional revision rounds during the same window.
            </li>
            <li>
              <strong>Refunds:</strong> if we are unable to deliver a song that
              meets a reasonable standard of quality, we will offer a full or
              partial refund at our discretion. Refund requests should be sent
              to{" "}
              <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>{" "}
              within 30 days of delivery.
            </li>
          </ul>

          <h2>8. Sensitive subject matter &amp; not medical advice</h2>
          <p>
            Many of our songs are written for people facing serious illness or
            for someone who has passed away. RibbonSong is a creative gift, not
            medical, psychological, religious, or legal advice. If you or
            someone you love is in crisis, please contact a qualified
            professional or local emergency services.
          </p>

          <h2>9. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service to harass, defame, or impersonate anyone.</li>
            <li>
              Submit a song request about a real, identifiable person without a
              good-faith belief that the request would be welcomed by them or
              their family.
            </li>
            <li>
              Reverse-engineer, scrape, or attempt to disrupt the Service.
            </li>
            <li>
              Use the Service for any unlawful purpose or in violation of
              applicable laws.
            </li>
          </ul>
          <p>
            We may suspend or cancel orders that violate these Terms, with a
            refund where appropriate.
          </p>

          <h2>10. Intellectual property</h2>
          <p>
            The Service, including the website, the quiz flow, our brand, and
            our underlying technology, is owned by RibbonSong and protected by
            intellectual-property laws. Nothing in these Terms transfers
            ownership of the Service to you.
          </p>

          <h2>11. Disclaimers</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;. To the fullest extent permitted by law, we
            disclaim all warranties, express or implied, including
            merchantability, fitness for a particular purpose, and
            non-infringement. We do not warrant that the Service will be
            uninterrupted, error-free, or that any specific song will achieve
            any particular emotional outcome.
          </p>

          <h2>12. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, RibbonSong&rsquo;s total
            liability arising out of or relating to the Service or these Terms
            will not exceed the greater of (a) the amount you paid us for the
            order in question, or (b) one hundred U.S. dollars ($100). In no
            event will RibbonSong be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages, or for lost profits,
            revenue, or data.
          </p>

          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify and hold RibbonSong harmless from any
            claims, damages, or expenses arising out of (a) the information you
            submit through the quiz, (b) your use of a delivered song, or (c)
            your violation of these Terms.
          </p>

          <h2>14. Governing law &amp; venue</h2>
          <p>
            These Terms and any dispute arising out of or relating to them or
            the Service are governed by and construed in accordance with the
            laws of the <strong>State of Delaware, USA</strong>, without regard
            to its conflict-of-laws principles. The exclusive venue for any
            dispute that is not subject to arbitration shall be the state and
            federal courts located in Delaware, and you consent to the personal
            jurisdiction of those courts.
          </p>

          <h2>15. Dispute resolution</h2>
          <p>
            Before filing a claim, you agree to first contact us at{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a> and
            try in good faith to resolve the dispute informally. Any dispute
            that cannot be resolved informally shall be resolved exclusively as
            described in Section 14.
          </p>

          <h2>16. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material
            changes we will update the &ldquo;Last updated&rdquo; date and,
            where appropriate, notify you. Your continued use of the Service
            after changes take effect constitutes acceptance of the updated
            Terms.
          </p>

          <h2>17. Contact</h2>
          <p>
            Questions about these Terms? Email us at{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
