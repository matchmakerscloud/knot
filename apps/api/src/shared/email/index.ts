import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../../config/index.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(msg: EmailMessage): Promise<{ id: string }>;
}

class ConsoleEmailService implements EmailService {
  async send(msg: EmailMessage): Promise<{ id: string }> {
    const id = `console-${Date.now()}`;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ kind: 'email.send', backend: 'console', id, to: msg.to, subject: msg.subject }),
    );
    return { id };
  }
}

class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter;

  constructor() {
    const hasAuth = config.mail.smtp.user && config.mail.smtp.pass;
    this.transporter = nodemailer.createTransport({
      host: config.mail.smtp.host,
      port: config.mail.smtp.port,
      secure: config.mail.smtp.secure,
      // Local catchers (mailpit) speak plain SMTP; don't try STARTTLS unless explicitly secure.
      ignoreTLS: !config.mail.smtp.secure,
      requireTLS: false,
      auth: hasAuth ? { user: config.mail.smtp.user!, pass: config.mail.smtp.pass! } : undefined,
    });
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const info = await this.transporter.sendMail({
      from: config.mail.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? stripHtml(msg.html),
    });
    return { id: String(info.messageId) };
  }
}

class ResendEmailService implements EmailService {
  async send(msg: EmailMessage): Promise<{ id: string }> {
    const apiKey = config.mail.resend.apiKey;
    if (!apiKey) throw new Error('email.resend.api_key_missing');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: config.mail.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? stripHtml(msg.html),
      }),
    });
    if (!res.ok) {
      throw new Error(`email.resend.send_failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id ?? `resend-${Date.now()}` };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cached: EmailService | undefined;
export function getEmailService(): EmailService {
  if (cached) return cached;
  switch (config.mail.backend) {
    case 'smtp':
      cached = new SmtpEmailService();
      break;
    case 'resend':
      cached = new ResendEmailService();
      break;
    case 'console':
    default:
      cached = new ConsoleEmailService();
  }
  return cached;
}
