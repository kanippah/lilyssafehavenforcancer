import "server-only";
import nodemailer from "nodemailer";
import { formatMoney } from "@/lib/money";
import type { Order, OrderItem } from "@prisma/client";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const transport = getTransport();
  if (!transport) return;
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "Lily's Safe Haven <no-reply@lilyssafehavenforcancer.com>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[mail] send failed:", err);
  }
}

export async function sendOrderConfirmation(
  order: Order & { items: OrderItem[] },
  storeName: string
): Promise<void> {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 12px 6px 0">${escapeHtml(i.title)}${
          i.variantTitle ? ` — ${escapeHtml(i.variantTitle)}` : ""
        } × ${i.quantity}</td><td align="right">${formatMoney(i.unitCents * i.quantity, order.currency)}</td></tr>`
    )
    .join("");
  await send(
    order.email,
    `${storeName} — order ${order.number} received`,
    `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#22322A">
      <h2 style="font-weight:normal">Thank you. Your order is a small shelter for someone.</h2>
      <p>Order <strong>${order.number}</strong> — we'll email again when it ships.</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <hr style="border:none;border-top:1px solid #ddd"/>
      <table style="width:100%"><tr><td>Total</td><td align="right"><strong>${formatMoney(order.totalCents, order.currency)}</strong></td></tr></table>
      ${order.donationCents > 0 ? `<p>Including your ${formatMoney(order.donationCents, order.currency)} donation — thank you twice over.</p>` : ""}
    </div>`
  );
}

export async function sendPasswordReset(email: string, resetUrl: string, storeName: string): Promise<void> {
  await send(
    email,
    `${storeName} — reset your password`,
    `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#22322A">
      <p>Someone asked to reset the password for this email. If it was you, the link below works for one hour:</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If it wasn't you, you can ignore this email.</p>
    </div>`
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
