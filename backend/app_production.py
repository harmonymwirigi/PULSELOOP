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
from flask import Flask, request, jsonify
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

# Flask configuration
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SQLALCHEMY_DATABASE_URI'] = DB_CONNECTION_STRING
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Import all the route handlers from the original app.py
# (You would copy all the route definitions here, but for brevity, I'm showing the structure)

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)
