# Deploy CyberBirdies Node Server

This runs the full site (pages + booking recording + availability) on a Node host.

## Recommended: Render.com (free tier works)

1. Create a free account at https://render.com
2. New → Web Service → connect a Git repo **or** use “Deploy from public Git” / upload.
   - Easiest if you don’t have Git: zip the folder and use a temporary public GitHub repo, or use Railway instead.
3. Runtime: Node
4. Build command: (leave blank or `echo "no build"`)
5. Start command: `node server.js`
6. Environment variables (from .env.example):
   - `SITE_URL` = `https://your-app-name.onrender.com` (or your custom domain later)
   - `OWNER_TOKEN` = a long random string (generate one)
   - Leave NOWPAYMENTS keys empty for now (Square is primary)
   - `ALLOW_DEMO_WEBHOOK` = `false`

7. After deploy, point your domain `cyberbirdies.com` at the Render URL (custom domain settings in Render + DNS).

## View bookings
```bash
curl -H "x-owner-token: YOUR_TOKEN" https://your-url/api/owner/bookings
```

## Emails (next step)
Confirmation and reminder emails are not sent yet. The hooks are marked in server.js.
Tell me which service you want (Resend free tier is easiest) and I’ll wire it.

## Local test
```bash
cd cyberbirdies-site
cp .env.example .env
# edit .env if wanted
node server.js
# open http://localhost:3000
```
