import { UserRole } from "@/types/database.types";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@gebyarbulanbahasa.id";

  if (!apiKey) {
    // If no external email API key configured, simulate success and log to console
    console.log(`[Email Simulation] To: ${to} | Subject: "${subject}" | From: ${from}`);
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `GebyarBulanBahasa <${from}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.message || "Gagal mengirim email." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kesalahan jaringan pengiriman email." };
  }
}

// Template: Kredensial Juri Baru
export function getJudgeCredentialsEmailHtml(judgeName: string, email: string, temporaryPass: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px;">
      <h2 style="color: #1c202e; margin-bottom: 8px;">Undangan & Kredensial Dewan Juri</h2>
      <p style="color: #666; font-size: 14px;">Gebyar Bulan Bahasa & Kebudayaan 2025</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <p>Yth. <strong>${judgeName}</strong>,</p>
      <p>Anda telah ditugaskan sebagai Dewan Juri pada peringatan Hari Sumpah Pemuda. Berikut adalah kredensial akun penilaian digital Anda:</p>
      <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 14px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Password Sementara:</strong> ${temporaryPass}</p>
      </div>
      <p>Silakan masuk melalui portal dewan juri di tautan berikut dan segera perbarui kata sandi Anda:</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/masuk" style="display: inline-block; background: #1c202e; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">Masuk ke Portal Juri</a>
    </div>
  `;
}

// Template: Broadcast Pengumuman Penting
export function getBroadcastAnnouncementEmailHtml(title: string, body: string, publishedAt: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 12px;">
      <span style="background: #e11d48; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">PENGUMUMAN RESMI</span>
      <h2 style="color: #1c202e; margin-top: 12px; margin-bottom: 8px;">${title}</h2>
      <p style="color: #888; font-size: 12px;">Diterbitkan: ${publishedAt}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <div style="color: #333; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">${body}</div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        Seksi Acara & Operasional Gebyar Bulan Bahasa 2025
      </div>
    </div>
  `;
}
