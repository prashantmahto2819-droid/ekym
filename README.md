# Kalchuri One

कलचुरी समाज और उससे जुड़े संगठनों के लिए एक साझा डिजिटल ऑफ़िस: वेबसाइट, सदस्य, पत्र-व्यवहार, रसीद/हिसाब, प्रकाशन, आयोजन, वंश वृक्ष और शोक संदेश।

पहला संगठन: **एकात्म कलार युवा मंच (EKYM)**। पूरी योजना: [`docs/kalchuri-one/`](docs/kalchuri-one/README.md)।

## Development
```sh
bun install
bun run dev        # http://localhost:8080
bun run typecheck
bun run build      # .output/ (Cloudflare Worker)
```
Environment: `.env` में `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public), server के लिए `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_*`, `PUBLIC_SITE_URL`।
Deploy: [`docs/kalchuri-one/DEPLOYMENT_GUIDE.md`](docs/kalchuri-one/DEPLOYMENT_GUIDE.md)।
