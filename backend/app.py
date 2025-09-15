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
from flask_socketio import SocketIO, join_room, leave_room
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc

# --- Security and Authentication ---
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta, timezone

# --- Email Helper Functions ---
def send_email(to_email, subject, body, is_html=False):
    """Send email using SMTP"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = MAIL_DEFAULT_SENDER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add body
        if is_html:
            msg.attach(MIMEText(body, 'html'))
        else:
            msg.attach(MIMEText(body, 'plain'))
        
        # Connect to server and send email
        if MAIL_USE_SSL:
            server = smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT)
        else:
            server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
            if MAIL_USE_TLS:
                server.starttls()
        
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        app.logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        app.logger.error(f"Failed to send email to {to_email}: {e}")
        return False

def send_invitation_email(invitee_email, inviter_name, token):
    """Send invitation email"""
    subject = f"You're invited to join PulseLoopCare by {inviter_name}"
    
    # Create invitation link
    invitation_link = f"{FRONTEND_URL}/?token={token}"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #14B8A6, #0D9488); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to PulseLoopCare</h1>
                <p>You've been invited to join our healthcare professional community</p>
            </div>
            <div class="content">
                <h2>Hello!</h2>
                <p><strong>{inviter_name}</strong> has invited you to join PulseLoopCare, a platform designed to connect healthcare professionals and enhance medical collaboration.</p>
                
                <p>With PulseLoopCare, you can:</p>
                <ul>
                    <li>Connect with fellow healthcare professionals</li>
                    <li>Access AI-powered medical insights</li>
                    <li>Share resources and best practices</li>
                    <li>Collaborate on complex cases</li>
                </ul>
                
                <div style="text-align: center;">
                    <a href="{invitation_link}" class="button">Accept Invitation</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #14B8A6;">{invitation_link}</p>
                
                <p>This invitation will expire in 7 days.</p>
            </div>
            <div class="footer">
                <p>© 2025 PulseLoopCare. All rights reserved.</p>
                <p>Contact us: admin@pulseloopcare.com | +1 (832) 334-1801</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(invitee_email, subject, html_body, is_html=True)

def send_password_reset_email(user_email, user_name, reset_token):
    """Send password reset email"""
    subject = "Reset Your PulseLoopCare Password"
    
    # Create reset link
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #14B8A6, #0D9488); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
                <p>PulseLoopCare Account Security</p>
            </div>
            <div class="content">
                <h2>Hello {user_name}!</h2>
                <p>We received a request to reset your password for your PulseLoopCare account.</p>
                
                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #14B8A6;">{reset_link}</p>
                
                <div class="warning">
                    <strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this password reset, please ignore this email.
                </div>
                
                <p>If you continue to have problems, please contact our support team.</p>
            </div>
            <div class="footer">
                <p>© 2025 PulseLoopCare. All rights reserved.</p>
                <p>Contact us: admin@pulseloopcare.com | +1 (832) 334-1801</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_body, is_html=True)

def send_welcome_email(user_email, user_name):
    """Send welcome email to new users"""
    subject = "Welcome to PulseLoopCare - Your Account is Pending Approval"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #14B8A6, #0D9488); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }}
            .welcome-box {{ background: #e8f5e8; border: 2px solid #14B8A6; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center; }}
            .feature-list {{ background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            .feature-item {{ display: flex; align-items: center; margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }}
            .feature-icon {{ background: #14B8A6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }}
            .pending-notice {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            .contact-info {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to PulseLoopCare!</h1>
                <p>Your Healthcare Professional Community Awaits</p>
            </div>
            <div class="content">
                <div class="welcome-box">
                    <h2>Hello {user_name}!</h2>
                    <p style="font-size: 18px; margin: 0;">Thank you for joining PulseLoopCare - the premier platform for healthcare professionals to connect, collaborate, and advance medical innovation together.</p>
                </div>
                
                <div class="pending-notice">
                    <h3>⏳ Account Pending Approval</h3>
                    <p><strong>Your account is currently under review by our admin team.</strong> This process typically takes 24-48 hours as we verify your healthcare credentials to maintain the highest standards of our professional community.</p>
                    <p>You'll receive an email notification once your account is approved and you can start exploring all that PulseLoopCare has to offer!</p>
                </div>
                
                <div class="feature-list">
                    <h3>🌟 What Awaits You in PulseLoopCare:</h3>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🤝</div>
                        <div>
                            <strong>Professional Networking</strong><br>
                            Connect with thousands of healthcare professionals worldwide
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🤖</div>
                        <div>
                            <strong>AI-Powered Insights</strong><br>
                            Access cutting-edge AI tools for medical research and diagnostics
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📚</div>
                        <div>
                            <strong>Resource Library</strong><br>
                            Share and access medical resources, case studies, and best practices
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">💬</div>
                        <div>
                            <strong>Collaborative Discussions</strong><br>
                            Engage in meaningful discussions about complex medical cases
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div>
                            <strong>Analytics & Insights</strong><br>
                            Track your professional growth and contribution to the community
                        </div>
                    </div>
                </div>
                
                <div class="contact-info">
                    <h3>📞 Need Help?</h3>
                    <p>If you have any questions or need assistance, our support team is here to help:</p>
                    <p><strong>Email:</strong> admin@pulseloopcare.com<br>
                    <strong>Phone:</strong> +1 (832) 334-1801</p>
                </div>
                
                <p style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                    Thank you for your patience as we work to maintain the highest quality standards in our healthcare professional community.
                </p>
            </div>
            <div class="footer">
                <p>© 2025 PulseLoopCare. All rights reserved.</p>
                <p>Connecting Healthcare Professionals Worldwide</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_body, is_html=True)

def send_approval_notification_email(user_email, user_name):
    """Send approval notification email to users when their account is approved"""
    subject = "🎉 Your PulseLoopCare Account Has Been Approved!"
    
    # Create login URL
    login_url = f"{FRONTEND_URL}"
    
    # HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #14B8A6, #0D9488); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }}
            .approval-box {{ background: #d4edda; border: 2px solid #28a745; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center; }}
            .cta-button {{ display: inline-block; background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
            .feature-list {{ background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            .feature-item {{ display: flex; align-items: center; margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }}
            .feature-icon {{ background: #14B8A6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            .contact-info {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p>Your PulseLoopCare Account is Now Active</p>
            </div>
            <div class="content">
                <div class="approval-box">
                    <h2>Hello {user_name}!</h2>
                    <p style="font-size: 18px; margin: 0;"><strong>Great news!</strong> Your PulseLoopCare account has been approved and is now active. You can now access all the features and start connecting with fellow healthcare professionals!</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_url}" class="cta-button">Login to Your Account</a>
                </div>
                
                <div class="feature-list">
                    <h3>🚀 What You Can Do Now:</h3>
                    
                    <div class="feature-item">
                        <div class="feature-icon">👥</div>
                        <div>
                            <strong>Connect with Colleagues</strong><br>
                            Start networking with thousands of healthcare professionals
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">🤖</div>
                        <div>
                            <strong>Access AI Tools</strong><br>
                            Use our advanced AI-powered medical insights and diagnostics
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📝</div>
                        <div>
                            <strong>Share Knowledge</strong><br>
                            Post articles, share resources, and contribute to discussions
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">💬</div>
                        <div>
                            <strong>Join Discussions</strong><br>
                            Participate in meaningful medical case discussions
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon">📊</div>
                        <div>
                            <strong>Track Your Impact</strong><br>
                            Monitor your contributions and professional growth
                        </div>
                    </div>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <h3>💡 Pro Tip</h3>
                    <p>Complete your profile to get the most out of PulseLoopCare. Add your specialty, experience, and interests to help others find and connect with you!</p>
                </div>
                
                <div class="contact-info">
                    <h3>📞 Need Help Getting Started?</h3>
                    <p>Our support team is here to help you make the most of your PulseLoopCare experience:</p>
                    <p><strong>Email:</strong> admin@pulseloopcare.com<br>
                    <strong>Phone:</strong> +1 (832) 334-1801</p>
                </div>
                
                <p style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                    Welcome to the PulseLoopCare community! We're excited to see what you'll contribute to our growing network of healthcare professionals.
                </p>
            </div>
            <div class="footer">
                <p>© 2025 PulseLoopCare. All rights reserved.</p>
                <p>Connecting Healthcare Professionals Worldwide</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_body, is_html=True)

# --- Import your corrected models ---
from models import db, User, Post, Comment, Reaction, Resource, Blog, Invitation, CommentReaction, DiscussionAnalytics, Notification, BroadcastMessage, PasswordReset, Feedback

# Load environment variables
load_dotenv()

# Email configuration
MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.hostinger.com')
MAIL_PORT = int(os.getenv('MAIL_PORT', 465))
MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'True').lower() == 'true'
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'False').lower() == 'true'
MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'admin@pulseloopcare.com')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'admin@pulseloopcare.com')

# Frontend URL configuration
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Configuration & Initialization ---
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
APP_DOMAIN = os.getenv("APP_DOMAIN", "http://localhost:5173")
# Add a secret key for signing JWT tokens. Change this to a random string!
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")

app.config['SECRET_KEY'] = SECRET_KEY
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

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


app.config['SQLALCHEMY_DATABASE_URI'] = DB_CONNECTION_STRING
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

# Test Supabase client connection - DISABLED FOR VPS DEPLOYMENT
# try:
#     # Test if we can access storage
#     buckets = supabase.storage.list_buckets()
#     app.logger.info(f"Supabase client initialized successfully. Available buckets: {[b.name for b in buckets]}")
# except Exception as e:
#     app.logger.error(f"Error initializing Supabase client: {e}")

# Local file storage configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'}
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# --- Local File Storage (Unchanged) ---
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(os.path.join(UPLOAD_FOLDER, 'avatars'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'posts'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'resources'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'blogs'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'media'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'broadcasts'), exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file_locally(file, folder):
    """Save uploaded file to local storage"""
    if file and allowed_file(file.filename):
        # Get file extension
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        # Create a safe filename with UUID and extension only
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_FOLDER, folder, unique_filename)
        file.save(file_path)
        return f"/uploads/{folder}/{unique_filename}", unique_filename
    return None, None

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

def role_required(roles):
    def decorator(f):
        @wraps(f)
        @authenticated_only # This decorator runs first to get the user
        def decorated_function(*args, **kwargs):
            user = User.query.get(request.user_id)
            if user.role not in roles:
                return jsonify({'message': f'Access denied. Required roles: {", ".join(roles)}'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def authenticated_only(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token is missing or malformed!'}), 401

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
            request.user_id = current_user.id # Pass user_id to the route
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
    return decorated
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

def send_password_reset_email(user_email, user_name, reset_token):
    """
    Send password reset email to the user.
    
    Args:
        user_email: Email address of the user
        user_name: Name of the user
        reset_token: Unique password reset token
    """
    if not all([SMTP_USERNAME, SMTP_PASSWORD]):
        app.logger.warning("SMTP credentials not configured. Email sending is disabled.")
        return False
    
    try:
        # Create the password reset URL
        base_url = APP_DOMAIN.rstrip('/')
        reset_url = f"{base_url}/reset-password?reset_token={reset_token}"
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = user_email
        msg['Subject'] = "Reset Your PulseLoop Password"
        
        # Email body
        body = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Hello {user_name},</p>
            <p>We received a request to reset your password for your PulseLoop account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{reset_url}</p>
            <p><strong>Important:</strong></p>
            <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
            </ul>
            <p>If you have any questions, please contact our support team.</p>
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
        server.sendmail(SMTP_USERNAME, user_email, text)
        server.quit()
        
        app.logger.info(f"Password reset email sent successfully to {user_email}")
        return True
        
    except Exception as e:
        app.logger.error(f"Failed to send password reset email to {user_email}: {e}")
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
        # Format: "First name only" (role shown separately on frontend)
        # Example: "Jane" or "John"
        name_parts = full_name.strip().split()
        if len(name_parts) >= 1:
            first_name = name_parts[0]
        else:
            first_name = full_name
        
        return first_name
    
    elif display_name_preference == 'Initials':
        # Format: "Initials only" (role shown separately on frontend)
        # Example: "J.S." or "M.K."
        name_parts = full_name.strip().split()
        initials = '.'.join([part[0] for part in name_parts if part]) + '.' if name_parts else ''
        
        return initials
    
    # Fallback to full name if preference is not recognized
    return full_name


# --- Existing API Endpoints (no changes here) ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email, password, name = data.get('email'), data.get('password'), data.get('name')
    
    if not all([email, password, name]):
        return jsonify({"error": "Email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email address already registered"}), 409

    try:
        # Securely hash the password before storing it
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

        # Create new user with hashed password
        new_user = User(
            name=name,
            email=email,
            password=hashed_password,
            role='PENDING'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Send welcome email to the new user
        try:
            send_welcome_email(email, name)
            app.logger.info(f"Welcome email sent to {email}")
        except Exception as email_error:
            app.logger.error(f"Failed to send welcome email to {email}: {email_error}")
            # Don't fail the signup if email fails, just log the error
        
        return jsonify({
            "message": "User signed up successfully. Awaiting admin approval. A welcome email has been sent to your inbox.",
            "user": new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Signup error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email, password = data.get('email'), data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Create a JWT token
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=24) # Token expires in 24 hours
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({"accessToken": token, "user": user.to_dict()}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """
    Send password reset email to user.
    """
    data = request.json
    email = data.get('email') if data else None
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    try:
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({"message": "If an account with that email exists, a password reset link has been sent"}), 200
        
        # Generate secure reset token
        reset_token = generate_secure_token()
        
        # Set expiration time (1 hour from now) - use timezone-naive datetime for database compatibility
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Create password reset record
        password_reset = PasswordReset(
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at,
            used=False
        )
        
        db.session.add(password_reset)
        db.session.commit()
        
        # Send password reset email
        email_sent = send_password_reset_email(user.email, user.name, reset_token)
        
        if not email_sent:
            app.logger.warning(f"Failed to send password reset email to {user.email}")
        
        return jsonify({"message": "If an account with that email exists, a password reset link has been sent"}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error in forgot password: {e}")
        return jsonify({"error": "Failed to process password reset request"}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    """
    Reset user password using reset token.
    """
    data = request.json
    token = data.get('token') if data else None
    new_password = data.get('newPassword') if data else None
    
    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400
    
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    try:
        # Find valid reset token
        password_reset = PasswordReset.query.filter_by(
            token=token, 
            used=False
        ).first()
        
        if not password_reset:
            return jsonify({"error": "Invalid or expired reset token"}), 400
        
        # Check if token has expired - compare timezone-naive datetimes
        current_time = datetime.now(timezone.utc).replace(tzinfo=None)
        if password_reset.expires_at < current_time:
            return jsonify({"error": "Reset token has expired"}), 400
        
        # Get the user
        user = User.query.get(password_reset.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Hash the new password
        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
        
        # Update user password
        user.password = hashed_password
        
        # Mark reset token as used
        password_reset.used = True
        
        db.session.commit()
        
        return jsonify({"message": "Password has been reset successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error resetting password: {e}")
        return jsonify({"error": "Failed to reset password"}), 500

@app.route('/api/users/<uuid:user_id>', methods=['GET'])
def get_user_profile(user_id):
    # Convert UUID to string for database query
    user_id_str = str(user_id)
    user = User.query.get(user_id_str)
    if not user: return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200

@app.route('/api/profile/avatar', methods=['POST'])
@authenticated_only
def upload_avatar():
    if 'avatarFile' not in request.files or not request.files['avatarFile'].filename:
        return jsonify({"error": "Avatar file is required"}), 400
    
    avatar_file = request.files['avatarFile']
    user_id = request.user_id
    
    avatar_url, unique_filename = upload_to_storage(avatar_file, 'avatars')
    if not avatar_url:
        return jsonify({"error": "Failed to upload avatar file"}), 500
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user.avatar_url = avatar_url
        db.session.commit()
        
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
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
        # Load all necessary data for feed display
        query = Post.query.options(
            db.joinedload(Post.author),  # Load author
            db.joinedload(Post.comments).joinedload(Comment.author),  # Load comments and their authors
            db.joinedload(Post.comments).joinedload(Comment.reactions),  # Load comment reactions
            db.joinedload(Post.reactions)  # Load post reactions
        )
        
        # Apply tag filter if provided
        if tag:
            # Use JSON search for tags stored as JSON text
            query = query.filter(Post.tags.like(f'%"{tag}"%'))
        
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
            if post.tags_list:
                for tag in post.tags_list:
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
    # Convert UUID to string for database query
    post_id_str = str(post_id)
    post = Post.query.options(
        db.joinedload(Post.author),
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.reactions)
    ).get(post_id_str)
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(post.to_dict_detailed()), 200

@app.route('/api/posts/<uuid:post_id>', methods=['PUT'])
@role_required(['NURSE', 'ADMIN'])
def update_post_text(post_id):
    # Convert UUID to string for database query
    post_id_str = str(post_id)
    post = Post.query.get(post_id_str)
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
    # KEY CHANGE: Use the property setter
    post.tags_list = tags
    db.session.commit()
    return jsonify(post.to_dict()), 200

@app.route('/api/users/<uuid:user_id>/posts', methods=['GET'])
@authenticated_only
def get_user_posts(user_id):
    # Convert UUID to string for database query
    user_id_str = str(user_id)
    user = User.query.get(user_id_str)
    if not user: return jsonify({"error": "User not found"}), 404
    
    # OPTIMIZED: Use fast feed method for user posts
    posts = Post.query.options(
        db.joinedload(Post.author)
    ).filter_by(author_id=user_id_str).order_by(Post.created_at.desc()).all()
    
    return jsonify([post.to_dict_feed() for post in posts]), 200
 
   
@app.route('/api/posts/<uuid:post_id>', methods=['DELETE'])
@authenticated_only
def delete_post(post_id):
    """Delete a post (author only)"""
    try:
        post_id_str = str(post_id)
        post = Post.query.get(post_id_str)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Check if user is the author or admin
        if post.author_id != request.user_id and request.user_role != 'ADMIN':
            return jsonify({"error": "Unauthorized to delete this post"}), 403
        
        # Delete associated reactions and comments
        Reaction.query.filter_by(post_id=post_id_str).delete()
        Comment.query.filter_by(post_id=post_id_str).delete()
        
        # Delete the post
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({"message": "Post deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting post: {e}")
        return jsonify({"error": "Failed to delete post"}), 500

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
        media_url, unique_filename = upload_to_storage(media_file, 'posts')
        if not media_url: return jsonify({"error": "Failed to upload media file"}), 500
        media_type = 'image' if media_file.content_type.startswith('image') else 'video'
    try:
        new_post = Post(
            author_id=author_id, 
            text=text, 
            media_url=media_url, 
            media_type=media_type,
            display_name=display_name
        )
        # KEY CHANGE: Use the property setter
        new_post.tags_list = tags
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
    
    # Convert UUID to string for database query
    post_id_str = str(post_id)
    
    if not text: 
        return jsonify({"error": "Comment text is required"}), 400
    if not Post.query.get(post_id_str): 
        return jsonify({"error": "Post not found"}), 404
    
    try:
        new_comment = Comment(
            post_id=post_id_str, 
            author_id=request.user_id, 
            text=text,
            parent_comment_id=parent_comment_id
        )
        db.session.add(new_comment)
        db.session.commit()
        
        # Update discussion analytics
        update_discussion_analytics(post_id_str)
        
        # Create notifications for relevant users
        post = Post.query.get(post_id_str)
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
    if reaction_type not in ['HEART', 'SUPPORT', 'LAUGH', 'SURPRISED', 'ANGRY', 'SAD', 'FIRE', 'CLAP']: 
        return jsonify({"error": "Invalid reaction type"}), 400
    
    try:
        # Convert UUID to string for database query
        post_id_str = str(post_id)
        existing_reaction = Reaction.query.filter_by(post_id=post_id_str, user_id=request.user_id).first()
        action = "removed"
        
        if existing_reaction:
            if existing_reaction.type == reaction_type: 
                db.session.delete(existing_reaction)
                action = "removed"
            else: 
                existing_reaction.type = reaction_type
                action = "changed"
        else:
            new_reaction = Reaction(post_id=post_id_str, user_id=request.user_id, type=reaction_type)
            db.session.add(new_reaction)
            action = "added"
        
        db.session.commit()
        
        # Create notification for post author (if not their own post and reaction was added)
        if action == "added":
            post = db.session.get(Post, post_id_str)
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
    
    if reaction_type not in ['UPVOTE', 'DOWNVOTE', 'HELPFUL', 'EXPERT', 'LAUGH', 'SURPRISED', 'ANGRY', 'SAD', 'FIRE', 'CLAP']:
        return jsonify({"error": "Invalid reaction type"}), 400
    
    try:
        # Convert UUID to string for database query
        comment_id_str = str(comment_id)
        
        existing_reaction = CommentReaction.query.filter_by(
            comment_id=comment_id_str, 
            user_id=request.user_id, 
            type=reaction_type
        ).first()
        
        if existing_reaction:
            db.session.delete(existing_reaction)
            action = "removed"
        else:
            # Only remove reactions of different types, not all reactions
            CommentReaction.query.filter_by(
                comment_id=comment_id_str, 
                user_id=request.user_id
            ).filter(CommentReaction.type != reaction_type).delete()
            
            new_reaction = CommentReaction(
                comment_id=comment_id_str,
                user_id=request.user_id,
                type=reaction_type
            )
            db.session.add(new_reaction)
            action = "added"
        
        db.session.commit()
        
        # Update discussion analytics
        comment = db.session.get(Comment, comment_id_str)
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
        # Convert UUID to string for database query
        post_id_str = str(post_id)
        analytics = DiscussionAnalytics.query.filter_by(post_id=post_id_str).first()
        if not analytics:
            # Create initial analytics if none exist
            analytics = DiscussionAnalytics(post_id=post_id_str)
            db.session.add(analytics)
            db.session.commit()
            update_discussion_analytics(post_id_str)
            analytics = DiscussionAnalytics.query.filter_by(post_id=post_id_str).first()
        
        return jsonify(analytics.to_dict()), 200
    except Exception as e:
        app.logger.error(f"Error getting discussion analytics: {e}")
        return jsonify({"error": "Failed to get discussion analytics"}), 500

def update_discussion_analytics(post_id):
    """Update discussion analytics for a post"""
    try:
        # post_id is already a string when called from other functions
        # but ensure it's a string for consistency
        post_id_str = str(post_id) if not isinstance(post_id, str) else post_id
        
        # Get or create analytics record
        analytics = DiscussionAnalytics.query.filter_by(post_id=post_id_str).first()
        if not analytics:
            analytics = DiscussionAnalytics(post_id=post_id_str)
            db.session.add(analytics)
        
        # Count comments and replies
        comments = Comment.query.filter_by(post_id=post_id_str, parent_comment_id=None).all()
        replies = Comment.query.filter_by(post_id=post_id_str).filter(Comment.parent_comment_id.isnot(None)).all()
        
        # Count reactions
        upvotes = CommentReaction.query.join(Comment).filter(
            Comment.post_id == post_id_str,
            CommentReaction.type == 'UPVOTE'
        ).count()
        
        downvotes = CommentReaction.query.join(Comment).filter(
            Comment.post_id == post_id_str,
            CommentReaction.type == 'DOWNVOTE'
        ).count()
        
        # Count expert participants
        expert_participants = db.session.query(User.id).join(Comment).filter(
            Comment.post_id == post_id_str,
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
        # Convert UUID to string for database query
        notification_id_str = str(notification_id)
        notification = Notification.query.filter_by(
            id=notification_id_str, 
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
    """
    Approve a pending user and change their role to NURSE.
    """
    try:
        # Convert UUID to string for database query
        user_id_str = str(user_id)
        
        user_to_approve = User.query.filter_by(id=user_id_str, role='PENDING').first()
        if not user_to_approve:
            return jsonify({"error": "User not found or not in PENDING status"}), 404
        
        user_to_approve.role = 'NURSE'
        db.session.commit()
        
        # Send approval notification email to the approved user
        try:
            send_approval_notification_email(user_to_approve.email, user_to_approve.name)
            app.logger.info(f"Approval notification email sent to {user_to_approve.email}")
        except Exception as email_error:
            app.logger.error(f"Failed to send approval email to {user_to_approve.email}: {email_error}")
            # Don't fail the approval if email fails, just log the error
        
        return jsonify({
            "message": f"User {user_to_approve.name} approved as NURSE. Approval email sent.",
            "user": user_to_approve.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error approving user: {e}")
        return jsonify({"error": "Failed to approve user"}), 500

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
        
        # Convert UUID to string for database query
        user_id_str = str(user_id)
        user = User.query.get(user_id_str)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        old_role = user.role
        user.role = new_role
        db.session.commit()
        
        # Send approval notification email if user was approved
        if old_role == 'PENDING' and new_role in ['NURSE', 'ADMIN']:
            try:
                send_approval_notification_email(user.email, user.name)
                app.logger.info(f"Approval notification email sent to {user.email}")
            except Exception as email_error:
                app.logger.error(f"Failed to send approval email to {user.email}: {email_error}")
                # Don't fail the role update if email fails, just log the error
        
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
        # Convert UUID to string for database query
        user_id_str = str(user_id)
        user = User.query.get(user_id_str)
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
        file_url, unique_filename = upload_to_storage(request.files['file'], 'resources')
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

@app.route('/api/admin/all-resources', methods=['GET'])
@role_required(['ADMIN'])
def get_all_resources():
    all_resources = Resource.query.order_by(Resource.created_at.desc()).all()
    return jsonify([resource.to_dict() for resource in all_resources]), 200

@app.route('/api/admin/approve-resource/<uuid:resource_id>', methods=['PUT'])
@role_required(['ADMIN'])
def approve_resource(resource_id):
    # Convert UUID to string for database query
    resource_id_str = str(resource_id)
    resource_to_approve = Resource.query.filter_by(id=resource_id_str, status='PENDING').first()
    if not resource_to_approve:
        return jsonify({"error": "Resource not found or not in PENDING status"}), 404
    resource_to_approve.status = 'APPROVED'
    resource_to_approve.rejection_reason = None  # Clear any previous rejection reason
    db.session.commit()
    return jsonify(resource_to_approve.to_dict()), 200

@app.route('/api/admin/reject-resource/<uuid:resource_id>', methods=['PUT'])
@role_required(['ADMIN'])
def reject_resource(resource_id):
    # Convert UUID to string for database query
    resource_id_str = str(resource_id)
    data = request.get_json()
    rejection_reason = data.get('rejectionReason', '') if data else ''
    
    resource_to_reject = Resource.query.filter_by(id=resource_id_str, status='PENDING').first()
    if not resource_to_reject:
        return jsonify({"error": "Resource not found or not in PENDING status"}), 404
    
    resource_to_reject.status = 'REJECTED'
    resource_to_reject.rejection_reason = rejection_reason
    db.session.commit()
    return jsonify(resource_to_reject.to_dict()), 200

@app.route('/api/admin/inactivate-resource/<uuid:resource_id>', methods=['PUT'])
@role_required(['ADMIN'])
def inactivate_resource(resource_id):
    # Convert UUID to string for database query
    resource_id_str = str(resource_id)
    
    resource_to_inactivate = Resource.query.filter_by(id=resource_id_str).first()
    if not resource_to_inactivate:
        return jsonify({"error": "Resource not found"}), 404
    
    resource_to_inactivate.status = 'INACTIVE'
    db.session.commit()
    return jsonify(resource_to_inactivate.to_dict()), 200

@app.route('/api/admin/reactivate-resource/<uuid:resource_id>', methods=['PUT'])
@role_required(['ADMIN'])
def reactivate_resource(resource_id):
    # Convert UUID to string for database query
    resource_id_str = str(resource_id)
    
    resource_to_reactivate = Resource.query.filter_by(id=resource_id_str).first()
    if not resource_to_reactivate:
        return jsonify({"error": "Resource not found"}), 404
    
    resource_to_reactivate.status = 'APPROVED'
    resource_to_reactivate.rejection_reason = None  # Clear any rejection reason
    db.session.commit()
    return jsonify(resource_to_reactivate.to_dict()), 200

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
        file_url, unique_filename = upload_to_storage(request.files['file'], 'resources')
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
            cleanup_storage_file(file_filename, 'resources')
        
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

@app.route('/api/public/blogs', methods=['GET'])
def get_public_blogs():
    """Public endpoint to get approved blogs without authentication"""
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
        cover_image_url, unique_filename = upload_to_storage(request.files['coverImage'], 'blogs')
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

@app.route('/api/admin/all-blogs', methods=['GET'])
@role_required(['ADMIN'])
def get_all_blogs():
    all_blogs = Blog.query.order_by(Blog.created_at.desc()).all()
    return jsonify([blog.to_dict() for blog in all_blogs]), 200

@app.route('/api/admin/approve-blog/<uuid:blog_id>', methods=['PUT'])
@role_required(['ADMIN'])
def approve_blog(blog_id):
    # Convert UUID to string for database query
    blog_id_str = str(blog_id)
    blog_to_approve = Blog.query.filter_by(id=blog_id_str, status='PENDING').first()
    if not blog_to_approve:
        return jsonify({"error": "Blog not found or not in PENDING status"}), 404
    blog_to_approve.status = 'APPROVED'
    blog_to_approve.rejection_reason = None  # Clear any previous rejection reason
    db.session.commit()
    return jsonify(blog_to_approve.to_dict()), 200

@app.route('/api/admin/reject-blog/<uuid:blog_id>', methods=['PUT'])
@role_required(['ADMIN'])
def reject_blog(blog_id):
    # Convert UUID to string for database query
    blog_id_str = str(blog_id)
    data = request.get_json()
    rejection_reason = data.get('rejectionReason', '') if data else ''
    
    blog_to_reject = Blog.query.filter_by(id=blog_id_str, status='PENDING').first()
    if not blog_to_reject:
        return jsonify({"error": "Blog not found or not in PENDING status"}), 404
    
    blog_to_reject.status = 'REJECTED'
    blog_to_reject.rejection_reason = rejection_reason
    db.session.commit()
    return jsonify(blog_to_reject.to_dict()), 200

@app.route('/api/admin/inactivate-blog/<uuid:blog_id>', methods=['PUT'])
@role_required(['ADMIN'])
def inactivate_blog(blog_id):
    # Convert UUID to string for database query
    blog_id_str = str(blog_id)
    
    blog_to_inactivate = Blog.query.filter_by(id=blog_id_str).first()
    if not blog_to_inactivate:
        return jsonify({"error": "Blog not found"}), 404
    
    blog_to_inactivate.status = 'INACTIVE'
    db.session.commit()
    return jsonify(blog_to_inactivate.to_dict()), 200

@app.route('/api/admin/reactivate-blog/<uuid:blog_id>', methods=['PUT'])
@role_required(['ADMIN'])
def reactivate_blog(blog_id):
    # Convert UUID to string for database query
    blog_id_str = str(blog_id)
    
    blog_to_reactivate = Blog.query.filter_by(id=blog_id_str).first()
    if not blog_to_reactivate:
        return jsonify({"error": "Blog not found"}), 404
    
    blog_to_reactivate.status = 'APPROVED'
    blog_to_reactivate.rejection_reason = None  # Clear any rejection reason
    db.session.commit()
    return jsonify(blog_to_reactivate.to_dict()), 200

# --- New Blog Editor Endpoints ---

@app.route('/api/blogs/image', methods=['POST'])
@role_required(['NURSE', 'ADMIN'])
def upload_blog_image():
    if 'imageFile' not in request.files or not request.files['imageFile'].filename:
        return jsonify({"error": "Image file is required"}), 400
    
    image_file = request.files['imageFile']
    
    # Upload the image to the blogs folder
    image_url, unique_filename = upload_to_storage(image_file, 'blogs')
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
        cover_image_url, unique_filename = upload_to_storage(request.files['coverImage'], 'blogs')
        if not cover_image_url:
            return jsonify({"error": "Failed to upload cover image"}), 500
        
        # If there was a previous cover image, clean it up
        if blog.cover_image_url:
            old_filename = blog.cover_image_url.split('/')[-1]  # Extract filename from URL
            cleanup_storage_file(old_filename, 'blogs')
        
        blog.cover_image_url = cover_image_url
    
    try:
        db.session.commit()
        return jsonify(blog.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        if unique_filename: cleanup_storage_file(unique_filename, 'blogs')
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
            cleanup_storage_file(cover_filename, 'blogs')
        
        # Delete the blog record
        db.session.delete(blog)
        db.session.commit()
        
        return jsonify({"message": "Blog deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting blog: {e}")
        return jsonify({"error": "Failed to delete blog"}), 500

# --- FEEDBACK ENDPOINTS ---

@app.route('/api/feedbacks', methods=['POST'])
@authenticated_only
def create_feedback():
    """Create a new feedback entry"""
    data = request.get_json()
    
    if not data or not data.get('content') or not data.get('rating'):
        return jsonify({"error": "Content and rating are required"}), 400
    
    rating = data.get('rating')
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400
    
    try:
        new_feedback = Feedback(
            user_id=request.user_id,
            content=data.get('content'),
            rating=rating
        )
        
        db.session.add(new_feedback)
        db.session.commit()
        
        return jsonify(new_feedback.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating feedback: {e}")
        return jsonify({"error": "Failed to create feedback"}), 500

@app.route('/api/public/feedbacks', methods=['GET'])
def get_public_feedbacks():
    """Get approved feedbacks for public display (testimonials)"""
    try:
        feedbacks = Feedback.query.filter_by(status='APPROVED').order_by(Feedback.created_at.desc()).limit(10).all()
        return jsonify([feedback.to_dict() for feedback in feedbacks]), 200
    except Exception as e:
        app.logger.error(f"Error fetching public feedbacks: {e}")
        return jsonify({"error": "Failed to fetch feedbacks"}), 500

@app.route('/api/feedbacks', methods=['GET'])
@authenticated_only
def get_user_feedbacks():
    """Get feedbacks for the authenticated user"""
    try:
        feedbacks = Feedback.query.filter_by(user_id=request.user_id).order_by(Feedback.created_at.desc()).all()
        return jsonify([feedback.to_dict() for feedback in feedbacks]), 200
    except Exception as e:
        app.logger.error(f"Error fetching user feedbacks: {e}")
        return jsonify({"error": "Failed to fetch feedbacks"}), 500

@app.route('/api/admin/feedbacks', methods=['GET'])
@role_required(['ADMIN'])
def get_all_feedbacks():
    """Get all feedbacks for admin review"""
    try:
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
        app.logger.info(f"Returning {len(feedbacks)} feedbacks to admin")
        for fb in feedbacks:
            app.logger.info(f"Feedback ID: {fb.id}, Status: {fb.status}, Author: {fb.author.name if fb.author else 'Unknown'}")
        return jsonify([feedback.to_dict() for feedback in feedbacks]), 200
    except Exception as e:
        app.logger.error(f"Error fetching all feedbacks: {e}")
        return jsonify({"error": "Failed to fetch feedbacks"}), 500

@app.route('/api/admin/feedbacks/<string:feedback_id>', methods=['PUT'])
@role_required(['ADMIN'])
def update_feedback_status(feedback_id):
    """Update feedback status (approve/reject)"""
    data = request.get_json()
    status = data.get('status')
    
    # Debug logging
    app.logger.info(f"Attempting to update feedback ID: {feedback_id}")
    app.logger.info(f"Requested status: {status}")
    
    if status not in ['APPROVED', 'REJECTED', 'PENDING']:
        return jsonify({"error": "Invalid status. Must be APPROVED, REJECTED, or PENDING"}), 400
    
    try:
        # Debug: Check all feedback IDs in database
        all_feedbacks = Feedback.query.all()
        app.logger.info(f"Total feedbacks in database: {len(all_feedbacks)}")
        for fb in all_feedbacks:
            app.logger.info(f"Feedback ID in DB: {fb.id}, Status: {fb.status}")
        
        app.logger.info(f"Searching for feedback with ID: {feedback_id}")
        
        feedback = Feedback.query.filter_by(id=feedback_id).first()
        if not feedback:
            app.logger.warning(f"Feedback with ID {feedback_id} not found in database")
            return jsonify({"error": "Feedback not found"}), 404
        
        app.logger.info(f"Found feedback: {feedback.id}, current status: {feedback.status}")
        feedback.status = status
        db.session.commit()
        
        app.logger.info(f"Successfully updated feedback {feedback.id} to status: {status}")
        return jsonify(feedback.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating feedback status: {e}")
        return jsonify({"error": "Failed to update feedback status"}), 500

# --- EMAIL TEST ENDPOINT ---

@app.route('/api/test-email', methods=['POST'])
@role_required(['ADMIN'])
def test_email():
    """Test email functionality"""
    data = request.get_json()
    test_email_address = data.get('email')
    
    if not test_email_address:
        return jsonify({"error": "Email address is required"}), 400
    
    subject = "PulseLoopCare Email Test"
    body = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #14B8A6, #0D9488); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Email Test Successful!</h1>
                <p>PulseLoopCare Email Configuration</p>
            </div>
            <div class="content">
                <div class="success">
                    <strong>Congratulations!</strong> Your email configuration is working correctly.
                </div>
                <h2>Email Configuration Details:</h2>
                <ul>
                    <li><strong>SMTP Server:</strong> smtp.hostinger.com</li>
                    <li><strong>Port:</strong> 465</li>
                    <li><strong>Encryption:</strong> SSL</li>
                    <li><strong>From Address:</strong> admin@pulseloopcare.com</li>
                </ul>
                <p>Your PulseLoopCare application can now send emails for:</p>
                <ul>
                    <li>User invitations</li>
                    <li>Password reset requests</li>
                    <li>System notifications</li>
                    <li>Admin communications</li>
                </ul>
                <p>This test was sent at: {}</p>
                <p><strong>Frontend URL:</strong> {FRONTEND_URL}</p>
            </div>
        </div>
    </body>
    </html>
    """.format(datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"))
    
    success = send_email(test_email_address, subject, body, is_html=True)
    
    if success:
        return jsonify({"message": "Test email sent successfully!"}), 200
    else:
        return jsonify({"error": "Failed to send test email. Check your email configuration."}), 500

# --- IMAGE UPLOAD ENDPOINTS ---


@app.route('/api/upload-image', methods=['POST'])
@role_required(['ADMIN'])
def upload_image():
    """Upload an image file and return the URL"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Generate unique filename
            unique_filename = f"{uuid.uuid4()}_{filename}"
            
            # Create uploads directory if it doesn't exist
            upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'broadcasts')
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            # Return the URL path
            image_url = f"/uploads/broadcasts/{unique_filename}"
            return jsonify({"imageUrl": image_url}), 200
        else:
            return jsonify({"error": "Invalid file type. Only images are allowed."}), 400
            
    except Exception as e:
        app.logger.error(f"Error uploading image: {e}")
        return jsonify({"error": "Failed to upload image"}), 500

@app.route('/api/upload-media', methods=['POST'])
@authenticated_only
def upload_media():
    """Upload media files (images/videos) for content creation"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
    
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if file and allowed_file(file.filename):
            # Get file extension
            file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            # Create a safe filename with UUID and extension only
            unique_filename = f"{uuid.uuid4()}.{file_ext}"
            
            # Create media directory if it doesn't exist
            media_dir = os.path.join(UPLOAD_FOLDER, 'media')
            os.makedirs(media_dir, exist_ok=True)
            
            file_path = os.path.join(media_dir, unique_filename)
            
            # Debug logging
            app.logger.info(f"Saving file to: {file_path}")
            app.logger.info(f"Media directory exists: {os.path.exists(media_dir)}")
            
            file.save(file_path)
            
            # Verify file was saved
            if os.path.exists(file_path):
                media_url = f"/uploads/media/{unique_filename}"
                app.logger.info(f"File saved successfully: {media_url}")
                return jsonify({"imageUrl": media_url}), 200
            else:
                app.logger.error(f"File was not saved to: {file_path}")
                return jsonify({"error": "Failed to save file"}), 500
        else:
            return jsonify({"error": "Invalid file type. Allowed: images, videos, documents"}), 400
    except Exception as e:
        app.logger.error(f"Error uploading media: {e}")
        return jsonify({"error": "Failed to upload media"}), 500

# --- ADMIN POSTS MANAGEMENT ---

@app.route('/api/admin/posts', methods=['GET'])
@role_required(['ADMIN'])
def get_all_posts():
    """Get all posts for admin management"""
    try:
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return jsonify([post.to_dict_feed() for post in posts]), 200
    except Exception as e:
        app.logger.error(f"Error fetching all posts: {e}")
        return jsonify({"error": "Failed to fetch posts"}), 500

@app.route('/api/admin/posts/<uuid:post_id>', methods=['DELETE'])
@role_required(['ADMIN'])
def admin_delete_post(post_id):
    """Delete any post (admin only)"""
    try:
        post_id_str = str(post_id)
        post = Post.query.get(post_id_str)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Delete associated reactions and comments
        Reaction.query.filter_by(post_id=post_id_str).delete()
        Comment.query.filter_by(post_id=post_id_str).delete()
        
        # Delete the post
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({"message": "Post deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting post: {e}")
        return jsonify({"error": "Failed to delete post"}), 500

# --- BROADCAST MESSAGE ENDPOINTS ---

@app.route('/api/broadcast-messages', methods=['GET'])
def get_active_broadcast_message():
    """Get the currently active and visible broadcast message for the landing page"""
    try:
        # Get the most recent active and visible broadcast message
        broadcast_message = BroadcastMessage.query.filter_by(
            is_active=True, 
            is_visible=True
        ).order_by(BroadcastMessage.created_at.desc()).first()
        
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
    """Create a new broadcast message with optional image"""
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
            image_url=data.get('imageUrl'),  # Optional image URL
            created_by=request.user_id,
            is_active=True,
            is_visible=True  # Default to visible
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
        # Convert UUID to string for database query
        message_id_str = str(message_id)
        message = BroadcastMessage.query.get(message_id_str)
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
        if 'imageUrl' in data:
            message.image_url = data['imageUrl']
        if 'is_active' in data:
            # If activating this message, deactivate all others
            if data['is_active']:
                BroadcastMessage.query.filter(BroadcastMessage.id != message_id).update({"is_active": False})
            message.is_active = data['is_active']
        if 'is_visible' in data:
            message.is_visible = data['is_visible']
        
        db.session.commit()
        return jsonify(message.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating broadcast message: {e}")
        return jsonify({"error": "Failed to update broadcast message"}), 500

@app.route('/api/admin/broadcast-messages/<uuid:message_id>/toggle-visibility', methods=['PUT'])
@role_required(['ADMIN'])
def toggle_broadcast_message_visibility(message_id):
    """Toggle the visibility of a broadcast message"""
    try:
        # Convert UUID to string for database query
        message_id_str = str(message_id)
        message = BroadcastMessage.query.get(message_id_str)
        if not message:
            return jsonify({"error": "Broadcast message not found"}), 404
        
        # Toggle visibility
        message.is_visible = not message.is_visible
        db.session.commit()
        
        return jsonify({
            "message": "Visibility toggled successfully",
            "isVisible": message.is_visible
        }), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error toggling broadcast message visibility: {e}")
        return jsonify({"error": "Failed to toggle visibility"}), 500

@app.route('/api/admin/broadcast-messages/<uuid:message_id>', methods=['DELETE'])
@role_required(['ADMIN'])
def delete_broadcast_message(message_id):
    """Delete a broadcast message"""
    try:
        # Convert UUID to string for database query
        message_id_str = str(message_id)
        message = BroadcastMessage.query.get(message_id_str)
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
    # Update this message to reflect the database type
    if 'mysql' in DB_CONNECTION_STRING:
        print("🗄️ Database: MySQL")
    elif 'postgresql' in DB_CONNECTION_STRING:
        print("🗄️ Database: PostgreSQL")
    else:
        print("🗄️ Database: Unknown")
    print(f"🌐 Server: http://localhost:5000")
    print("=" * 60)
    
    socketio.run(app, debug=True, port=5000)