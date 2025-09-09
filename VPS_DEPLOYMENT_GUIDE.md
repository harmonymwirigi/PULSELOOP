# PulseLoop VPS Deployment Guide - Hostinger

## Overview
This guide will help you deploy your PulseLoop application on your Hostinger VPS. This setup is cost-effective and gives you full control over your server.

## Prerequisites
- ✅ Hostinger VPS (KVM 1 plan) - You already have this!
- ✅ SSH access to your VPS: `ssh root@194.164.72.53`
- ✅ Supabase project (for database and storage)
- ✅ Domain name (optional but recommended)

## Cost Comparison
- **Vercel Pro**: $20/month + storage costs
- **Hostinger VPS**: ~$3-5/month + Supabase free tier
- **Savings**: ~$15-17/month! 💰

## Step-by-Step Deployment

### Step 1: Connect to Your VPS

```bash
# Connect to your VPS
ssh root@194.164.72.53
```

### Step 2: Initial Server Setup

1. **Upload the setup script to your VPS**:
   ```bash
   # On your local machine, upload the setup script
   scp vps-setup.sh root@194.164.72.53:/root/
   ```

2. **Run the setup script**:
   ```bash
   # On your VPS
   chmod +x vps-setup.sh
   ./vps-setup.sh
   ```

### Step 3: Upload Your Code

1. **Upload your project to the VPS**:
   ```bash
   # On your local machine
   scp -r . root@194.164.72.53:/var/www/pulseloop/
   ```

2. **Or clone from Git** (recommended):
   ```bash
   # On your VPS
   cd /var/www/pulseloop
   git clone https://github.com/yourusername/pulseloop.git .
   ```

### Step 4: Configure Environment Variables

1. **Create your environment file**:
   ```bash
   # On your VPS
   cd /var/www/pulseloop/backend
   cp .env.example .env
   nano .env
   ```

2. **Add your configuration**:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here
   SUPABASE_STORAGE_BUCKET=post_media
   SUPABASE_AVATARS_BUCKET=avatars
   SUPABASE_RESOURCES_BUCKET=resources
   SUPABASE_BLOGS_BUCKET=blogs

   # Database Configuration
   DB_CONNECTION_STRING=your_postgresql_connection_string_here

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Email Configuration
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_password_here
   APP_DOMAIN=https://your-domain.com

   # Flask Configuration
   FLASK_ENV=production
   FLASK_DEBUG=False
   ```

### Step 5: Set Up Your Domain (Optional)

1. **Point your domain to your VPS IP**:
   - Add an A record: `your-domain.com` → `194.164.72.53`
   - Add a CNAME record: `www.your-domain.com` → `your-domain.com`

2. **Update Nginx configuration**:
   ```bash
   # On your VPS
   nano /etc/nginx/sites-available/pulseloop
   # Replace 'your-domain.com' with your actual domain
   ```

### Step 6: Start Your Application

1. **Start the backend service**:
   ```bash
   systemctl start pulseloop-backend
   systemctl enable pulseloop-backend
   ```

2. **Restart Nginx**:
   ```bash
   systemctl restart nginx
   ```

3. **Check service status**:
   ```bash
   systemctl status pulseloop-backend
   systemctl status nginx
   ```

### Step 7: Set Up SSL Certificate (Recommended)

1. **Install SSL certificate**:
   ```bash
   certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

2. **Test automatic renewal**:
   ```bash
   certbot renew --dry-run
   ```

## File Structure on VPS

```
/var/www/pulseloop/
├── backend/
│   ├── app_vps.py              # VPS-optimized backend
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables
│   ├── uploads/                # Local file storage
│   │   ├── avatars/
│   │   ├── posts/
│   │   ├── resources/
│   │   └── blogs/
│   └── models.py               # Database models
├── frontend/
│   ├── dist/                   # Built frontend files
│   ├── package.json
│   └── vite.config.ts
├── venv/                       # Python virtual environment
├── vps-setup.sh               # Setup script
└── deploy.sh                  # Deployment script
```

## Deployment Commands

### Initial Deployment
```bash
# Run setup script
./vps-setup.sh

# Upload your code
scp -r . root@194.164.72.53:/var/www/pulseloop/

# Configure environment
cd /var/www/pulseloop/backend
cp .env.example .env
nano .env

# Start services
systemctl start pulseloop-backend
systemctl enable pulseloop-backend
systemctl restart nginx
```

### Update Deployment
```bash
# Upload deployment script
scp deploy.sh root@194.164.72.53:/var/www/pulseloop/

# Run deployment
ssh root@194.164.72.53
cd /var/www/pulseloop
chmod +x deploy.sh
./deploy.sh
```

## Monitoring and Maintenance

### Check Application Status
```bash
# Check backend service
systemctl status pulseloop-backend

# Check Nginx status
systemctl status nginx

# Check application logs
journalctl -u pulseloop-backend -f

# Check Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart Services
```bash
# Restart backend
systemctl restart pulseloop-backend

# Restart Nginx
systemctl restart nginx

# Restart both
systemctl restart pulseloop-backend nginx
```

### Update Application
```bash
# Pull latest changes
cd /var/www/pulseloop
git pull origin main

# Run deployment script
./deploy.sh
```

## Security Considerations

### Firewall Configuration
```bash
# Check firewall status
ufw status

# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
```

### File Permissions
```bash
# Set proper permissions
chown -R www-data:www-data /var/www/pulseloop
chmod -R 755 /var/www/pulseloop
chmod 600 /var/www/pulseloop/backend/.env
```

### Regular Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Python packages
cd /var/www/pulseloop
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt --upgrade
```

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   # Check logs
   journalctl -u pulseloop-backend -f
   
   # Check configuration
   nginx -t
   ```

2. **File upload issues**:
   ```bash
   # Check upload directory permissions
   ls -la /var/www/pulseloop/backend/uploads/
   
   # Check disk space
   df -h
   ```

3. **Database connection issues**:
   ```bash
   # Test database connection
   cd /var/www/pulseloop/backend
   source ../venv/bin/activate
   python -c "from app_vps import db; print('DB connected')"
   ```

4. **SSL certificate issues**:
   ```bash
   # Check certificate status
   certbot certificates
   
   # Renew certificate
   certbot renew
   ```

### Performance Optimization

1. **Enable Gzip compression**:
   ```bash
   # Add to Nginx config
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
   ```

2. **Set up log rotation**:
   ```bash
   # Configure logrotate
   nano /etc/logrotate.d/pulseloop
   ```

3. **Monitor resource usage**:
   ```bash
   # Check memory usage
   free -h
   
   # Check CPU usage
   top
   
   # Check disk usage
   df -h
   ```

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > /root/backup-db.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DB_CONNECTION_STRING > /root/backups/pulseloop_$DATE.sql
find /root/backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh
```

### File Backup
```bash
# Backup uploads
tar -czf /root/backups/uploads_$(date +%Y%m%d).tar.gz /var/www/pulseloop/backend/uploads/
```

## Cost Breakdown

### Monthly Costs
- **Hostinger VPS (KVM 1)**: ~$3-5/month
- **Supabase (Free tier)**: $0/month
- **Domain**: ~$10-15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$3-5/month vs $20+/month on Vercel

### Resource Usage
- **CPU**: 1 vCPU (sufficient for moderate traffic)
- **RAM**: 1GB (can be upgraded if needed)
- **Storage**: 20GB SSD (plenty for your app)
- **Bandwidth**: 1TB/month (generous for most use cases)

## Next Steps

1. **Set up monitoring** with tools like UptimeRobot
2. **Configure automated backups**
3. **Set up CI/CD** for automatic deployments
4. **Monitor performance** and scale as needed
5. **Set up error tracking** (Sentry, etc.)

## Support

- **Hostinger Support**: Available 24/7
- **Documentation**: [Hostinger VPS Guide](https://support.hostinger.com/en/articles/1583299-how-to-connect-to-vps-via-ssh)
- **Community**: Hostinger Community Forum

Your VPS deployment will be much more cost-effective than Vercel while giving you full control over your server! 🚀
