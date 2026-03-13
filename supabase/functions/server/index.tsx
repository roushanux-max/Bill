import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d504a230/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint - creates user with auto-confirmed email
app.post("/make-server-d504a230/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.error('Error creating user during signup:', error);
      return c.json({ error: error.message }, 400);
    }

    // Send welcome email (best-effort). Uses SendGrid if configured via env var.
    (async () => {
      try {
        const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
        const fromEmail = Deno.env.get('MAIL_FROM') || 'noreply@bill.app';
        const appUrl = Deno.env.get('APP_URL') || 'https://app.bill.app';

        if (!sendgridKey) {
          console.warn('SENDGRID_API_KEY not configured; skipping welcome email');
          return;
        }

        const subject = `Welcome to Bill, ${name || 'there'}!`;

        const safeName = name || '';
        const html = `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
            </head>
            <body style="margin:0;padding:0;background:#f6f9fc;font-family:Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:24px 16px">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="680" style="max-width:680px;background:#ffffff;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:24px 28px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:12px;">
                          <div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#06b6d4);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;">B</div>
                          <div>
                            <div style="font-size:16px;font-weight:600;color:#0f172a">Welcome to Bill</div>
                            <div style="font-size:12px;color:#64748b">Smart, fast invoicing for modern businesses</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px;">
                          <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Hey ${safeName},</h1>
                          <p style="margin:0 0 16px 0;color:#374151;line-height:1.5;">Thanks for signing up — we’re excited to have you on board. Bill helps you create and send beautiful invoices in seconds, track revenue, and manage customers and products effortlessly.</p>
                          <p style="margin:0 0 20px 0;color:#374151;line-height:1.5;">Get started by creating your first invoice or exploring the dashboard. If you ever need help, reply to this email — we read every message.</p>
                          <p style="margin:0 0 24px 0;">
                            <a href="${appUrl}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:600;">Go to Bill</a>
                          </p>
                          <hr style="border:none;border-top:1px solid #eef2f7;margin:20px 0" />
                          <p style="margin:0;color:#6b7280;font-size:13px;">Tips to get the most out of Bill:</p>
                          <ul style="color:#374151;margin:8px 0 0 18px;padding:0 0 0 0;">
                            <li style="margin-bottom:6px">Add your store details from Settings so invoices have your branding.</li>
                            <li style="margin-bottom:6px">Save products to reuse them when creating invoices faster.</li>
                            <li style="margin-bottom:6px">Invite your team from the dashboard (coming soon).</li>
                          </ul>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Bill — Built for small businesses</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;

        const payload = {
          personalizations: [{ to: [{ email }], subject }],
          from: { email: fromEmail, name: 'Bill' },
          content: [{ type: 'text/html', value: html }],
        };

        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('Failed to send welcome email:', e);
      }
    })();

    return c.json({ data });
  } catch (error) {
    console.error('Server error during signup:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);