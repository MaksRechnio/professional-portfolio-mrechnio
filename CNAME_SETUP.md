# Custom Domain Setup Guide

## Step 1: Add CNAME File

I'll create a CNAME file with your domain. Replace `yourdomain.com` with your actual domain.

## Step 2: Configure DNS Settings

### Option A: Root Domain (yourdomain.com)

If you want to use your root domain (e.g., `maksrechnio.com`):

**DNS Records to Add:**
- **Type:** `A`
- **Name:** `@` (or leave blank)
- **Value:** 
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

Add all 4 A records pointing to these IPs.

### Option B: Subdomain (www.yourdomain.com)

If you want to use a subdomain (e.g., `www.maksrechnio.com`):

**DNS Records to Add:**
- **Type:** `CNAME`
- **Name:** `www`
- **Value:** `maksrechnio.github.io`

## Step 3: Enable Custom Domain in GitHub

1. Go to your repository: https://github.com/MaksRechnio/professional-portfolio-mrechnio/settings/pages
2. Under "Custom domain", enter your domain (e.g., `yourdomain.com` or `www.yourdomain.com`)
3. Check "Enforce HTTPS" (recommended)
4. Click "Save"

## Step 4: Wait for DNS Propagation

- DNS changes can take 24-48 hours to propagate globally
- You can check propagation status at: https://www.whatsmydns.net/

## Step 5: Verify SSL Certificate

GitHub Pages will automatically provision an SSL certificate once DNS is configured correctly. This usually takes a few minutes to a few hours.

## Troubleshooting

### Domain not working?
1. Verify DNS records are correct using: `dig yourdomain.com` or online DNS checker
2. Make sure CNAME file matches your domain exactly
3. Wait for DNS propagation (can take up to 48 hours)
4. Check GitHub Pages settings show your custom domain

### SSL Certificate issues?
- Make sure "Enforce HTTPS" is enabled in GitHub Pages settings
- Wait a few hours for certificate provisioning
- Verify DNS is pointing to GitHub Pages correctly

