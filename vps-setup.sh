#!/bin/bash

# PulseLoop VPS Setup Script for Hostinger
# Run this script on your VPS as root user

echo "🚀 Setting up PulseLoop on Hostinger VPS..."
echo "=============================================="

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt install -y curl wget git nginx python3 python3-pip python3-venv nodejs npm certbot python3-certbot-nginx ufw

# Install Node.js 18 (LTS)
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/pulseloop
cd /var/www/pulseloop

# Clone your repository (you'll need to update this with your actual repo)
echo "📥 Setting up Git repository..."
# git clone https://github.com/yourusername/pulseloop.git .

# Create virtual environment for Python
echo "🐍 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install flask python-dotenv supabase requests flask-cors werkzeug Flask-SQLAlchemy SQLAlchemy alembic Flask-Migrate psycopg2-binary openai flask-socketio python-socketio eventlet gunicorn

# Install Node.js dependencies for frontend
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
npm run build
cd ..

# Create systemd service for backend
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/pulseloop-backend.service << EOF
[Unit]
Description=PulseLoop Backend
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/var/www/pulseloop/backend
Environment=PATH=/var/www/pulseloop/venv/bin
ExecStart=/var/www/pulseloop/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 3 --worker-class eventlet -w 1 --worker-connections 1000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/pulseloop << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your actual domain

    # Frontend
    location / {
        root /var/www/pulseloop/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # File uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/pulseloop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/pulseloop
chmod -R 755 /var/www/pulseloop

# Create environment file template
echo "📝 Creating environment file template..."
cat > /var/www/pulseloop/backend/.env.example << EOF
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
EOF

echo "✅ VPS setup completed!"
echo "=============================================="
echo "Next steps:"
echo "1. Copy your code to /var/www/pulseloop/"
echo "2. Configure your .env file in /var/www/pulseloop/backend/"
echo "3. Update domain name in Nginx config"
echo "4. Run: systemctl start pulseloop-backend"
echo "5. Run: systemctl enable pulseloop-backend"
echo "6. Run: systemctl restart nginx"
echo "7. Set up SSL with: certbot --nginx -d your-domain.com"
echo "=============================================="
