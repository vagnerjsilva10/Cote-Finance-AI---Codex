<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/990ee93e-a7c6-481d-9245-dba157ffd338

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## WhatsApp Cron (Production)

The route `/api/cron/whatsapp-digest` is already scheduled in [vercel.json](vercel.json).
When `CRON_SECRET` is set in Vercel, cron requests include `Authorization: Bearer <CRON_SECRET>`.

1. Define `CRON_SECRET` in production environment (Vercel):
   `npx vercel env add CRON_SECRET production`
2. Redeploy after setting the secret:
   `npx vercel --prod`
3. Trigger a protected manual cron run:
   `curl -X GET "https://<YOUR_DOMAIN>/api/cron/whatsapp-digest" -H "Authorization: Bearer <CRON_SECRET>"`
4. Validate delivery events in database:
   `CRON_BASE_URL=https://<YOUR_DOMAIN> CRON_SECRET=<CRON_SECRET> npm run ops:verify-whatsapp-cron`
5. Strict validation (requires at least one digest event and one alert event in lookback window):
   `CRON_BASE_URL=https://<YOUR_DOMAIN> CRON_SECRET=<CRON_SECRET> npm run ops:verify-whatsapp-cron:strict`
