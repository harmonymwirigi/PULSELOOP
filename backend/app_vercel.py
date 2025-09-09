import os
import uuid
import secrets
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import wraps
import openai
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit, join_room, leave_room
from supabase import create_client, Client
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc
import boto3
from botocore.exceptions import ClientError

# Import models
from models import db, User, Post, Comment, Reaction, Resource, Blog, Invitation, CommentReaction, DiscussionAnalytics, Notification

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration & Initialization
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "post_media")
SUPABASE_AVATARS_BUCKET = os.getenv("SUPABASE_AVATARS_BUCKET", "avatars")
SUPABASE_RESOURCES_BUCKET = os.getenv("SUPABASE_RESOURCES_BUCKET", "resources")
SUPABASE_BLOGS_BUCKET = os.getenv("SUPABASE_BLOGS_BUCKET", "blogs")
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Vercel Blob Storage Configuration
VERCEL_BLOB_READ_WRITE_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN")

if not OPENAI_API_KEY:
    app.logger.warning("OPENAI_API_KEY not set. AI chat endpoint will not work.")
else:
    openai.api_key = OPENAI_API_KEY

SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
APP_DOMAIN = os.getenv("APP_DOMAIN", "https://your-app.vercel.app")

if not all([SUPABASE_URL, SUPABASE_KEY, DB_CONNECTION_STRING]):
    raise RuntimeError("Supabase credentials or DB connection string are not set.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

app.config['SQLALCHEMY_DATABASE_URI'] = DB_CONNECTION_STRING
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

# Test Supabase client connection
try:
    buckets = supabase.storage.list_buckets()
    app.logger.info(f"Supabase client initialized successfully. Available buckets: {[b.name for b in buckets]}")
except Exception as e:
    app.logger.error(f"Error initializing Supabase client: {e}")

# Vercel Blob Storage Helper Functions
def upload_to_vercel_blob(file, folder_name):
    """Upload file to Vercel Blob Storage"""
    if not VERCEL_BLOB_READ_WRITE_TOKEN:
        app.logger.error("VERCEL_BLOB_READ_WRITE_TOKEN not configured")
        return None, None
    
    try:
        import requests
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        blob_path = f"{folder_name}/{unique_filename}"
        
        # Upload to Vercel Blob
        url = "https://api.vercel.com/v1/blob"
        headers = {
            "Authorization": f"Bearer {VERCEL_BLOB_READ_WRITE_TOKEN}",
        }
        
        files = {
            "file": (filename, file.stream, file.content_type)
        }
        
        data = {
            "pathname": blob_path
        }
        
        response = requests.post(url, headers=headers, files=files, data=data)
        
        if response.status_code == 200:
            blob_data = response.json()
            return blob_data.get("url"), unique_filename
        else:
            app.logger.error(f"Failed to upload to Vercel Blob: {response.text}")
            return None, None
            
    except Exception as e:
        app.logger.error(f"Error uploading to Vercel Blob: {e}")
        return None, None

def delete_from_vercel_blob(blob_url):
    """Delete file from Vercel Blob Storage"""
    if not VERCEL_BLOB_READ_WRITE_TOKEN:
        return False
    
    try:
        import requests
        
        url = "https://api.vercel.com/v1/blob"
        headers = {
            "Authorization": f"Bearer {VERCEL_BLOB_READ_WRITE_TOKEN}",
        }
        
        # Extract blob path from URL
        blob_path = blob_url.split("/")[-1]
        
        response = requests.delete(f"{url}/{blob_path}", headers=headers)
        return response.status_code == 200
        
    except Exception as e:
        app.logger.error(f"Error deleting from Vercel Blob: {e}")
        return False

# Fallback to Supabase Storage if Vercel Blob is not available
def upload_to_storage(media_file, folder_name):
    """Upload file to storage (Vercel Blob preferred, Supabase fallback)"""
    if VERCEL_BLOB_READ_WRITE_TOKEN:
        return upload_to_vercel_blob(media_file, folder_name)
    else:
        # Fallback to Supabase storage
        return upload_to_supabase_storage(media_file, folder_name)

def upload_to_supabase_storage(file, folder_name):
    """Upload file to Supabase Storage (fallback)"""
    try:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            
            # Upload to Supabase
            result = supabase.storage.from_(folder_name).upload(
                unique_filename, 
                file.read(), 
                file_options={"content-type": file.content_type}
            )
            
            if result:
                # Get public URL
                public_url = supabase.storage.from_(folder_name).get_public_url(unique_filename)
                return public_url, unique_filename
    except Exception as e:
        app.logger.error(f"Error uploading to Supabase: {e}")
    
    return None, None

def cleanup_storage_file(blob_url_or_filename, folder_name):
    """Clean up file from storage"""
    if VERCEL_BLOB_READ_WRITE_TOKEN and blob_url_or_filename.startswith("https://"):
        # Vercel Blob URL
        delete_from_vercel_blob(blob_url_or_filename)
    else:
        # Supabase filename
        try:
            supabase.storage.from_(folder_name).remove([blob_url_or_filename])
        except Exception as e:
            app.logger.error(f"Error removing file from Supabase: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'avi'}

# Import all the existing route handlers from app.py
# (This would include all your existing endpoints - signup, login, posts, etc.)
# For brevity, I'm including just the essential ones here

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "PulseLoopCare API is running on Vercel",
        "storage": "Vercel Blob" if VERCEL_BLOB_READ_WRITE_TOKEN else "Supabase"
    }), 200

# Add all your existing routes here...
# (Copy all the routes from your original app.py file)

if __name__ == '__main__':
    print("🚀 Starting PulseLoopCare on Vercel...")
    print(f"🗄️ Database: Supabase")
    print(f"📁 Storage: {'Vercel Blob' if VERCEL_BLOB_READ_WRITE_TOKEN else 'Supabase'}")
    print("🌐 Server: Running on Vercel")
    print("=" * 60)
    
    socketio.run(app, debug=False)
