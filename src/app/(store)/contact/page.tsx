import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "./_components/contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Write to the haven — questions about an order, a return, or a kit for someone you love. We read every message.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Write to the haven</h1>
          <p className="mt-5 max-w-md text-ink/75">
            Questions about an order, a return, a kit for someone you love — or something you just
            want us to know. Every message lands with a person, not a queue.
          </p>

          <dl className="mt-9 space-y-6 text-[0.95rem]">
            <div>
              <dt className="eyebrow">Email</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="font-medium text-rose underline underline-offset-[3px]"
                >
                  {settings.supportEmail}
                </a>
              </dd>
            </div>
            {settings.phone && (
              <div>
                <dt className="eyebrow">Phone</dt>
                <dd className="tabular mt-1">{settings.phone}</dd>
              </div>
            )}
            {settings.companyAddress && (
              <div>
                <dt className="eyebrow">Post</dt>
                <dd className="mt-1 whitespace-pre-line">{settings.companyAddress}</dd>
              </div>
            )}
          </dl>

          <hr className="rule mt-9 max-w-md" />
          <p className="mt-4 max-w-md text-sm text-ink/60">
            We usually reply within a day. If it’s about an order, include the order number — it
            starts with <span className="tabular">LSH-</span>.
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
