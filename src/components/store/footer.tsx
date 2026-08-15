import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";
import { formatMoneyCompact } from "@/lib/money";
import { impactUnits } from "@/lib/impact";

const SHOP_LINKS = [
  { href: "/shop", label: "All products" },
  { href: "/collections", label: "Collections" },
  { href: "/donate", label: "Make a donation" },
  { href: "/track", label: "Track an order" },
];

const HAVEN_LINKS = [
  { href: "/about", label: "Our mission" },
  { href: "/stories", label: "Stories" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact us" },
];

export async function StoreFooter() {
  const [settings, raisedCents] = await Promise.all([getSettings(), getTotalRaisedCents()]);
  const units = impactUnits(raisedCents, settings);

  return (
    <footer className="mt-20 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LilyMark className="h-8 w-8 text-petal" />
            <span className="font-display text-lg">{settings.storeName}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-moss">{settings.missionStatement}</p>
          {raisedCents > 0 && (
            <p className="tabular mt-4 text-sm text-petal">
              {formatMoneyCompact(raisedCents, settings.currency)} raised
              {units > 0 && ` · ${units} ${units === 1 ? "care kit" : "care kits"} funded`}
            </p>
          )}
        </div>

        <nav aria-label="Shop">
          <h2 className="eyebrow !text-moss">Shop</h2>
          <ul className="mt-3 space-y-2">
            {SHOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-paper/85 hover:text-petal">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="The Haven">
          <h2 className="eyebrow !text-moss">The Haven</h2>
          <ul className="mt-3 space-y-2">
            {HAVEN_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-paper/85 hover:text-petal">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {(settings.socialInstagram || settings.socialFacebook || settings.socialTiktok || settings.socialX) && (
            <div className="mt-5 flex gap-3 text-sm">
              {settings.socialInstagram && (
                <a href={settings.socialInstagram} className="text-paper/70 hover:text-petal" target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {settings.socialFacebook && (
                <a href={settings.socialFacebook} className="text-paper/70 hover:text-petal" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              )}
              {settings.socialTiktok && (
                <a href={settings.socialTiktok} className="text-paper/70 hover:text-petal" target="_blank" rel="noreferrer">
                  TikTok
                </a>
              )}
              {settings.socialX && (
                <a href={settings.socialX} className="text-paper/70 hover:text-petal" target="_blank" rel="noreferrer">
                  X
                </a>
              )}
            </div>
          )}
        </nav>

        <NewsletterForm />
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-moss sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.companyName}. All proceeds fund cancer care.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-petal">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-petal">
              Terms
            </Link>
            {settings.supportEmail && (
              <a href={`mailto:${settings.supportEmail}`} className="hover:text-petal">
                {settings.supportEmail}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
