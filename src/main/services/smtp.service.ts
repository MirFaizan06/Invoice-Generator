import nodemailer from 'nodemailer';
import { getDB } from '../database';
import { getSetting } from './settings.service';
import type { MailLog } from '../../shared/types';

interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  businessId: number;
  senderName: string;
  relatedType?: string;
  relatedId?: number;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const gmailUser = getSetting('gmail_user') ?? '';
  const gmailPass = getSetting('gmail_pass') ?? '';

  if (!gmailUser || !gmailPass) {
    return { success: false, error: 'Gmail credentials not configured. Go to Settings → Email to add your Gmail address and App Password.' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  try {
    await transporter.sendMail({
      from: `"${opts.senderName}" <${gmailUser}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      subject: opts.subject,
      html: opts.bodyHtml,
    });
    saveMailLog({ ...opts, status: 'sent', errorMessage: '' });
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    saveMailLog({ ...opts, status: 'failed', errorMessage });
    return { success: false, error: errorMessage };
  }
}

function saveMailLog(opts: SendEmailOptions & { status: string; errorMessage: string }): void {
  getDB().prepare(`
    INSERT INTO mail_logs (business_id, to_email, to_name, subject, body_html, related_type, related_id, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    opts.businessId, opts.to, opts.toName, opts.subject, opts.bodyHtml,
    opts.relatedType ?? '', opts.relatedId ?? null, opts.status, opts.errorMessage
  );
}

export function getMailLogs(filters: { businessId?: number; status?: string }): MailLog[] {
  let query = 'SELECT * FROM mail_logs WHERE 1=1';
  const params: unknown[] = [];
  if (filters.businessId) { query += ' AND business_id = ?'; params.push(filters.businessId); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  query += ' ORDER BY sent_at DESC';
  return getDB().prepare(query).all(...params) as MailLog[];
}

export function deleteMailLog(id: number): void {
  getDB().prepare('DELETE FROM mail_logs WHERE id = ?').run(id);
}
