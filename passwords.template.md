Passwords template — DO NOT COMMIT REAL SECRETS

This file is a template you can copy locally and fill with real passwords. Keep the real copy outside the repo and add it to your personal secure storage.

How to use

1. Copy to a local file outside the repo (example: `~/secrets/24rc-passwords.md`).
2. Fill in values and protect the file with OS permissions.
3. Use a password manager (1Password, Bitwarden) or host secret manager to share securely.

Template fields

- service_admin_username: <your-admin-username>
- service_admin_password: <replace-with-strong-password>
- supabase_service_role_key: <DO NOT STORE IN REPO — use host secrets>
- other_api_key: <replace>

DO NOT commit this file with real secrets. If you want, I can add `passwords.template.md` to `.gitignore` automatically or create a local script to load secrets from your local file into environment variables for development.
