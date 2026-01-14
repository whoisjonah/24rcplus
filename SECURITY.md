Security guidance — do NOT commit secrets to the repo

- Never store plaintext passwords, API keys, or service_role keys in the repository.
- Use your host's secret manager (Vercel/Netlify/Railway/Render), or GitHub Secrets for CI/deploy.
- For local development, use a `.env` file that is listed in `.gitignore`.

Recommended workflow

1. Create secrets in your hosting provider (e.g. Vercel Environment Variables, Railway/Render secrets, Supabase service_role in project settings).
2. Reference them from the app at build/runtime using `process.env` or Vite's `VITE_` prefixed vars.
3. For local development, create `.env.local` with real secrets (never commit). Commit a `.env.example` that contains placeholder names only.

Rotating / revoking access

- If you need to revoke a password or key:
  - Remove or rotate the secret in the server/DB or service dashboard.
  - Redeploy the service so the new configuration (missing/rotated secret) takes effect.
  - Invalidate any long-lived tokens if your system issues session tokens — rotate or blacklist them server-side.
  - If credentials were distributed to users, inform them and provide new credentials via a secure channel.

Notes about redeploy behavior

- If a password or key is removed from server configuration and the service is redeployed, the server will stop accepting that credential for authentication checks performed server-side.
- However, any client that has an active session token or cached credential locally may retain access until that token expires or is explicitly revoked server-side.
- To ensure immediate revocation, implement short-lived tokens and a server-side revocation mechanism (session store, token blacklist, or bump a key-version field in your DB).

If you want, I can:
- Add a `.env.example` (placeholders only) or update the existing one.
- Add a `passwords.template` file that is gitignored and contains field names but no secrets.
- Help configure your hosting provider's secret manager and rotate current keys safely.
