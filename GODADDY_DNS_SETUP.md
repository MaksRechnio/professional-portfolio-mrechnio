# GoDaddy DNS Setup for experience-developer.com

## Step 1: CNAME File ✅
The CNAME file has been created with `experience-developer.com`

## Step 2: Configure DNS in GoDaddy

### Option A: Use Root Domain (experience-developer.com) - RECOMMENDED

1. **Log into GoDaddy**
   - Go to https://dcc.godaddy.com/
   - Sign in to your account

2. **Access DNS Management**
   - Click on "My Products"
   - Find `experience-developer.com` and click "DNS" (or "Manage DNS")

3. **Add A Records**
   - Delete any existing A records for `@` (root domain)
   - Add these 4 A records:
   
     **Record 1:**
     - Type: `A`
     - Name: `@` (or leave blank)
     - Value: `185.199.108.153`
     - TTL: `600` (or default)
   
     **Record 2:**
     - Type: `A`
     - Name: `@` (or leave blank)
     - Value: `185.199.109.153`
     - TTL: `600` (or default)
   
     **Record 3:**
     - Type: `A`
     - Name: `@` (or leave blank)
     - Value: `185.199.110.153`
     - TTL: `600` (or default)
   
     **Record 4:**
     - Type: `A`
     - Name: `@` (or leave blank)
     - Value: `185.199.111.153`
     - TTL: `600` (or default)

4. **Add CNAME for www (Optional but Recommended)**
   - Type: `CNAME`
   - Name: `www`
   - Value: `maksrechnio.github.io`
   - TTL: `600` (or default)

### Option B: Use www Subdomain (www.experience-developer.com)

If you prefer to use www:

1. **Add CNAME Record:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `maksrechnio.github.io`
   - TTL: `600` (or default)

2. **Update CNAME file** (I'll need to change it to `www.experience-developer.com`)

## Step 3: Configure GitHub Pages

1. **Go to Repository Settings**
   - Visit: https://github.com/MaksRechnio/professional-portfolio-mrechnio/settings/pages

2. **Add Custom Domain**
   - Under "Custom domain", enter: `experience-developer.com`
   - Check ✅ "Enforce HTTPS" (important for security)
   - Click "Save"

3. **Wait for DNS Check**
   - GitHub will verify your DNS settings
   - This may take a few minutes

## Step 4: Verify DNS Propagation

After adding DNS records, verify they're working:

1. **Check DNS Propagation**
   - Visit: https://www.whatsmydns.net/#A/experience-developer.com
   - Wait until you see the GitHub IPs (185.199.108.x) appearing globally
   - This can take 5 minutes to 48 hours (usually 1-2 hours)

2. **Test Domain**
   - Once DNS propagates, visit: `https://experience-developer.com`
   - You should see your portfolio!

## Step 5: SSL Certificate

- GitHub Pages will automatically provision an SSL certificate
- This happens automatically after DNS is configured correctly
- Usually takes 15 minutes to a few hours
- You'll see a green checkmark in GitHub Pages settings when ready

## Troubleshooting

### Domain not working after 24 hours?
1. Double-check DNS records in GoDaddy match exactly
2. Verify CNAME file is committed to repository
3. Check GitHub Pages settings show the custom domain
4. Try clearing browser cache

### GoDaddy DNS not saving?
- Make sure you're in the correct account
- Some GoDaddy plans require DNS to be managed through their interface
- Contact GoDaddy support if records won't save

### SSL Certificate not provisioning?
- Wait 24 hours after DNS is configured
- Make sure "Enforce HTTPS" is checked in GitHub
- Verify DNS is pointing to GitHub correctly

## Quick Reference

**Your GitHub Pages URL:** `https://maksrechnio.github.io/professional-portfolio-mrechnio/`  
**Your Custom Domain:** `https://experience-developer.com`  
**DNS Provider:** GoDaddy  
**Repository:** MaksRechnio/professional-portfolio-mrechnio

