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
APP_DOMAIN = os.getenv("APP_DOMAIN", "https://your-domain.com")

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

# VPS File Storage Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'avi'}

# Create upload directories
os.makedirs(os.path.join(UPLOAD_FOLDER, 'avatars'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'posts'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'resources'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'blogs'), exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file_locally(file, folder):
    """Save uploaded file to local storage on VPS"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add UUID to prevent filename conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, folder, unique_filename)
        file.save(file_path)
        return f"/uploads/{folder}/{unique_filename}"
    return None

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# Helper function for file uploads (using local storage on VPS)
def upload_to_storage(media_file, folder_name):
    """Upload file to local storage on VPS"""
    return save_file_locally(media_file, folder_name)

def cleanup_storage_file(unique_filename, folder_name):
    """Helper to remove a file from local storage."""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, folder_name, unique_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            app.logger.info(f"Successfully removed file '{unique_filename}' from local storage")
    except Exception as e:
        app.logger.error(f"Error removing file '{unique_filename}' from local storage: {e}")

# Import all your existing route handlers from app.py
# For brevity, I'm including the essential structure here
# You should copy all your existing routes from app.py

# Decorators
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header: return jsonify({"error": "Authentication required"}), 401
            try:
                token = auth_header.split(" ")[1]
                user_info = supabase.auth.get_user(token)
                if not user_info or not user_info.user: return jsonify({"error": "Invalid or expired token"}), 401
                user = User.query.get(user_info.user.id)
                if not user: return jsonify({"error": "User profile not found"}), 404
                if user.role not in roles: return jsonify({"error": f"Access denied. Required roles: {', '.join(roles)}"}), 403
                request.user_id = user.id
            except Exception as e:
                app.logger.error(f"Authentication/Authorization error: {e}")
                return jsonify({"error": "Authentication failed"}), 401
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def authenticated_only(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header: return jsonify({"error": "Authentication required"}), 401
        try:
            token = auth_header.split(" ")[1]
            user_info = supabase.auth.get_user(token)
            if not user_info or not user_info.user: return jsonify({"error": "Invalid or expired token"}), 401
            request.user_id = user_info.user.id
        except Exception as e:
            app.logger.error(f"Authentication error: {e}")
            return jsonify({"error": "Authentication failed"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "PulseLoopCare API is running on VPS",
        "storage": "Local VPS Storage",
        "upload_folder": UPLOAD_FOLDER
    }), 200

# Add all your existing API routes here...
# Copy all the routes from your original app.py file

if __name__ == '__main__':
    print("🚀 Starting PulseLoopCare on VPS...")
    print(f"📁 Local file storage: {UPLOAD_FOLDER}")
    print("🗄️ Database: Supabase")
    print("🌐 Server: Running on VPS")
    print("=" * 60)
    
    socketio.run(app, debug=False, host='0.0.0.0', port=5000)
