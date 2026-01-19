# Deployment Guide for Apex PL

This project is built with **Next.js** and uses **Upstash Redis** for caching. The recommended deployment platform is **Vercel**.

## Prerequisites

1.  **Vercel Account**: [Create one here](https://vercel.com/signup).
2.  **Upstash Database**: You need a Redis database. You can use the existing credentials found in your `.env.local` or create a new free database at [Upstash console](https://console.upstash.com/).
3.  **GitHub Repository**: Ensure your code is pushed to GitHub (already done).

## Steps to Deploy on Vercel

1.  **Login to Vercel** and click **"Add New..."** -> **"Project"**.
2.  **Import Git Repository**: Select your repository (`ApexPL` or similar).
3.  **Configure Project**:
    - **Framework Preset**: Next.js (should be auto-detected).
    - **Root Directory**: `./` (default).
    - **Build Command**: `next build` (default).
    - **Install Command**: `npm install` (default).
4.  **Environment Variables**:
    You **MUST** add the following environment variables. Copy them from your local `.env.local` file:

    | Variable Name              | Description                                                         |
    | :------------------------- | :------------------------------------------------------------------ |
    | `UPSTASH_REDIS_REST_URL`   | The URL of your Upstash Redis instance (starts with `https://...`). |
    | `UPSTASH_REDIS_REST_TOKEN` | The secret token for your Redis instance.                           |

5.  **Deploy**: Click **"Deploy"**.

## Post-Deployment Verification

1.  Visit the deployment URL provided by Vercel.
2.  Check the **Snapshot Page** (Home) to ensure team data loads.
3.  Check **Snapshot/SignalStrip** to ensure the "Hot Streak" badges match the team names (verifying the identity fix).

## Troubleshooting

- **500 Errors**: Check Vercel **Logs**. If related to "Redis", verify your `UPSTASH_REDIS_REST_URL` and `TOKEN` are correct.
- **Old Data**: If the data seems stuck, you can manually re-deploy or implement a webhook to purge the cache, but the application uses "Stale-While-Revalidate" so it should self-heal.
