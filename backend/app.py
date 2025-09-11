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

# --- UPDATED: Import new models ---
from models import db, User, Post, Comment, Reaction, Resource, Blog, Invitation, CommentReaction, DiscussionAnalytics, Notification, BroadcastMessage

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*") 

# --- Configuration & Initialization (no changes here) ---
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
APP_DOMAIN = os.getenv("APP_DOMAIN", "http://localhost:5173")

# VPS PostgreSQL Configuration - No Supabase needed
if not DB_CONNECTION_STRING:
    raise RuntimeError("DB_CONNECTION_STRING is not set.")
# Remove Supabase dependencies for VPS deployment
# supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
app.config['SQLALCHEMY_DATABASE_URI'] = DB_CONNECTION_STRING
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

# Test Supabase client connection
try:
    # Test if we can access storage
    buckets = supabase.storage.list_buckets()
    app.logger.info(f"Supabase client initialized successfully. Available buckets: {[b.name for b in buckets]}")
except Exception as e:
    app.logger.error(f"Error initializing Supabase client: {e}")

# Local file storage configuration
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
    """Save uploaded file to local storage"""
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

# --- Decorators (no changes here) ---
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

# --- Helper function for file uploads (now using local storage) ---
def upload_to_storage(media_file, folder_name):
    """Upload file to local storage instead of Supabase"""
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

def generate_secure_token():
    """Generate a cryptographically secure, unique token for invitations."""
    return secrets.token_urlsafe(32)

def send_invitation_email(invitee_email, inviter_name, token):
    """
    Send invitation email to the invitee.
    
    Args:
        invitee_email: Email address of the person being invited
        inviter_name: Name of the person sending the invitation
        token: Unique invitation token
    """
    if not all([SMTP_USERNAME, SMTP_PASSWORD]):
        app.logger.warning("SMTP credentials not configured. Email sending is disabled.")
        return False
    
    try:
        # Create the signup URL
        signup_url = f"{APP_DOMAIN}/?token={token}"
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = invitee_email
        msg['Subject'] = f"You're invited to join PulseLoop by {inviter_name}"
        
        # Email body
        body = f"""
        <html>
        <body>
            <h2>You're invited to join PulseLoop!</h2>
            <p>Hello,</p>
            <p><strong>{inviter_name}</strong> has invited you to join PulseLoop, a professional networking platform for healthcare professionals.</p>
            <p>Click the link below to create your account and get started:</p>
            <p><a href="{signup_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join PulseLoop</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{signup_url}</p>
            <p>This invitation link is unique to you and will expire after use.</p>
            <p>Best regards,<br>The PulseLoop Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USERNAME, invitee_email, text)
        server.quit()
        
        app.logger.info(f"Invitation email sent successfully to {invitee_email}")
        return True
        
    except Exception as e:
        app.logger.error(f"Failed to send invitation email to {invitee_email}: {e}")
        return False

def generate_display_name(user, display_name_preference):
    """
    Generate display name based on user preference and user data.
    
    Args:
        user: User object with name, title, department, state fields
        display_name_preference: String - 'FullName', 'Initials', or 'Anonymous'
    
    Returns:
        String: Generated display name
    """
    if display_name_preference == 'Anonymous':
        return 'Anonymous'
    
    # Get user data with fallbacks for missing fields
    full_name = user.name or ''
    title = user.title or ''
    department = user.department or ''
    state = user.state or ''
    
    if display_name_preference == 'FullName':
        # Format: "First name, last initial, title/department, and state"
        # Example: "Jane S., RN, CA" or "Jane S., ICU, CA"
        name_parts = full_name.strip().split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_initial = name_parts[-1][0] + '.' if name_parts[-1] else ''
            name_part = f"{first_name} {last_initial}"
        else:
            name_part = full_name
        
        # Build the display name with title/department and state
        parts = [name_part]
        # Prefer department over title if available
        professional_info = department if department else title
        if professional_info:
            parts.append(professional_info)
        if state:
            parts.append(state)
        
        return ', '.join(parts)
    
    elif display_name_preference == 'Initials':
        # Format: "Initials, title/department, and state"
        # Example: "J.S., RN, CA" or "J.S., ICU, CA"
        name_parts = full_name.strip().split()
        initials = '.'.join([part[0] for part in name_parts if part]) + '.' if name_parts else ''
        
        # Build the display name with title/department and state
        parts = [initials]
        # Prefer department over title if available
        professional_info = department if department else title
        if professional_info:
            parts.append(professional_info)
        if state:
            parts.append(state)
        
        return ', '.join(parts)
    
    # Fallback to full name if preference is not recognized
    return full_name


# --- Existing API Endpoints (no changes here) ---
@app.route('/api/signup', methods=['POST'])
def signup():
    # ... (existing code)
    data = request.json
    email, password, name = data.get('email'), data.get('password'), data.get('name')
    invitation_token = data.get('invitationToken')
    
    if not all([email, password, name]): 
        return jsonify({"error": "Email, password, and name are required"}), 400
    
    # Validate invitation token if provided
    inviter_user_id = None
    if invitation_token:
        try:
            invitation = Invitation.query.filter_by(token=invitation_token).first()
            if not invitation:
                return jsonify({"error": "Invalid invitation token"}), 400
            if invitation.status != 'PENDING':
                return jsonify({"error": "This invitation has already been used"}), 400
            if invitation.invitee_email.lower() != email.lower():
                return jsonify({"error": "Email does not match the invitation"}), 400
            inviter_user_id = invitation.inviter_user_id
        except Exception as e:
            app.logger.error(f"Error validating invitation token: {e}")
            return jsonify({"error": "Failed to validate invitation"}), 500
    
    try:
        user_response = supabase.auth.sign_up({"email": email, "password": password})
        if user_response.user is None: 
            return jsonify({"error": "User already exists or invalid credentials provided."}), 400
        
        # Create user profile with invitation data if applicable
        new_user_profile = User(
            id=user_response.user.id, 
            name=name, 
            email=email, 
            role='PENDING',
            invited_by_user_id=inviter_user_id
        )
        db.session.add(new_user_profile)
        
        # Update invitation status if token was provided
        if invitation_token and inviter_user_id:
            invitation.status = 'ACCEPTED'
            invitation.accepted_at = db.func.now()
        
        db.session.commit()
        
        return jsonify({ 
            "message": "User signed up successfully. Awaiting admin approval.", 
            "user": new_user_profile.to_dict() 
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Signup error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    # ... (existing code)
    data = request.json
    email, password = data.get('email'), data.get('password')
    if not email or not password: return jsonify({"error": "Email and password are required"}), 400
    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if response.user is None: return jsonify({"error": "Invalid credentials or user not found"}), 401
        user_profile = User.query.get(response.user.id)
        if not user_profile: return jsonify({"error": "User profile not found"}), 404
        return jsonify({ "accessToken": response.session.access_token, "user": user_profile.to_dict() }), 200
    except Exception as e:
        app.logger.error(f"Login error: {e}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/users/<uuid:user_id>', methods=['GET'])
def get_user_profile(user_id):
    # ... (existing code)
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200

@app.route('/api/profile/avatar', methods=['POST'])
@authenticated_only
def upload_avatar():
    if 'avatarFile' not in request.files or not request.files['avatarFile'].filename:
        return jsonify({"error": "Avatar file is required"}), 400
    
    avatar_file = request.files['avatarFile']
    user_id = request.user_id
    
    avatar_url, unique_filename = upload_to_storage(avatar_file, SUPABASE_AVATARS_BUCKET)
    if not avatar_url:
        return jsonify({"error": "Failed to upload avatar file"}), 500
    
    try:
        user = User.query.get(user_id)
        if not user:
            cleanup_storage_file(unique_filename, SUPABASE_AVATARS_BUCKET)
            return jsonify({"error": "User not found"}), 404
        
        user.avatar_url = avatar_url
        db.session.commit()
        
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        cleanup_storage_file(unique_filename, SUPABASE_AVATARS_BUCKET)
        app.logger.error(f"Error updating avatar in DB: {e}")
        return jsonify({"error": "Failed to update user profile"}), 500

@app.route('/api/profile', methods=['PUT'])
@authenticated_only
def update_profile():
    """
    Update user profile information.
    Accepts JSON data with any of the profile fields to update.
    """
    user_id = request.user_id
    data = request.json
    
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update fields if they are provided in the request
        if 'title' in data:
            user.title = data['title'].strip() if data['title'] else None
        
        if 'department' in data:
            user.department = data['department'].strip() if data['department'] else None
        
        if 'state' in data:
            user.state = data['state'].strip() if data['state'] else None
        
        if 'bio' in data:
            user.bio = data['bio'].strip() if data['bio'] else None
        
        db.session.commit()
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@app.route('/api/invitations', methods=['POST'])
@authenticated_only
def create_invitation():
    """
    Create and send an invitation to a colleague.
    """
    user_id = request.user_id
    data = request.json
    
    if not data or not data.get('email'):
        return jsonify({"error": "Email is required"}), 400
    
    invitee_email = data['email'].strip().lower()
    
    # Basic email validation
    if '@' not in invitee_email or '.' not in invitee_email:
        return jsonify({"error": "Invalid email format"}), 400
    
    try:
        # Get the inviter user
        inviter = User.query.get(user_id)
        if not inviter:
            return jsonify({"error": "User not found"}), 404
        
        # Check if email is already registered
        existing_user = User.query.filter_by(email=invitee_email).first()
        if existing_user:
            return jsonify({"error": "This email is already registered"}), 400
        
        # Check if a pending invitation already exists for this email
        existing_invitation = Invitation.query.filter_by(
            invitee_email=invitee_email, 
            status='PENDING'
        ).first()
        if existing_invitation:
            return jsonify({"error": "A pending invitation already exists for this email"}), 400
        
        # Generate secure token
        token = generate_secure_token()
        
        # Create invitation record
        new_invitation = Invitation(
            inviter_user_id=user_id,
            invitee_email=invitee_email,
            token=token,
            status='PENDING'
        )
        
        db.session.add(new_invitation)
        db.session.commit()
        
        # Send invitation email
        email_sent = send_invitation_email(invitee_email, inviter.name, token)
        
        if not email_sent:
            app.logger.warning(f"Failed to send email to {invitee_email}, but invitation was created")
        
        return jsonify({"message": "Invitation sent successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating invitation: {e}")
        return jsonify({"error": "Failed to create invitation"}), 500

@app.route('/api/invitations/<token>', methods=['GET'])
def validate_invitation_token(token):
    """
    Validate an invitation token and return the associated email.
    """
    try:
        # Find the invitation by token
        invitation = Invitation.query.filter_by(token=token).first()
        
        if not invitation:
            return jsonify({"error": "This invitation is invalid or has expired"}), 404
        
        # Check if invitation is still pending
        if invitation.status != 'PENDING':
            return jsonify({"error": "This invitation has already been used"}), 400
        
        # Return the email associated with the token
        return jsonify({"email": invitation.invitee_email}), 200
        
    except Exception as e:
        app.logger.error(f"Error validating invitation token: {e}")
        return jsonify({"error": "Failed to validate invitation"}), 500

@app.route('/api/invitations/sent', methods=['GET'])
@authenticated_only
def get_sent_invitations():
    """
    Get all invitations sent by the authenticated user.
    """
    user_id = request.user_id
    
    try:
        # Query invitations sent by the authenticated user, ordered by created_at desc
        invitations = Invitation.query.filter_by(
            inviter_user_id=user_id
        ).order_by(Invitation.created_at.desc()).all()
        
        # Format the response
        invitation_list = []
        for invitation in invitations:
            invitation_list.append({
                "id": str(invitation.id),
                "invitee_email": invitation.invitee_email,
                "status": invitation.status,
                "created_at": invitation.created_at.isoformat()
            })
        
        return jsonify(invitation_list), 200
        
    except Exception as e:
        app.logger.error(f"Error getting sent invitations: {e}")
        return jsonify({"error": "Failed to get sent invitations"}), 500

@app.route('/api/invitations/stats', methods=['GET'])
@authenticated_only
def get_invitation_stats():
    """
    Get invitation statistics for the authenticated user.
    """
    user_id = request.user_id
    
    try:
        # Count pending invitations
        pending_count = Invitation.query.filter_by(
            inviter_user_id=user_id, 
            status='PENDING'
        ).count()
        
        # Count accepted invitations
        accepted_count = Invitation.query.filter_by(
            inviter_user_id=user_id, 
            status='ACCEPTED'
        ).count()
        
        return jsonify({
            "pendingInvitations": pending_count,
            "acceptedInvitations": accepted_count,
            "totalInvitations": pending_count + accepted_count
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error getting invitation stats: {e}")
        return jsonify({"error": "Failed to get invitation statistics"}), 500

@app.route('/api/posts', methods=['GET'])
def get_posts():
    # Get query parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    tag = request.args.get('tag', type=str)
    
    # Validate pagination parameters
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:  # Cap at 100 posts per page
        limit = 10
    
    try:
        # OPTIMIZED: Only load author for feed performance
        query = Post.query.options(
            db.joinedload(Post.author)  # Only load author, not comments/reactions
        )
        
        # Apply tag filter if provided
        if tag:
            query = query.filter(Post.tags.contains([tag]))
        
        # Get total count for pagination info
        total = query.count()
        
        # Apply pagination and ordering
        posts = query.order_by(Post.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        # Return paginated response - USE FAST FEED METHOD
        return jsonify({
            "posts": [post.to_dict_feed() for post in posts],
            "total": total
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching posts: {e}")
        return jsonify({"error": "Failed to fetch posts"}), 500

@app.route('/api/trending-topics', methods=['GET'])
def get_trending_topics():
    """
    Get trending topics based on recent post activity, comments, and reactions.
    """
    try:
        # Get query parameters
        limit = request.args.get('limit', 10, type=int)
        time_period = request.args.get('period', '24h', type=str)  # 24h, 7d, 30d
        
        # Validate parameters
        if limit < 1 or limit > 50:
            limit = 10
        
        # Calculate time threshold based on period
        from datetime import datetime, timedelta
        if time_period == '24h':
            time_threshold = datetime.utcnow() - timedelta(hours=24)
        elif time_period == '7d':
            time_threshold = datetime.utcnow() - timedelta(days=7)
        elif time_period == '30d':
            time_threshold = datetime.utcnow() - timedelta(days=30)
        else:
            time_threshold = datetime.utcnow() - timedelta(hours=24)
        
        # Get all posts within the time period with their tags
        recent_posts = Post.query.filter(Post.created_at >= time_threshold).all()
        
        # Calculate trending score for each tag
        tag_scores = {}
        
        for post in recent_posts:
            if post.tags:
                for tag in post.tags:
                    if tag not in tag_scores:
                        tag_scores[tag] = {
                            'tag': tag,
                            'post_count': 0,
                            'comment_count': 0,
                            'reaction_count': 0,
                            'score': 0
                        }
                    
                    # Base score for post creation
                    tag_scores[tag]['post_count'] += 1
                    tag_scores[tag]['score'] += 1
                    
                    # Add comment count (weighted)
                    tag_scores[tag]['comment_count'] += len(post.comments)
                    tag_scores[tag]['score'] += len(post.comments) * 0.5
                    
                    # Add reaction count (weighted)
                    tag_scores[tag]['reaction_count'] += len(post.reactions)
                    tag_scores[tag]['score'] += len(post.reactions) * 0.3
        
        # Sort by score and return top trending topics
        trending_topics = sorted(tag_scores.values(), key=lambda x: x['score'], reverse=True)[:limit]
        
        return jsonify({
            "trending_topics": trending_topics,
            "period": time_period,
            "total_topics": len(tag_scores)
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error fetching trending topics: {e}")
        return jsonify({"error": "Failed to fetch trending topics"}), 500

@app.route('/api/posts/<uuid:post_id>', methods=['GET'])
@authenticated_only
def get_post_by_id(post_id):
    # OPTIMIZED: Load all data for single post view
    post = Post.query.options(
        db.joinedload(Post.author),
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.reactions)
    ).get(post_id)
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(post.to_dict_detailed()), 200

@app.route('/api/posts/<uuid:post_id>', methods=['PUT'])
@role_required(['NURSE', 'ADMIN'])
def update_post_text(post_id):
    post = Post.query.get(post_id)
    if not post: return jsonify({"error": "Post not found"}), 404

    # Authorization check: only the author can edit
    if post.author_id != request.user_id:
        return jsonify({"error": "Forbidden: You can only edit your own posts"}), 403
    
    data = request.json
    text = data.get('text')
    tags = data.get('tags', [])
    
    if not text or not text.strip(): return jsonify({"error": "Text is required"}), 400
    
    # Validate tags is a list
    if not isinstance(tags, list):
        return jsonify({"error": "Tags must be an array"}), 400
    
    post.text = text.strip()
    post.tags = tags
    db.session.commit()
    return jsonify(post.to_dict()), 200

@app.route('/api/users/<uuid:user_id>/posts', methods=['GET'])
@authenticated_only
def get_user_posts(user_id):
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    
    # OPTIMIZED: Use fast feed method for user posts
    posts = Post.query.options(
        db.joinedload(Post.author)
    ).filter_by(author_id=user_id).order_by(Post.created_at.desc()).all()
    
    return jsonify([post.to_dict_feed() for post in posts]), 200
 
   
@app.route('/api/posts', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def create_post():
    # ... (existing code)
    author_id = request.user_id
    text = request.form.get('text')
    display_name_preference = request.form.get('displayNamePreference')
    tags_json = request.form.get('tags')
    
    if not text: return jsonify({"error": "Post text is required"}), 400
    if not display_name_preference: return jsonify({"error": "Display name preference is required"}), 400
    
    # Validate display name preference
    valid_preferences = ['FullName', 'Initials', 'Anonymous']
    if display_name_preference not in valid_preferences:
        return jsonify({"error": f"Invalid display name preference. Must be one of: {', '.join(valid_preferences)}"}), 400
    
    # Get the user to generate display name
    user = User.query.get(author_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Generate display name based on preference
    display_name = generate_display_name(user, display_name_preference)
    
    # Parse tags from JSON string
    tags = []
    if tags_json:
        try:
            tags = json.loads(tags_json)
            if not isinstance(tags, list):
                tags = []
        except (json.JSONDecodeError, TypeError):
            tags = []
    
    media_url, media_type, unique_filename = None, None, None
    if 'mediaFile' in request.files and request.files['mediaFile'].filename:
        media_file = request.files['mediaFile']
        media_url = upload_to_storage(media_file, 'posts')
        if not media_url: return jsonify({"error": "Failed to upload media file"}), 500
        media_type = 'image' if media_file.content_type.startswith('image') else 'video'
    try:
        new_post = Post(
            author_id=author_id, 
            text=text, 
            media_url=media_url, 
            media_type=media_type,
            display_name=display_name,
            tags=tags
        )
        db.session.add(new_post)
        db.session.commit()
        return jsonify(new_post.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        if media_url: 
            # Extract filename from URL for cleanup
            filename = media_url.split('/')[-1]
            cleanup_storage_file(filename, 'posts')
        app.logger.error(f"Error creating post in database: {e}")
        return jsonify({"error": "Failed to create post"}), 500

@app.route('/api/posts/<uuid:post_id>/comments', methods=['POST'])
@authenticated_only
def add_comment(post_id):
    data = request.json
    text = data.get('text') if data else None
    parent_comment_id = data.get('parentCommentId') if data else None
    
    if not text: 
        return jsonify({"error": "Comment text is required"}), 400
    if not Post.query.get(post_id): 
        return jsonify({"error": "Post not found"}), 404
    
    try:
        new_comment = Comment(
            post_id=post_id, 
            author_id=request.user_id, 
            text=text,
            parent_comment_id=parent_comment_id
        )
        db.session.add(new_comment)
        db.session.commit()
        
        # Update discussion analytics
        update_discussion_analytics(post_id)
        
        # Create notifications for relevant users
        post = Post.query.get(post_id)
        if post and post.author_id != request.user_id:
            # Notify post author about new comment
            create_notification(
                user_id=post.author_id,
                notification_type='COMMENT_REPLY',
                title='New Comment on Your Post',
                message=f'{new_comment.author.name} commented on your post',
                data={'post_id': str(post_id), 'comment_id': str(new_comment.id)}
            )
        
        # If this is a reply to a comment, notify the comment author
        if parent_comment_id:
            parent_comment = Comment.query.get(parent_comment_id)
            if parent_comment and parent_comment.author_id != request.user_id:
                create_notification(
                    user_id=parent_comment.author_id,
                    notification_type='COMMENT_REPLY',
                    title='Reply to Your Comment',
                    message=f'{new_comment.author.name} replied to your comment',
                    data={'post_id': str(post_id), 'comment_id': str(new_comment.id), 'parent_comment_id': str(parent_comment_id)}
                )
        
        return jsonify(new_comment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error adding comment: {e}")
        return jsonify({"error": "Failed to add comment"}), 500

@app.route('/api/posts/<uuid:post_id>/reactions', methods=['POST'])
@authenticated_only
def toggle_reaction(post_id):
    reaction_type = request.json.get('type')
    if reaction_type not in ['HEART', 'SUPPORT']: 
        return jsonify({"error": "Invalid reaction type"}), 400
    
    try:
        existing_reaction = Reaction.query.filter_by(post_id=post_id, user_id=request.user_id).first()
        action = "removed"
        
        if existing_reaction:
            if existing_reaction.type == reaction_type: 
                db.session.delete(existing_reaction)
                action = "removed"
            else: 
                existing_reaction.type = reaction_type
                action = "changed"
        else:
            new_reaction = Reaction(post_id=post_id, user_id=request.user_id, type=reaction_type)
            db.session.add(new_reaction)
            action = "added"
        
        db.session.commit()
        
        # Create notification for post author (if not their own post and reaction was added)
        if action == "added":
            post = db.session.get(Post, post_id)
            if post and post.author_id != request.user_id:
                user = db.session.get(User, request.user_id)
                create_notification(
                    user_id=post.author_id,
                    notification_type='POST_REACTION',
                    title='New Reaction on Your Post',
                    message=f'{user.name} reacted to your post',
                    data={'post_id': str(post_id), 'reaction_type': reaction_type}
                )
        
        return jsonify({"message": f"Reaction {action}"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error toggling post reaction: {e}")
        return jsonify({"error": "Failed to toggle reaction"}), 500

@app.route('/api/comments/<uuid:comment_id>/reactions', methods=['POST'])
@authenticated_only
def toggle_comment_reaction(comment_id):
    data = request.json
    reaction_type = data.get('type') if data else None
    
    if reaction_type not in ['UPVOTE', 'DOWNVOTE', 'HELPFUL', 'EXPERT']:
        return jsonify({"error": "Invalid reaction type"}), 400
    
    try:
        existing_reaction = CommentReaction.query.filter_by(
            comment_id=comment_id, 
            user_id=request.user_id, 
            type=reaction_type
        ).first()
        
        if existing_reaction:
            db.session.delete(existing_reaction)
            action = "removed"
        else:
            # Only remove reactions of different types, not all reactions
            CommentReaction.query.filter_by(
                comment_id=comment_id, 
                user_id=request.user_id
            ).filter(CommentReaction.type != reaction_type).delete()
            
            new_reaction = CommentReaction(
                comment_id=comment_id,
                user_id=request.user_id,
                type=reaction_type
            )
            db.session.add(new_reaction)
            action = "added"
        
        db.session.commit()
        
        # Update discussion analytics
        comment = db.session.get(Comment, comment_id)
        if comment:
            update_discussion_analytics(comment.post_id)
            
            # Notify comment author about reaction (if not their own comment)
            if comment.author_id != request.user_id and action == "added":
                user = db.session.get(User, request.user_id)
                create_notification(
                    user_id=comment.author_id,
                    notification_type='COMMENT_REACTION',
                    title='New Reaction on Your Comment',
                    message=f'{user.name} reacted to your comment',
                    data={'post_id': str(comment.post_id), 'comment_id': str(comment_id), 'reaction_type': reaction_type}
                )
        
        return jsonify({"message": f"Reaction {action}"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error toggling comment reaction: {e}")
        return jsonify({"error": "Failed to toggle reaction"}), 500

@app.route('/api/posts/<uuid:post_id>/discussion-analytics', methods=['GET'])
def get_discussion_analytics(post_id):
    try:
        analytics = DiscussionAnalytics.query.filter_by(post_id=post_id).first()
        if not analytics:
            # Create initial analytics if none exist
            analytics = DiscussionAnalytics(post_id=post_id)
            db.session.add(analytics)
            db.session.commit()
            update_discussion_analytics(post_id)
            analytics = DiscussionAnalytics.query.filter_by(post_id=post_id).first()
        
        return jsonify(analytics.to_dict()), 200
    except Exception as e:
        app.logger.error(f"Error getting discussion analytics: {e}")
        return jsonify({"error": "Failed to get discussion analytics"}), 500

def update_discussion_analytics(post_id):
    """Update discussion analytics for a post"""
    try:
        # Get or create analytics record
        analytics = DiscussionAnalytics.query.filter_by(post_id=post_id).first()
        if not analytics:
            analytics = DiscussionAnalytics(post_id=post_id)
            db.session.add(analytics)
        
        # Count comments and replies
        comments = Comment.query.filter_by(post_id=post_id, parent_comment_id=None).all()
        replies = Comment.query.filter_by(post_id=post_id).filter(Comment.parent_comment_id.isnot(None)).all()
        
        # Count reactions
        upvotes = CommentReaction.query.join(Comment).filter(
            Comment.post_id == post_id,
            CommentReaction.type == 'UPVOTE'
        ).count()
        
        downvotes = CommentReaction.query.join(Comment).filter(
            Comment.post_id == post_id,
            CommentReaction.type == 'DOWNVOTE'
        ).count()
        
        # Count expert participants
        expert_participants = db.session.query(User.id).join(Comment).filter(
            Comment.post_id == post_id,
            User.expertise_level == 'EXPERT'
        ).distinct().count()
        
        # Calculate discussion score
        discussion_score = (
            len(comments) * 1.0 +
            len(replies) * 0.5 +
            upvotes * 2.0 -
            downvotes * 1.0 +
            expert_participants * 3.0
        )
        
        # Update analytics
        analytics.total_comments = len(comments)
        analytics.total_replies = len(replies)
        analytics.total_upvotes = upvotes
        analytics.total_downvotes = downvotes
        analytics.expert_participants = expert_participants
        analytics.discussion_score = discussion_score
        analytics.last_activity = db.func.now()
        analytics.updated_at = db.func.now()
        
        db.session.commit()
        
    except Exception as e:
        app.logger.error(f"Error updating discussion analytics: {e}")
        db.session.rollback()

# --- NOTIFICATION SYSTEM ---
def create_notification(user_id, notification_type, title, message, data=None):
    """Create a notification and send it via WebSocket"""
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data or {}
        )
        db.session.add(notification)
        db.session.commit()
        
        # Send real-time notification via WebSocket
        socketio.emit('new_notification', notification.to_dict(), room=f'user_{user_id}')
        
        return notification
    except Exception as e:
        app.logger.error(f"Error creating notification: {e}")
        db.session.rollback()
        return None

def send_notification_to_user(user_id, notification_data):
    """Send notification to specific user via WebSocket"""
    socketio.emit('new_notification', notification_data, room=f'user_{user_id}')

# --- WEBSOCKET EVENT HANDLERS ---
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    app.logger.info(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    app.logger.info(f'Client disconnected: {request.sid}')

@socketio.on('join_user_room')
def handle_join_user_room(data):
    """Join user-specific room for notifications"""
    user_id = data.get('user_id')
    if user_id:
        join_room(f'user_{user_id}')
        app.logger.info(f'User {user_id} joined their notification room')

@socketio.on('leave_user_room')
def handle_leave_user_room(data):
    """Leave user-specific room"""
    user_id = data.get('user_id')
    if user_id:
        leave_room(f'user_{user_id}')
        app.logger.info(f'User {user_id} left their notification room')

# --- NOTIFICATION API ENDPOINTS ---
@app.route('/api/notifications', methods=['GET'])
@authenticated_only
def get_notifications():
    """Get user's notifications"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = Notification.query.filter_by(user_id=request.user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        notifications = query.order_by(desc(Notification.created_at)).paginate(
            page=page, per_page=limit, error_out=False
        )
        
        return jsonify({
            "notifications": [n.to_dict() for n in notifications.items],
            "total": notifications.total,
            "pages": notifications.pages,
            "current_page": page
        }), 200
    except Exception as e:
        app.logger.error(f"Error fetching notifications: {e}")
        return jsonify({"error": "Failed to fetch notifications"}), 500

@app.route('/api/notifications/<uuid:notification_id>/read', methods=['PUT'])
@authenticated_only
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.query.filter_by(
            id=notification_id, 
            user_id=request.user_id
        ).first()
        
        if not notification:
            return jsonify({"error": "Notification not found"}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({"message": "Notification marked as read"}), 200
    except Exception as e:
        app.logger.error(f"Error marking notification as read: {e}")
        return jsonify({"error": "Failed to mark notification as read"}), 500

@app.route('/api/notifications/read-all', methods=['PUT'])
@authenticated_only
def mark_all_notifications_read():
    """Mark all user notifications as read"""
    try:
        Notification.query.filter_by(
            user_id=request.user_id, 
            is_read=False
        ).update({"is_read": True})
        
        db.session.commit()
        
        return jsonify({"message": "All notifications marked as read"}), 200
    except Exception as e:
        app.logger.error(f"Error marking all notifications as read: {e}")
        return jsonify({"error": "Failed to mark all notifications as read"}), 500

@app.route('/api/notifications/unread-count', methods=['GET'])
@authenticated_only
def get_unread_count():
    """Get count of unread notifications"""
    try:
        count = Notification.query.filter_by(
            user_id=request.user_id, 
            is_read=False
        ).count()
        
        return jsonify({"unread_count": count}), 200
    except Exception as e:
        app.logger.error(f"Error getting unread count: {e}")
        return jsonify({"error": "Failed to get unread count"}), 500

@app.route('/api/admin/pending-users', methods=['GET'])
@role_required(['ADMIN'])
def get_pending_users():
    # ... (existing code)
    pending_users = User.query.filter_by(role='PENDING').all()
    return jsonify([user.to_dict() for user in pending_users]), 200

@app.route('/api/admin/approve-user/<uuid:user_id>', methods=['PUT'])
@role_required(['ADMIN'])
def approve_user(user_id):
    # ... (existing code)
    user_to_approve = User.query.filter_by(id=user_id, role='PENDING').first()
    if not user_to_approve: return jsonify({"error": "User not found or not in PENDING status"}), 404
    user_to_approve.role = 'NURSE'
    db.session.commit()
    return jsonify({ "message": f"User {user_id} approved as NURSE", "user": user_to_approve.to_dict() }), 200

@app.route('/api/admin/users', methods=['GET'])
@role_required(['ADMIN'])
def get_all_users():
    """
    Get all users for admin management.
    """
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        app.logger.error(f"Error fetching all users: {e}")
        return jsonify({"error": "Failed to fetch users"}), 500

@app.route('/api/admin/users/<uuid:user_id>/role', methods=['PUT'])
@role_required(['ADMIN'])
def update_user_role(user_id):
    """
    Update user role (NURSE, ADMIN, INACTIVE).
    """
    try:
        data = request.json
        if not data or 'role' not in data:
            return jsonify({"error": "Role is required"}), 400
        
        new_role = data['role']
        if new_role not in ['NURSE', 'ADMIN', 'INACTIVE']:
            return jsonify({"error": "Invalid role. Must be NURSE, ADMIN, or INACTIVE"}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        old_role = user.role
        user.role = new_role
        db.session.commit()
        
        return jsonify({
            "message": f"User role updated from {old_role} to {new_role}",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error updating user role: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to update user role"}), 500

@app.route('/api/admin/users/<uuid:user_id>', methods=['DELETE'])
@role_required(['ADMIN'])
def delete_user(user_id):
    """
    Delete a user account.
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Prevent admin from deleting themselves
        if user.id == request.user_id:
            return jsonify({"error": "Cannot delete your own account"}), 400
        
        # Delete the user (cascade will handle related records)
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": f"User {user.name} has been deleted"}), 200
        
    except Exception as e:
        app.logger.error(f"Error deleting user: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to delete user"}), 500

# --- NEW ENDPOINTS FOR RESOURCES AND BLOGS ---

# --- Resource Endpoints ---

@app.route('/api/resources', methods=['GET'])
@authenticated_only
def get_resources():
    resources = Resource.query.filter_by(status='APPROVED').order_by(Resource.created_at.desc()).all()
    return jsonify([resource.to_dict() for resource in resources]), 200

@app.route('/api/resources/<uuid:resource_id>', methods=['GET'])
@authenticated_only
def get_resource_by_id(resource_id):
    resource = Resource.query.filter_by(id=resource_id, status='APPROVED').first()
    if not resource:
        return jsonify({"error": "Resource not found or not approved"}), 404
    return jsonify(resource.to_dict()), 200

@app.route('/api/resources', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def create_resource():
    form_data = request.form
    author_id = request.user_id
    
    if not all([form_data.get('title'), form_data.get('type')]):
        return jsonify({"error": "Title and type are required"}), 400
        
    resource_type = form_data.get('type')
    new_resource = Resource(
        author_id=author_id,
        title=form_data.get('title'),
        description=form_data.get('description'),
        type=resource_type,
        content=form_data.get('content')
    )

    file_url, unique_filename = None, None
    if resource_type == 'FILE':
        if 'file' not in request.files or not request.files['file'].filename:
            return jsonify({"error": "A file is required for type 'FILE'"}), 400
        file_url = upload_to_storage(request.files['file'], 'resources')
        if not file_url:
            return jsonify({"error": "Failed to upload file"}), 500
        new_resource.file_url = file_url
    
    try:
        db.session.add(new_resource)
        db.session.commit()
        return jsonify(new_resource.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        if file_url: 
            # Extract filename from URL for cleanup
            filename = file_url.split('/')[-1]
            cleanup_storage_file(filename, 'resources')
        app.logger.error(f"Error creating resource: {e}")
        return jsonify({"error": "Failed to create resource"}), 500

@app.route('/api/admin/pending-resources', methods=['GET'])
@role_required(['ADMIN'])
def get_pending_resources():
    pending_resources = Resource.query.filter_by(status='PENDING').order_by(Resource.created_at.asc()).all()
    return jsonify([resource.to_dict() for resource in pending_resources]), 200

@app.route('/api/admin/approve-resource/<uuid:resource_id>', methods=['PUT'])
@role_required(['ADMIN'])
def approve_resource(resource_id):
    resource_to_approve = Resource.query.filter_by(id=resource_id, status='PENDING').first()
    if not resource_to_approve:
        return jsonify({"error": "Resource not found or not in PENDING status"}), 404
    resource_to_approve.status = 'APPROVED'
    db.session.commit()
    return jsonify(resource_to_approve.to_dict()), 200

# --- New Resource Editor Endpoints ---

@app.route('/api/resources/<uuid:resource_id>', methods=['PUT'])
@role_required(['NURSE', 'ADMIN'])
def update_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Resource not found"}), 404

    # Authorization check: only the author or admin can edit
    if resource.author_id != request.user_id and request.user_id not in [user.id for user in User.query.filter_by(role='ADMIN').all()]:
        return jsonify({"error": "Forbidden: You can only edit your own resources or must be an admin"}), 403
    
    form_data = request.form
    title = form_data.get('title')
    description = form_data.get('description')
    resource_type = form_data.get('type')
    content = form_data.get('content')
    
    if not title or not title.strip():
        return jsonify({"error": "Title is required"}), 400
    
    if not resource_type or not resource_type.strip():
        return jsonify({"error": "Type is required"}), 400
    
    # Update the resource fields
    resource.title = title.strip()
    resource.description = description.strip() if description else None
    resource.type = resource_type.strip()
    resource.content = content.strip() if content else None
    
    # Handle file update if provided
    file_url, unique_filename = None, None
    if 'file' in request.files and request.files['file'].filename:
        # Upload new file
        file_url = upload_to_storage(request.files['file'], 'resources')
        if not file_url:
            return jsonify({"error": "Failed to upload file"}), 500
        
        # If there was a previous file, clean it up
        if resource.file_url:
            old_filename = resource.file_url.split('/')[-1]  # Extract filename from URL
            cleanup_storage_file(old_filename, 'resources')
        
        resource.file_url = file_url
    
    try:
        db.session.commit()
        return jsonify(resource.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        if file_url: 
            # Extract filename from URL for cleanup
            filename = file_url.split('/')[-1]
            cleanup_storage_file(filename, 'resources')
        app.logger.error(f"Error updating resource: {e}")
        return jsonify({"error": "Failed to update resource"}), 500

@app.route('/api/resources/<uuid:resource_id>', methods=['DELETE'])
@role_required(['NURSE', 'ADMIN'])
def delete_resource(resource_id):
    resource = db.session.get(Resource, resource_id)
    if not resource:
        return jsonify({"error": "Resource not found"}), 404

    # Authorization check: only the author or admin can delete
    if resource.author_id != request.user_id and request.user_id not in [user.id for user in User.query.filter_by(role='ADMIN').all()]:
        return jsonify({"error": "Forbidden: You can only delete your own resources or must be an admin"}), 403
    
    try:
        # Clean up associated file from storage
        if resource.file_url:
            file_filename = resource.file_url.split('/')[-1]  # Extract filename from URL
            cleanup_storage_file(file_filename, SUPABASE_RESOURCES_BUCKET)
        
        # Delete the resource record
        db.session.delete(resource)
        db.session.commit()
        
        return jsonify({"message": "Resource deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting resource: {e}")
        return jsonify({"error": "Failed to delete resource"}), 500

# --- Blog Endpoints ---

@app.route('/api/blogs', methods=['GET'])
@authenticated_only
def get_blogs():
    blogs = Blog.query.filter_by(status='APPROVED').order_by(Blog.created_at.desc()).all()
    return jsonify([blog.to_dict() for blog in blogs]), 200

@app.route('/api/blogs/<uuid:blog_id>', methods=['GET'])
@authenticated_only
def get_blog_by_id(blog_id):
    blog = Blog.query.filter_by(id=blog_id, status='APPROVED').first()
    if not blog:
        return jsonify({"error": "Blog not found or not approved"}), 404
    return jsonify(blog.to_dict()), 200

@app.route('/api/blogs', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def create_blog():
    form_data = request.form
    author_id = request.user_id

    if not all([form_data.get('title'), form_data.get('content')]):
        return jsonify({"error": "Title and content are required"}), 400

    new_blog = Blog(
        author_id=author_id,
        title=form_data.get('title'),
        content=form_data.get('content')
    )

    cover_image_url, unique_filename = None, None
    if 'coverImage' in request.files and request.files['coverImage'].filename:
        cover_image_url = upload_to_storage(request.files['coverImage'], 'blogs')
        if not cover_image_url:
            return jsonify({"error": "Failed to upload cover image"}), 500
        new_blog.cover_image_url = cover_image_url

    try:
        db.session.add(new_blog)
        db.session.commit()
        return jsonify(new_blog.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        if cover_image_url: 
            # Extract filename from URL for cleanup
            filename = cover_image_url.split('/')[-1]
            cleanup_storage_file(filename, 'blogs')
        app.logger.error(f"Error creating blog: {e}")
        return jsonify({"error": "Failed to create blog"}), 500


@app.route('/api/ai/chat', methods=['POST'])
@authenticated_only
def chat_with_ai():
    if not OPENAI_API_KEY:
        return jsonify({"error": "AI service is not configured on the server."}), 503

    data = request.json
    user_message = data.get('message')
    history = data.get('history', [])

    if not user_message:
        return jsonify({"error": "Message is required."}), 400

    # Format the conversation for the OpenAI API
    # We can add a "system" message to give the AI context about its role
    messages = [{"role": "system", "content": "You are a helpful AI assistant for nurses and healthcare professionals. Provide concise, accurate, and supportive information."}]

    # Transform the frontend history to the format OpenAI expects
    for item in history:
        role = "user" if item.get('sender') == "USER" else "assistant"
        messages.append({"role": role, "content": item.get('text')})

    # Add the user's latest message
    messages.append({"role": "user", "content": user_message})
    
    try:
        # Call the OpenAI Chat Completion API
        chat_completion = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # Or "gpt-4" if you have access
            messages=messages
        )
        
        ai_reply = chat_completion.choices[0].message.content
        
        return jsonify({"reply": ai_reply}), 200

    except Exception as e:
        app.logger.error(f"Error calling OpenAI API: {e}")
        return jsonify({"error": "Failed to get response from AI assistant."}), 500


@app.route('/api/admin/pending-blogs', methods=['GET'])
@role_required(['ADMIN'])
def get_pending_blogs():
    pending_blogs = Blog.query.filter_by(status='PENDING').order_by(Blog.created_at.asc()).all()
    return jsonify([blog.to_dict() for blog in pending_blogs]), 200

@app.route('/api/admin/approve-blog/<uuid:blog_id>', methods=['PUT'])
@role_required(['ADMIN'])
def approve_blog(blog_id):
    blog_to_approve = Blog.query.filter_by(id=blog_id, status='PENDING').first()
    if not blog_to_approve:
        return jsonify({"error": "Blog not found or not in PENDING status"}), 404
    blog_to_approve.status = 'APPROVED'
    db.session.commit()
    return jsonify(blog_to_approve.to_dict()), 200

# --- New Blog Editor Endpoints ---

@app.route('/api/blogs/image', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def upload_blog_image():
    if 'imageFile' not in request.files or not request.files['imageFile'].filename:
        return jsonify({"error": "Image file is required"}), 400
    
    image_file = request.files['imageFile']
    
    # Upload the image to the blogs bucket
    image_url, unique_filename = upload_to_storage(image_file, SUPABASE_BLOGS_BUCKET)
    if not image_url:
        return jsonify({"error": "Failed to upload image file"}), 500
    
    return jsonify({"imageUrl": image_url}), 200

@app.route('/api/blogs/<uuid:blog_id>', methods=['PUT'])
@role_required(['NURSE', 'ADMIN'])
def update_blog(blog_id):
    blog = Blog.query.get(blog_id)
    if not blog:
        return jsonify({"error": "Blog not found"}), 404

    # Authorization check: only the author or admin can edit
    if blog.author_id != request.user_id and request.user_id not in [user.id for user in User.query.filter_by(role='ADMIN').all()]:
        return jsonify({"error": "Forbidden: You can only edit your own blogs or must be an admin"}), 403
    
    form_data = request.form
    title = form_data.get('title')
    content = form_data.get('content')
    
    if not title or not title.strip():
        return jsonify({"error": "Title is required"}), 400
    
    if not content or not content.strip():
        return jsonify({"error": "Content is required"}), 400
    
    # Update title and content
    blog.title = title.strip()
    blog.content = content.strip()
    
    # Handle cover image update if provided
    cover_image_url, unique_filename = None, None
    if 'coverImage' in request.files and request.files['coverImage'].filename:
        # Upload new cover image
        cover_image_url, unique_filename = upload_to_storage(request.files['coverImage'], SUPABASE_BLOGS_BUCKET)
        if not cover_image_url:
            return jsonify({"error": "Failed to upload cover image"}), 500
        
        # If there was a previous cover image, clean it up
        if blog.cover_image_url:
            old_filename = blog.cover_image_url.split('/')[-1]  # Extract filename from URL
            cleanup_storage_file(old_filename, SUPABASE_BLOGS_BUCKET)
        
        blog.cover_image_url = cover_image_url
    
    try:
        db.session.commit()
        return jsonify(blog.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        if unique_filename: cleanup_storage_file(unique_filename, SUPABASE_BLOGS_BUCKET)
        app.logger.error(f"Error updating blog: {e}")
        return jsonify({"error": "Failed to update blog"}), 500

@app.route('/api/blogs/<uuid:blog_id>', methods=['DELETE'])
@role_required(['NURSE', 'ADMIN'])
def delete_blog(blog_id):
    blog = Blog.query.get(blog_id)
    if not blog:
        return jsonify({"error": "Blog not found"}), 404

    # Authorization check: only the author or admin can delete
    if blog.author_id != request.user_id and request.user_id not in [user.id for user in User.query.filter_by(role='ADMIN').all()]:
        return jsonify({"error": "Forbidden: You can only delete your own blogs or must be an admin"}), 403
    
    try:
        # Clean up associated images from storage
        if blog.cover_image_url:
            cover_filename = blog.cover_image_url.split('/')[-1]  # Extract filename from URL
            cleanup_storage_file(cover_filename, SUPABASE_BLOGS_BUCKET)
        
        # Delete the blog record
        db.session.delete(blog)
        db.session.commit()
        
        return jsonify({"message": "Blog deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting blog: {e}")
        return jsonify({"error": "Failed to delete blog"}), 500

# --- BROADCAST MESSAGE ENDPOINTS ---

@app.route('/api/broadcast-messages', methods=['GET'])
def get_active_broadcast_message():
    """Get the currently active broadcast message for the landing page"""
    try:
        # Get the most recent active broadcast message
        broadcast_message = BroadcastMessage.query.filter_by(is_active=True).order_by(BroadcastMessage.created_at.desc()).first()
        
        if not broadcast_message:
            return jsonify({"message": None}), 200
        
        return jsonify({"message": broadcast_message.to_dict()}), 200
    except Exception as e:
        app.logger.error(f"Error fetching broadcast message: {e}")
        return jsonify({"error": "Failed to fetch broadcast message"}), 500

@app.route('/api/admin/broadcast-messages', methods=['GET'])
@role_required(['ADMIN'])
def get_all_broadcast_messages():
    """Get all broadcast messages for admin management"""
    try:
        messages = BroadcastMessage.query.order_by(BroadcastMessage.created_at.desc()).all()
        return jsonify([message.to_dict() for message in messages]), 200
    except Exception as e:
        app.logger.error(f"Error fetching broadcast messages: {e}")
        return jsonify({"error": "Failed to fetch broadcast messages"}), 500

@app.route('/api/admin/broadcast-messages', methods=['POST'])
@role_required(['ADMIN'])
def create_broadcast_message():
    """Create a new broadcast message"""
    try:
        data = request.json
        if not data or not data.get('title') or not data.get('message'):
            return jsonify({"error": "Title and message are required"}), 400
        
        # Deactivate all existing broadcast messages
        BroadcastMessage.query.update({"is_active": False})
        
        # Create new broadcast message
        new_message = BroadcastMessage(
            title=data['title'].strip(),
            message=data['message'].strip(),
            created_by=request.user_id,
            is_active=True
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        return jsonify(new_message.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating broadcast message: {e}")
        return jsonify({"error": "Failed to create broadcast message"}), 500

@app.route('/api/admin/broadcast-messages/<uuid:message_id>', methods=['PUT'])
@role_required(['ADMIN'])
def update_broadcast_message(message_id):
    """Update a broadcast message"""
    try:
        message = BroadcastMessage.query.get(message_id)
        if not message:
            return jsonify({"error": "Broadcast message not found"}), 404
        
        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Update fields if provided
        if 'title' in data:
            message.title = data['title'].strip()
        if 'message' in data:
            message.message = data['message'].strip()
        if 'is_active' in data:
            # If activating this message, deactivate all others
            if data['is_active']:
                BroadcastMessage.query.filter(BroadcastMessage.id != message_id).update({"is_active": False})
            message.is_active = data['is_active']
        
        db.session.commit()
        return jsonify(message.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating broadcast message: {e}")
        return jsonify({"error": "Failed to update broadcast message"}), 500

@app.route('/api/admin/broadcast-messages/<uuid:message_id>', methods=['DELETE'])
@role_required(['ADMIN'])
def delete_broadcast_message(message_id):
    """Delete a broadcast message"""
    try:
        message = BroadcastMessage.query.get(message_id)
        if not message:
            return jsonify({"error": "Broadcast message not found"}), 404
        
        db.session.delete(message)
        db.session.commit()
        
        return jsonify({"message": "Broadcast message deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting broadcast message: {e}")
        return jsonify({"error": "Failed to delete broadcast message"}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "PulseLoopCare API is running with local file storage",
        "upload_folder": UPLOAD_FOLDER
    }), 200

if __name__ == '__main__':
    print("🚀 Starting PulseLoopCare with Local File Storage...")
    print(f"📁 Local file storage: {UPLOAD_FOLDER}")
    print("🗄️ Database: Supabase")
    print("🌐 Server: http://localhost:5000")
    print("=" * 60)
    
    socketio.run(app, debug=True, port=5000)