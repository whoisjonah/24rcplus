# Flight Plan Listener Service

This service listens to the 24RC WebSocket and stores all flight plans in Supabase so they persist when you're offline.

## Setup Instructions

### 1. Create Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (it's free forever, no credit card needed)
3. Wait for it to provision (~2 minutes)
4. Go to **SQL Editor** and paste the contents of `schema.sql`
5. Click **RUN** to create the database tables
6. Go to **Settings → API** and copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key (for the client)
   - `service_role` `secret` key (for the listener)

### 2. Configure Client

Create a `.env` file in the **root project directory** (24RC folder):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 3. Deploy the Listener Service

#### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (free, no credit card)
3. Click **New Project → Deploy from GitHub repo**
4. Select this repository
5. Set **Root Directory** to `flight-plan-service`
6. Add environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_KEY`: Your service_role key (NOT the anon key)
7. Click **Deploy**

You get 500 hours/month free (more than enough for 24/7 running).

#### Option B: Render.com

1. Go to [render.com](https://render.com)
2. Sign up (free, no credit card)
3. Click **New → Web Service**
4. Connect your GitHub repo
5. Set **Root Directory** to `flight-plan-service`
6. Set **Environment** to Node
7. Add environment variables (same as Railway)
8. Click **Create Web Service**

Free tier keeps your service running 24/7.

#### Option C: Fly.io

1. Install Fly CLI: `brew install flyctl` (Mac) or see [fly.io/docs](https://fly.io/docs)
2. Sign up: `flyctl auth signup`
3. Navigate to service folder: `cd flight-plan-service`
4. Launch: `flyctl launch`
5. Set secrets:
   ```bash
   flyctl secrets set SUPABASE_URL=your-url
   flyctl secrets set SUPABASE_SERVICE_KEY=your-key
   ```
6. Deploy: `flyctl deploy`

### 4. Test It

1. Start your local dev server: `npm run dev` (from the main project)
2. Open the app
3. Check the browser console - you should see:
   - `✅ Loaded X flight plans from Supabase`
4. Have someone file a flight plan in the game
5. Wait 5-10 seconds, refresh the page
6. You should see their flight plan immediately!

### 5. Monitor the Listener

Check your deployment platform's logs to see:
- `✅ Connected to WebSocket`
- `🛫 Flight plan received: ...`
- `✅ Saved FP: ...`

## How It Works

```
Game → WebSocket Server → Your Listener (24/7) → Supabase
                              ↓
                        Your Browser ← Supabase (on page load)
```

1. When you open the app, it fetches ALL flight plans from Supabase
2. Your listener (running 24/7) continuously saves new flight plans to Supabase
3. You get real-time updates via WebSocket PLUS you have all historical data

## Troubleshooting

**No flight plans showing up?**
- Check browser console for errors
- Verify `.env` file has correct Supabase credentials
- Check that `schema.sql` was run successfully in Supabase

**Listener not saving flight plans?**
- Check deployment logs
- Verify `SUPABASE_SERVICE_KEY` is the **service_role** key, not anon key
- Ensure WebSocket connection is successful (`✅ Connected to WebSocket`)

**Old/stale flight plans?**
- The listener automatically cleans up flight plans older than 24 hours (configurable via `FLIGHT_PLAN_TTL_MS` env var; set to `43200000` for 12 hours)
- You can manually clean up in Supabase SQL Editor:
   ```sql
   DELETE FROM flight_plans WHERE last_seen < NOW() - INTERVAL '12 hours';
   ```
