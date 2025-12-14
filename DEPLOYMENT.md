# Automatic Deployment Guide

This guide explains how to set up automatic deployment so your website updates automatically when you push to GitHub.

## Option 1: GitHub Pages (Easiest - Free) ✅ SETUP COMPLETE

I've created a GitHub Actions workflow that will automatically deploy your site to GitHub Pages!

### Quick Setup (2 steps):

1. **Enable GitHub Pages in repository settings:**
   - Go to: https://github.com/MaksRechnio/professional-portfolio-mrechnio/settings/pages
   - Under "Source", select **GitHub Actions** (not "Deploy from a branch")
   - The workflow `.github/workflows/pages.yml` will handle everything automatically

2. **Push this commit:**
   ```bash
   git add .github/workflows/pages.yml
   git commit -m "Add GitHub Pages deployment workflow"
   git push origin main
   ```

### That's it! 

After pushing, your site will automatically deploy and be available at:
**`https://maksrechnio.github.io/professional-portfolio-mrechnio/`**

### How it works:
- Every time you push to `main`, GitHub Actions automatically builds and deploys your site
- You can see deployment status in the **Actions** tab
- The site updates within 1-2 minutes after each push

### Custom Domain (Optional):
If you want to use your own domain:
1. Add a `CNAME` file in the root with your domain name
2. Configure DNS records as per GitHub Pages instructions
3. Update domain in repository Settings → Pages

**Note:** GitHub Pages works perfectly for static sites like yours. Your site will auto-deploy on every push to main.

---

## Option 2: GitHub Actions + Server Deployment

For deploying to your own server (VPS, shared hosting, etc.):

### Step 1: Set up GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:
- `HOST`: Your server IP or domain (e.g., `example.com`)
- `USER`: SSH username (e.g., `root` or `deploy`)
- `SSH_KEY`: Your private SSH key (the entire key, including `-----BEGIN OPENSSH PRIVATE KEY-----`)
- `DEPLOY_PATH`: Server path where files should be deployed (e.g., `/var/www/html` or `/home/username/public_html`)

### Step 2: Configure the Workflow

Edit `.github/workflows/deploy.yml` and customize the deployment commands based on your server setup:

#### For VPS/Server with SSH:

```yaml
name: Deploy Portfolio

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup SSH
      uses: webfactory/ssh-agent@v0.7.0
      with:
        ssh-private-key: ${{ secrets.SSH_KEY }}
    
    - name: Deploy via SSH
      run: |
        ssh -o StrictHostKeyChecking=no ${{ secrets.USER }}@${{ secrets.HOST }} << 'EOF'
          cd ${{ secrets.DEPLOY_PATH }}
          git pull origin main
          # Add any build commands here if needed
        EOF
```

#### For Server with rsync:

```yaml
    - name: Deploy via rsync
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.SSH_KEY }}" > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        ssh-keyscan -H ${{ secrets.HOST }} >> ~/.ssh/known_hosts
        rsync -avz --delete \
          -e "ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" \
          ./ ${{ secrets.USER }}@${{ secrets.HOST }}:${{ secrets.DEPLOY_PATH }}/
```

---

## Option 3: Netlify (Recommended for Static Sites)

1. Go to [Netlify](https://www.netlify.com/) and sign up/login
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Build settings:
   - **Build command:** (leave empty for static sites)
   - **Publish directory:** `/` (root)
5. Click **Deploy site**

Netlify will automatically deploy on every push to main. You'll get a free SSL certificate and custom domain support.

---

## Option 4: Vercel (Great for Modern Web Apps)

1. Go to [Vercel](https://vercel.com/) and sign up/login
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
5. Click **Deploy**

Vercel automatically deploys on every push and provides preview deployments for pull requests.

---

## Option 5: Server-Side Git Hook (Simple but Less Secure)

If you have SSH access to your server, you can set up a git hook:

### On Your Server:

1. SSH into your server
2. Navigate to your website directory:
   ```bash
   cd /var/www/html  # or your deploy path
   ```

3. Initialize git (if not already):
   ```bash
   git init
   git remote add origin https://github.com/MaksRechnio/professional-portfolio-mrechnio.git
   git pull origin main
   ```

4. Create a post-receive hook:
   ```bash
   mkdir -p .git/hooks
   nano .git/hooks/post-receive
   ```

5. Add this content:
   ```bash
   #!/bin/bash
   cd /var/www/html  # Change to your deploy path
   git --git-dir=.git --work-tree=. checkout -f main
   git pull origin main
   ```

6. Make it executable:
   ```bash
   chmod +x .git/hooks/post-receive
   ```

7. Set up a bare repository and webhook (more complex, but better practice)

### On GitHub:

1. Go to repository → **Settings** → **Webhooks**
2. Add webhook:
   - **Payload URL:** `http://your-server.com/webhook` (you'll need a webhook endpoint)
   - **Content type:** `application/json`
   - **Events:** Just the `push` event

---

## Option 6: GitHub Actions + FTP (For Shared Hosting)

If you're using shared hosting with FTP only:

```yaml
name: Deploy via FTP

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy via FTP
      uses: SamKirkland/FTP-Deploy-Action@4.3.0
      with:
        server: ${{ secrets.FTP_SERVER }}
        username: ${{ secrets.FTP_USERNAME }}
        password: ${{ secrets.FTP_PASSWORD }}
        local-dir: ./
        server-dir: /public_html/
```

Add secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`

---

## Recommended Setup

For your portfolio, I recommend:

1. **GitHub Pages** - If you want the simplest free solution
2. **Netlify** - If you want more features (forms, serverless functions, better CDN)
3. **GitHub Actions + VPS** - If you have your own server and want full control

---

## Testing Your Deployment

After setting up, test it:

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Check your deployment logs:
   - GitHub Actions: Repository → **Actions** tab
   - Netlify/Vercel: Dashboard → **Deploys**

---

## Troubleshooting

### GitHub Actions not running?
- Check repository settings → Actions → Make sure Actions are enabled
- Verify secrets are set correctly
- Check Actions tab for error messages

### Files not updating?
- Clear browser cache
- Check file permissions on server
- Verify deployment path is correct
- Check server logs

### SSH connection issues?
- Verify SSH key is correct
- Check server firewall allows SSH
- Test SSH connection manually first

---

Need help? Check the deployment logs in your chosen platform's dashboard.

