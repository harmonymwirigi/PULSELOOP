# PulseLoop Vercel Deployment Guide

## Overview
This guide will help you deploy your PulseLoop application to Vercel with both frontend and backend components.

## Prerequisites
- Vercel account (Pro Trial or Pro plan recommended)
- Supabase project
- GitHub repository with your code

## Storage Options

### Option 1: Vercel Blob Storage (Recommended)
- **Pros**: Native Vercel integration, automatic scaling, CDN distribution
- **Cons**: Additional cost, requires Vercel Pro plan
- **Setup**: Add `BLOB_READ_WRITE_TOKEN` environment variable

### Option 2: Supabase Storage (Current Setup)
- **Pros**: Already configured, consistent with your database
- **Cons**: Separate service, potential latency
- **Setup**: No changes needed

## Step-by-Step Deployment

### 1. Prepare Your Repository

1. **Commit all changes** to your GitHub repository
2. **Ensure your code is in the main/master branch**

### 2. Deploy Backend to Vercel

1. **Go to Vercel Dashboard** → "Import Project"
2. **Connect your GitHub repository**
3. **Configure the backend project**:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements-vercel.txt`
   - **Output Directory**: Leave empty
   - **Install Command**: `pip install -r requirements-vercel.txt`

4. **Add Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   DB_CONNECTION_STRING=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   APP_DOMAIN=https://your-backend.vercel.app
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token (optional)
   ```

5. **Deploy the backend**

### 3. Deploy Frontend to Vercel

1. **Create a new project** in Vercel Dashboard
2. **Import the same repository**
3. **Configure the frontend project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.vercel.app
   ```

5. **Deploy the frontend**

### 4. Configure Storage (Choose One)

#### Option A: Vercel Blob Storage
1. **Enable Vercel Blob** in your Vercel dashboard
2. **Get your Blob token** from Vercel dashboard
3. **Add to environment variables**: `BLOB_READ_WRITE_TOKEN`

#### Option B: Keep Supabase Storage
1. **No additional setup needed**
2. **Your current configuration will work**

### 5. Update Domain Configuration

1. **Update `APP_DOMAIN`** in backend environment variables to your frontend URL
2. **Update `VITE_API_URL`** in frontend environment variables to your backend URL

### 6. Database Migration

1. **Run database migrations** on your Supabase database:
   ```bash
   # If you have access to your local environment
   cd backend
   flask db upgrade
   ```

2. **Or manually apply migrations** in Supabase dashboard

## File Structure After Deployment

```
your-repo/
├── backend/
│   ├── app_vercel.py          # Vercel-optimized backend
│   ├── requirements-vercel.txt # Vercel requirements
│   ├── vercel.json            # Backend Vercel config
│   └── models.py              # Your existing models
├── frontend/
│   ├── vercel.json            # Frontend Vercel config
│   ├── package.json           # Updated with vercel-build script
│   └── vite.config.ts         # Updated with proxy config
├── vercel.json                # Root Vercel config
└── .env.example               # Environment variables template
```

## Environment Variables Reference

### Backend Environment Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `DB_CONNECTION_STRING`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `SMTP_USERNAME`: Email username for notifications
- `SMTP_PASSWORD`: Email app password
- `APP_DOMAIN`: Your frontend domain
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token (optional)

### Frontend Environment Variables
- `VITE_API_URL`: Your backend API URL

## Testing Your Deployment

1. **Test backend health**: `https://your-backend.vercel.app/api/health`
2. **Test frontend**: `https://your-frontend.vercel.app`
3. **Test file uploads**: Try uploading an avatar or post image
4. **Test authentication**: Try signing up and logging in

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables are set correctly
   - Ensure all dependencies are in requirements-vercel.txt

2. **File Upload Issues**:
   - Verify storage configuration (Vercel Blob or Supabase)
   - Check file size limits

3. **Database Connection Issues**:
   - Verify DB_CONNECTION_STRING format
   - Check Supabase connection settings

4. **CORS Issues**:
   - Ensure frontend URL is in CORS allowed origins
   - Check API URL configuration

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Supabase Documentation](https://supabase.com/docs)

## Cost Considerations

### Vercel Pricing
- **Hobby Plan**: Free for personal projects
- **Pro Plan**: $20/month (recommended for production)
- **Blob Storage**: $0.15/GB stored, $0.40/GB transferred

### Supabase Pricing
- **Free Tier**: 500MB database, 1GB file storage
- **Pro Plan**: $25/month for more resources

## Next Steps

1. **Set up monitoring** with Vercel Analytics
2. **Configure custom domains** if needed
3. **Set up CI/CD** for automatic deployments
4. **Implement error tracking** (Sentry, etc.)
5. **Set up backup strategies** for your database

## Security Considerations

1. **Never commit** `.env` files to your repository
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** (automatic with Vercel)
4. **Regular security updates** for dependencies
5. **Monitor access logs** in Vercel dashboard
