# jotace.io

Personal portfolio built with Next.js, TypeScript, and Tailwind CSS.

**Live site**: [jotace.io](https://jotace.io)

---

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- MDX for blog posts
- Framer Motion + Three.js for animations
- Deployed on Vercel

## Design

**Typography**: Doto (headings) + Antic (body)  
**Colors**: White background, black headings, steel blue (`#4A90D9`) accents

Inspired by PCB aesthetics — circuit traces that draw themselves as you scroll.

## Development
```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000)

## Deploy

Push to `main` → auto-deploys to Vercel

---

Built by [Juance](https://github.com/Jotace5)

## Contact form

The site includes a contact form triggered from the header ("Contact") and the footer ("Send a message"). Emails are sent via [Resend](https://resend.com).

### Setup

1. **Create a Resend account** at [resend.com](https://resend.com). The free tier allows 100 emails/day and 3,000/month.

2. **Verify your domain.** In the Resend dashboard, add `jotace.io` as a sending domain. Resend will provide DNS records (SPF, DKIM) to add in your DNS provider (Cloudflare). Add the records with proxy disabled (DNS only). Verification usually takes a few minutes.

3. **Get your API key.** In the Resend dashboard, create an API key. Copy it — you'll need it for the next step.

4. **Set environment variables.** Three variables are required:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
   CONTACT_EMAIL_TO=juancastap@gmail.com
   CONTACT_EMAIL_FROM=contact@jotace.io
   ```

   Set them in two places:
   - **Locally:** create a `.env.local` file at the project root (gitignored).
   - **Vercel:** Project Settings → Environment Variables → add all three for Production, Preview, and Development environments.

   `CONTACT_EMAIL_FROM` must match a verified sender on the Resend domain. `CONTACT_EMAIL_TO` is the inbox where form submissions land.

### How it works

- The contact form lives in a modal, accessible from both the header nav ("Contact") and the footer ("Send a message").
- **Client-side:** validates name, email, and message fields. Includes a honeypot field for basic anti-spam.
- **Server-side:** `POST /api/contact` validates the payload, checks the honeypot, enforces rate limiting (3 submissions per IP per hour), and sends the email via Resend.
- On success, the modal shows an animated confirmation and auto-closes after 2.5 seconds.

### Rate limiting

The API route uses in-memory rate limiting (Map keyed by IP, sliding window, 3 requests per hour). This is sufficient for a personal portfolio. For higher traffic, consider upgrading to Vercel KV.