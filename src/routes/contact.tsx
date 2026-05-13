import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — PawPrint Song" },
      {
        name: "description",
        content:
          "Get in touch with PawPrint Song. Questions about your custom song, your order, or how it works? We're here to help.",
      },
      { property: "og:title", content: "Contact Us — PawPrint Song" },
      {
        property: "og:description",
        content:
          "Questions about your custom song or order? Reach the PawPrint Song team — we usually reply within a few hours.",
      },
    ],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty({ message: "Please add your name" })
    .max(100, { message: "Name must be under 100 characters" }),
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email" })
    .max(255, { message: "Email must be under 255 characters" }),
  orderId: z.string().trim().max(100).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .nonempty({ message: "Please add a message" })
    .max(2000, { message: "Message must be under 2000 characters" }),
});

const FAQS = [
  {
    q: "How long does it take to get my song?",
    a: "Standard delivery is up to 5 days. If you chose 24-hour Rush or 90-minute Priority at checkout, we'll honor that faster timing. You'll get an email the moment it's ready, plus a link to your private listening page.",
  },
  {
    q: "Can I request changes after I hear it?",
    a: "Yes. Every order includes one free revision — just hit \"Request a revision\" on your listening page and tell us what to tweak (lyrics, tone, tempo, vocals). If you bought Unlimited Edits at checkout, you can revise as many times as you need.",
  },
  {
    q: "What if I don't love it?",
    a: "We'll keep working with you until you do. If a revision doesn't get you there, use the form on this page and we'll regenerate the song or refund you — your call.",
  },
  {
    q: "How does the \"Re-Found\" reaction reward work?",
    a: "Send us a video of the recipient hearing the song for the first time. Once we approve it, you get a full refund of your order plus 2 free songs to gift to anyone you choose. Submit your video from your listening page.",
  },
  {
    q: "Can I gift the song to someone?",
    a: "Absolutely — that's what most people do. At checkout you can choose to send it directly to the recipient on a date you pick (birthday, anniversary, etc.) or get the link yourself to deliver in person.",
  },
  {
    q: "What formats do I get?",
    a: "You get a high-quality MP3 download, a streaming link to your private listening page, and printable lyrics. Two voice variants are included so you can pick the one you love.",
  },
  {
    q: "Who owns the song?",
    a: "You do — you have full personal-use rights to share it, play it, and give it as a gift. For commercial use (advertising, resale, sync), email us first.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. If you're not happy after a revision, we'll refund you. Use the form on this page within 30 days of delivery.",
  },
];

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const parsed = contactSchema.safeParse({ name, email, orderId, message });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "Please check the form");
      setSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "submit-support-message",
        {
          body: {
            name: parsed.data.name,
            email: parsed.data.email,
            orderId: parsed.data.orderId || null,
            message: parsed.data.message,
          },
        },
      );
      if (error || (data && (data as any).error)) {
        throw new Error(error?.message ?? (data as any)?.error ?? "Send failed");
      }
      setSubmitted(true);
      toast.success("Message sent — we'll reply by email shortly.");
    } catch (err: any) {
      console.error("contact submit failed", err);
      toast.error(err?.message ?? "Couldn't send. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F0E6] text-[#1F1B16]">
      <SiteHeader />

      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-12 sm:px-6 md:pt-16">
        {/* Header */}
        <section className="mx-auto max-w-[720px] text-center">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[rgba(31,27,22,0.55)]">
            We're here to help
          </p>
          <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[56px]">
            Talk to a real human
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.55] text-[rgba(31,27,22,0.7)] md:text-[17px]">
            Most questions are answered below. If yours isn't, send us a note — we usually reply
            within a few hours.
          </p>
        </section>

        {/* Contact + quick info */}
        <section className="mt-12 grid gap-8 md:mt-16 md:grid-cols-[1.2fr_1fr]">
          {/* Form */}
          <div className="rounded-[20px] border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6 md:p-8">
            <h2 className="font-display text-[24px] font-semibold tracking-[-0.01em]">
              Send us a message
            </h2>
            <p className="mt-2 text-[14px] text-[rgba(31,27,22,0.6)]">
              Have an order already? Drop the order ID so we can find it faster.
            </p>

            {submitted ? (
              <div className="mt-6 rounded-[14px] border border-[rgba(141,111,175,0.25)] bg-[rgba(141,111,175,0.06)] p-5 text-[14px] text-[#8D6FAF]">
                Got it — your message is in our inbox. We'll reply to{" "}
                <span className="font-semibold">{email}</span> within a few hours. If anything
                urgent, submit another note here and it will stay attached to support.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#1F1B16]">
                    Your name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    required
                    className="border-[rgba(31,27,22,0.2)] bg-white text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1F1B16]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    required
                    className="border-[rgba(31,27,22,0.2)] bg-white text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderId" className="text-[#1F1B16]">
                    Order ID <span className="text-[rgba(31,27,22,0.5)]">(optional)</span>
                  </Label>
                  <Input
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    maxLength={100}
                    className="border-[rgba(31,27,22,0.2)] bg-white text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
                    placeholder="e.g. 8f3a2c…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[#1F1B16]">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    required
                    rows={6}
                    className="border-[rgba(31,27,22,0.2)] bg-white text-[#1F1B16] placeholder:text-[rgba(31,27,22,0.4)]"
                    placeholder="Tell us what's going on…"
                  />
                  <p className="text-right text-[12px] text-[rgba(31,27,22,0.45)]">
                    {message.length}/2000
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-full bg-[#8D6FAF] text-[15px] font-semibold text-[#FFF7EE] hover:bg-[#6B4F8A]"
                >
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>

          {/* Quick info card */}
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
              <h3 className="font-display text-[18px] font-semibold">Support inbox</h3>
              <p className="mt-1 text-[14px] text-[rgba(31,27,22,0.65)]">
                Fastest way to reach us. Messages submitted here go directly into our staff panel.
              </p>
              <Link
                to="/contact"
                className="mt-3 inline-block text-[15px] font-medium text-[#8D6FAF] hover:underline"
              >
                Use this form
              </Link>
            </div>

            <div className="rounded-[20px] border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
              <h3 className="font-display text-[18px] font-semibold">Reply time</h3>
              <p className="mt-1 text-[14px] text-[rgba(31,27,22,0.65)]">
                We usually answer within a few hours, 7 days a week. Order issues are always top
                priority.
              </p>
            </div>

            <div className="rounded-[20px] border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] p-6">
              <h3 className="font-display text-[18px] font-semibold">Already ordered?</h3>
              <p className="mt-1 text-[14px] text-[rgba(31,27,22,0.65)]">
                You can track your order, request revisions, and download your song from your
                listening page.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-20 md:mt-24">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[rgba(31,27,22,0.55)]">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[42px]">
              Quick answers
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-[760px]">
            <Accordion type="single" collapsible className="space-y-3">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="overflow-hidden rounded-[14px] border border-[rgba(31,27,22,0.12)] bg-[#FBF6EC] px-5"
                >
                  <AccordionTrigger className="py-5 text-left text-[16px] font-medium text-[#1F1B16] hover:no-underline md:text-[17px]">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[15px] leading-[1.6] text-[rgba(31,27,22,0.7)]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
