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
          "RibbonSong Terms of Service — the agreement between you and FlowsCommerce Solutions, LLC governing use of the RibbonSong personalized song service. Governed by the laws of the State of Delaware.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function TermsPage() {
  const updated = "April 25, 2026";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective Date: {updated}</p>

        <div className="prose prose-neutral mt-10 max-w-none text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:leading-relaxed [&_p]:my-3 [&_ul]:my-3 [&_ul]:pl-6 [&_li]:my-1 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal">
          <p>
            Welcome to RibbonSong. These Terms of Service (&ldquo;Terms&rdquo;)
            govern your access to and use of the RibbonSong website
            (ribbonsong.com) and the personalized song gift services provided
            by FlowsCommerce Solutions, LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
            or &ldquo;our&rdquo;).
          </p>
          <p>
            By accessing our website or purchasing our services, you agree to
            be bound by these Terms. If you do not agree to these Terms, please
            do not use our services.
          </p>

          <h2>1. Who We Are</h2>
          <p>
            RibbonSong is a personalized song gift service operated by
            FlowsCommerce Solutions, LLC, a Delaware Limited Liability Company
            located at 8 The Green STE D, Dover, DE 19901. Our services involve
            the creation of custom personalized songs as gifts, produced with
            the assistance of artificial intelligence and refined by our team.
          </p>
          <p>
            Please note that RibbonSong is not a medical, grief-counseling, or
            therapeutic service. Our products are intended solely for personal
            entertainment and gifting purposes.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            By using our services, you represent and warrant that you are at
            least 18 years of age and possess the legal authority to enter into
            these Terms. You also agree to provide accurate, current, and
            complete information during the order process and to update such
            information as necessary.
          </p>

          <h2>3. Content You Provide</h2>
          <p>
            To create your personalized song, you will provide us with
            information, stories, names, and other details (&ldquo;User
            Content&rdquo;).
          </p>
          <p>
            By submitting User Content, you grant us a worldwide, non-exclusive,
            royalty-free license to use, reproduce, modify, and adapt your User
            Content solely for the purpose of creating and delivering your
            personalized song. You represent and warrant that you have all
            necessary rights, consents, and permissions to share the User
            Content with us, and that such content does not violate any
            third-party rights, including privacy, publicity, or intellectual
            property rights.
          </p>
          <p>
            You agree not to submit any User Content that is unlawful,
            defamatory, obscene, harassing, or otherwise objectionable. We
            reserve the right to refuse service or reject any User Content at
            our sole discretion.
          </p>

          <h2>4. Song Rights and Licensing</h2>
          <p>
            Upon full payment and delivery of your personalized song,
            RibbonSong grants you a personal, non-exclusive, non-transferable,
            worldwide license to use, play, and share the song for personal,
            non-commercial purposes only.
          </p>
          <p>
            FlowsCommerce Solutions, LLC retains all ownership, copyrights, and
            intellectual property rights to the underlying musical composition,
            lyrics, and sound recording. You may not monetize, distribute for
            profit, broadcast commercially, or use the song in any commercial
            media (including monetized social media channels, advertisements,
            or films) without our prior written consent.
          </p>

          <h2>5. Pricing, Payment, and Upsells</h2>
          <p>
            Our base price for a personalized song is $49.99 USD. All prices
            are subject to change without notice. We may offer optional
            upgrades, add-ons, or faster delivery tiers during or after the
            checkout process. You will only be charged for optional upgrades if
            you explicitly accept them.
          </p>
          <p>
            All payments are securely processed through our third-party payment
            processor, Stripe. By submitting your payment information, you
            authorize us and Stripe to charge your designated payment method
            for the total amount of your order, including any selected upgrades
            and applicable taxes.
          </p>
          <p>
            <strong>Statement Descriptor:</strong> Charges on your bank or
            credit card statement will appear as &ldquo;RIBBONSONG&rdquo;.
          </p>

          <h2>6. Delivery</h2>
          <p>
            We offer three delivery tiers for your personalized song:
          </p>
          <ul>
            <li>
              <strong>Standard Delivery:</strong> Estimated delivery within 5
              business days.
            </li>
            <li>
              <strong>48h Priority Delivery:</strong> Estimated delivery within
              48 hours (available as an optional upgrade).
            </li>
            <li>
              <strong>24h Rush Delivery:</strong> Estimated delivery within 24
              hours (premium rush upgrade).
            </li>
          </ul>
          <p>
            Please note that all delivery times are estimates and not
            guaranteed. Delays may occur due to high order volume, technical
            issues, or incomplete User Content. A delay in delivery does not
            entitle you to a refund, provided the song is delivered within 30
            days of purchase.
          </p>

          <h2>7. Revisions, Refunds, and Dispute Resolution</h2>
          <h3>Revisions</h3>
          <p>
            We want you to love your song. Every order includes one (1) free
            revision within 14 days of delivery to address minor adjustments
            (e.g., mispronunciations, factual errors based on the provided
            quiz). For additional revisions, an &ldquo;Unlimited Edits&rdquo;
            add-on is available for purchase.
          </p>
          <h3>Refunds</h3>
          <p>
            Because our products are custom-made digital goods created
            specifically for you, they are inherently non-returnable. Refunds
            are issued solely at our discretion and only in cases where the
            final product fails to meet our quality standards. To request a
            refund or report a quality issue, you must contact us at{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>{" "}
            within 30 days of delivery.
          </p>
          <h3>Dispute Policy</h3>
          <p>
            By purchasing from RibbonSong, you explicitly acknowledge and agree
            to the following:
          </p>
          <ol>
            <li>
              <strong>Digital Delivery Acknowledgment:</strong> You agree that
              you are purchasing a custom digital product. Once the song is
              delivered to you via email or a download link, the service is
              considered fully rendered and fulfilled.
            </li>
            <li>
              <strong>Contact Us First:</strong> You agree to contact
              RibbonSong directly at{" "}
              <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a> to
              resolve any issues, request revisions, or seek a refund before
              initiating any dispute or chargeback with your bank or credit
              card issuer. We are committed to resolving any concerns promptly
              and fairly.
            </li>
            <li>
              <strong>Consent to Evidence Collection:</strong> In the event of
              a payment dispute, you acknowledge and agree that RibbonSong may
              submit your order details, delivery confirmation (including email
              open/click logs), IP address, timestamped quiz responses, and all
              communication logs as evidence to the payment processor and your
              financial institution.
            </li>
            <li>
              <strong>Pre-Authorization Acknowledgment:</strong> By completing
              the checkout process, you confirm that you are the authorized
              cardholder of the payment method used and that the transaction is
              fully authorized.
            </li>
          </ol>

          <h2>8. Disclaimers</h2>
          <p>
            Our services are provided on an &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; basis. We make no warranties, express or implied,
            regarding the specific emotional impact, musical style perfection,
            or subjective satisfaction of the personalized song. We disclaim
            all warranties of merchantability, fitness for a particular
            purpose, and non-infringement.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, FlowsCommerce
            Solutions, LLC and its affiliates, officers, employees, and agents
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to
            emotional distress, loss of profits, or data loss, arising out of
            or related to your use of our services. In no event shall our
            total liability to you exceed the amount you paid for the specific
            service giving rise to the claim.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless FlowsCommerce
            Solutions, LLC and its affiliates from and against any claims,
            liabilities, damages, losses, and expenses, including reasonable
            attorneys&rsquo; fees, arising out of or in any way connected with
            your User Content, your violation of these Terms, or your violation
            of any third-party rights.
          </p>

          <h2>11. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the State of Delaware, without regard to its conflict
            of law principles.
          </p>
          <p>
            <strong>Binding Arbitration:</strong> Any dispute, claim, or
            controversy arising out of or relating to these Terms or the
            breach, termination, enforcement, interpretation, or validity
            thereof, including the determination of the scope or applicability
            of this agreement to arbitrate, shall be determined by binding
            arbitration in Delaware, rather than in court.
          </p>
          <p>
            <strong>Waiver of Class Action:</strong> You agree that any dispute
            resolution proceedings will be conducted only on an individual
            basis and not in a class, consolidated, or representative action.
          </p>

          <h2>12. Privacy Policy</h2>
          <p>
            Your privacy is important to us. Please review our{" "}
            <Link to="/privacy">Privacy Policy</Link>, which explains how we
            collect, use, and protect your personal information. By using our
            services, you consent to our data practices as described in the
            Privacy Policy.
          </p>

          <h2>13. Modification of Terms</h2>
          <p>
            We reserve the right to modify or update these Terms at any time.
            Any changes will be effective immediately upon posting on our
            website. Your continued use of our services after any modifications
            constitutes your acceptance of the revised Terms.
          </p>

          <h2>14. Severability and Entire Agreement</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or
            invalid, that provision will be limited or eliminated to the
            minimum extent necessary so that these Terms will otherwise remain
            in full force and effect. These Terms constitute the entire
            agreement between you and FlowsCommerce Solutions, LLC regarding
            the use of our services.
          </p>

          <h2>15. Contact Information</h2>
          <p>
            If you have any questions, concerns, or require support, please
            contact us at:
          </p>
          <p>
            FlowsCommerce Solutions, LLC<br />
            8 The Green STE D<br />
            Dover, DE 19901<br />
            Email:{" "}
            <a href="mailto:hello@ribbonsong.com">hello@ribbonsong.com</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
