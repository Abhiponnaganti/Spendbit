git clone https://github.com/your-username/spendbit.git Spendbit

# Spendbit

Spendbit is a modern, AI-powered personal finance app. It’s fast, secure, and built for scale—perfect for portfolios, startups, or interview projects.

## Features

- AI financial advice (Google Gemini)
- Upload and auto-categorize bank statements (PDF/CSV/TXT)
- Real-time dashboard with charts
- Google OAuth login
- Serverless DynamoDB backend
- Responsive, professional UI

## Tech Stack

- Next.js 14, TypeScript, Tailwind CSS
- Next.js API Routes, AWS DynamoDB
- NextAuth.js (Google OAuth)
- Vercel (free deployment)

## Quick Start

1. Clone: `git clone https://github.com/your-username/spendbit.git Spendbit && cd Spendbit`
2. Install: `npm install`
3. Set up AWS and Google Cloud (free tiers)
4. Copy `.env.example` to `.env` and fill in your credentials
5. Run: `npm run setup:tables`
6. Start: `npm run dev` and visit `http://localhost:3000`

## Project Structure

- `app/` – routes, API, dashboard
- `lib/` – database, AI, statement parser
- `components/ui/` – reusable UI
- `scripts/` – setup scripts

## How It Works

1. Sign in with Google
2. Upload bank statements
3. Transactions are auto-categorized and stored
4. AI gives personalized advice
5. Dashboard shows charts and insights

## Cost (Free Tier)

- AWS DynamoDB: Free for most users
- Google Gemini: Free for up to 60 requests/min
- Google OAuth: Free
- Vercel: Free for hobby projects

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy automatically

**Production env example:**
```env
NEXTAUTH_URL=https://your-domain.vercel.app
# ...other variables
```

## Advanced Configuration

- Add custom categories in `lib/statement-processor.ts`
- Change AI prompts in `lib/ai-service.ts`

## Security

- JWT authentication
- User data isolation
- Secure uploads
- HTTPS-only cookies

## Contributing

Great for portfolios, MVPs, enterprise tools, or interview prep. See CONTRIBUTING.md for details.

## Support

1. Check AWS credentials
2. Enable Google APIs
3. Set all environment variables
4. Run `npm run setup:tables`

## License

MIT License. See [LICENSE](LICENSE).

---

Ready to launch? Run `npm run dev` and start tracking your finances! 🚀
