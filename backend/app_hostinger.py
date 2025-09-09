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
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

# Import Hostinger-compatible models
from models_hostinger import db, User, Post, Comment, Reaction, Resource, Blog, Invitation, CommentReaction, DiscussionAnalytics, Notification

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*") 

# Configuration & Initialization
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    app.logger.warning("OPENAI_API_KEY not set. AI chat endpoint will not work.")
else:
    openai.api_key = OPENAI_API_KEY

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Flask configuration
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))

# MySQL Database Configuration for Hostinger
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "pulseloopcare")

# Construct MySQL connection string
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

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

def save_file(file, folder):
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

# Authentication decorator
def authenticated_only(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        token = auth_header.split(' ')[1]
        # Simple token validation - in production, use JWT
        user = User.query.filter_by(id=token).first()
        if not user:
            return jsonify({"error": "Invalid token"}), 401
        
        request.user_id = user.id
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({"error": "Missing or invalid authorization header"}), 401
            
            token = auth_header.split(' ')[1]
            user = User.query.filter_by(id=token).first()
            if not user or user.role not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            
            request.user_id = user.id
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Generate display name based on preference
def generate_display_name(user, preference):
    if preference == 'Anonymous':
        return "Anonymous"
    elif preference == 'FullName':
        first_name = user.name.split()[0] if user.name else "User"
        last_initial = user.name.split()[1][0] + '.' if len(user.name.split()) > 1 else ''
        title = f", {user.title}" if user.title else ''
        return f"{first_name}{last_initial}{title}".replace(' ,', ',')
    else:  # Initials
        names = user.name.split() if user.name else ["U", "s", "e", "r"]
        initials = ''.join([name[0] for name in names[:2]])
        title = f", {user.title}" if user.title else ''
        return f"{initials}{title}".replace(' ,', ',')

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "PulseLoopCare API is running"}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all([data.get('name'), data.get('email'), data.get('password')]):
        return jsonify({"error": "Name, email, and password are required"}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({"error": "User with this email already exists"}), 400
    
    # Create new user
    new_user = User(
        name=data['name'],
        email=data['email'],
        role=data.get('role', 'PENDING'),
        title=data.get('title'),
        state=data.get('state'),
        department=data.get('department'),
        bio=data.get('bio'),
        expertise_level=data.get('expertise_level', 'BEGINNER'),
        expertise_areas=json.dumps(data.get('expertise_areas', []))
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify(new_user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating user: {e}")
        return jsonify({"error": "Failed to create user"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all([data.get('email'), data.get('password')]):
        return jsonify({"error": "Email and password are required"}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    # In production, verify password hash here
    # For now, we'll use a simple token (user ID)
    return jsonify({
        "user": user.to_dict(),
        "token": user.id
    }), 200

@app.route('/api/posts', methods=['GET'])
@authenticated_only
def get_posts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    posts = Post.query.order_by(desc(Post.created_at)).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "posts": [post.to_dict() for post in posts.items],
        "total": posts.total,
        "pages": posts.pages,
        "current_page": page
    }), 200

@app.route('/api/posts', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def create_post():
    author_id = request.user_id
    text = request.form.get('text')
    display_name_preference = request.form.get('displayNamePreference')
    tags_json = request.form.get('tags')
    
    if not text:
        return jsonify({"error": "Post text is required"}), 400
    if not display_name_preference:
        return jsonify({"error": "Display name preference is required"}), 400
    
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
    
    # Handle file upload
    media_url = None
    media_type = None
    if 'mediaFile' in request.files and request.files['mediaFile'].filename:
        media_file = request.files['mediaFile']
        media_url = save_file(media_file, 'posts')
        if media_url:
            media_type = 'image' if media_file.content_type.startswith('image') else 'video'
    
    try:
        new_post = Post(
            author_id=author_id,
            text=text,
            media_url=media_url,
            media_type=media_type,
            display_name=display_name,
            tags=json.dumps(tags)
        )
        db.session.add(new_post)
        db.session.commit()
        return jsonify(new_post.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating post: {e}")
        return jsonify({"error": "Failed to create post"}), 500

@app.route('/api/blogs', methods=['GET'])
@authenticated_only
def get_blogs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    blogs = Blog.query.filter_by(status='APPROVED').order_by(desc(Blog.created_at)).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "blogs": [blog.to_dict() for blog in blogs.items],
        "total": blogs.total,
        "pages": blogs.pages,
        "current_page": page
    }), 200

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

    # Handle cover image upload
    if 'coverImage' in request.files and request.files['coverImage'].filename:
        cover_image = request.files['coverImage']
        cover_image_url = save_file(cover_image, 'blogs')
        if cover_image_url:
            new_blog.cover_image_url = cover_image_url

    try:
        db.session.add(new_blog)
        db.session.commit()
        return jsonify(new_blog.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating blog: {e}")
        return jsonify({"error": "Failed to create blog"}), 500

@app.route('/api/resources', methods=['GET'])
@authenticated_only
def get_resources():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    resources = Resource.query.filter_by(status='APPROVED').order_by(desc(Resource.created_at)).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "resources": [resource.to_dict() for resource in resources.items],
        "total": resources.total,
        "pages": resources.pages,
        "current_page": page
    }), 200

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

    # Handle file upload for FILE type resources
    if resource_type == 'FILE':
        if 'file' not in request.files or not request.files['file'].filename:
            return jsonify({"error": "A file is required for type 'FILE'"}), 400
        file_url = save_file(request.files['file'], 'resources')
        if file_url:
            new_resource.file_url = file_url
    
    try:
        db.session.add(new_resource)
        db.session.commit()
        return jsonify(new_resource.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating resource: {e}")
        return jsonify({"error": "Failed to create resource"}), 500

# Admin routes
@app.route('/api/admin/users', methods=['GET'])
@role_required(['ADMIN'])
def get_all_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@app.route('/api/admin/users/<user_id>/role', methods=['PUT'])
@role_required(['ADMIN'])
def update_user_role(user_id):
    data = request.get_json()
    new_role = data.get('role')
    
    if new_role not in ['NURSE', 'ADMIN', 'INACTIVE']:
        return jsonify({"error": "Invalid role"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.role = new_role
    db.session.commit()
    
    return jsonify(user.to_dict()), 200

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@role_required(['ADMIN'])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"message": "User deleted successfully"}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Production configuration
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)
