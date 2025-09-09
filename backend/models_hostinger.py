import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, String, Text
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(Text, nullable=False)
    email = db.Column(Text, unique=True, nullable=False)
    role = db.Column(Text, nullable=False, default='PENDING')
    avatar_url = db.Column(Text)
    title = db.Column(Text)  # e.g., "PA", "RN", "NP"
    state = db.Column(Text)  # e.g., "CA", "NY", "TX"
    department = db.Column(Text)  # e.g., "Cardiology", "Intensive Care Unit"
    bio = db.Column(Text)  # User biography
    invited_by_user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    expertise_level = db.Column(Text, nullable=False, default='BEGINNER')  # BEGINNER, INTERMEDIATE, EXPERT
    expertise_areas = db.Column(Text, nullable=False, default='[]')  # JSON string of expertise areas
    discussion_contribution_score = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    posts = db.relationship('Post', backref='author', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='user', lazy=True, cascade="all, delete-orphan")
    resources = db.relationship('Resource', backref='author', lazy=True, cascade="all, delete-orphan")
    blogs = db.relationship('Blog', backref='author', lazy=True, cascade="all, delete-orphan")
    invitations_sent = db.relationship('Invitation', backref='inviter', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "avatarUrl": self.avatar_url,
            "title": self.title,
            "state": self.state,
            "department": self.department,
            "bio": self.bio,
            "invitedByUserId": self.invited_by_user_id,
            "expertiseLevel": self.expertise_level,
            "expertiseAreas": json.loads(self.expertise_areas) if self.expertise_areas else [],
            "discussionContributionScore": self.discussion_contribution_score,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

    def calculate_profile_completion_percentage(self):
        fields_to_check = [
            self.title,
            self.department,
            self.state,
            self.bio
        ]
        completed_fields = sum(1 for field in fields_to_check if field and str(field).strip())
        return int((completed_fields / 4) * 100)

class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(Text, nullable=False)
    media_url = db.Column(Text)
    media_type = db.Column(Text)  # 'image' or 'video'
    display_name = db.Column(Text, nullable=False)
    tags = db.Column(Text, nullable=False, default='[]')  # JSON string of tags
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    comments = db.relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='post', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "authorId": self.author_id,
            "text": self.text,
            "mediaUrl": self.media_url,
            "mediaType": self.media_type,
            "displayName": self.display_name,
            "tags": json.loads(self.tags) if self.tags else [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "author": self.author.to_dict() if self.author else None
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(String(36), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(Text, nullable=False)
    display_name = db.Column(Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    reactions = db.relationship('CommentReaction', backref='comment', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "postId": self.post_id,
            "authorId": self.author_id,
            "text": self.text,
            "displayName": self.display_name,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "author": self.author.to_dict() if self.author else None
        }

class Reaction(db.Model):
    __tablename__ = 'reactions'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = db.Column(String(36), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reaction_type = db.Column(Text, nullable=False)  # 'like', 'support', 'insightful'
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "postId": self.post_id,
            "userId": self.user_id,
            "reactionType": self.reaction_type,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

class CommentReaction(db.Model):
    __tablename__ = 'comment_reactions'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comment_id = db.Column(String(36), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reaction_type = db.Column(Text, nullable=False)  # 'like', 'support', 'insightful'
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "commentId": self.comment_id,
            "userId": self.user_id,
            "reactionType": self.reaction_type,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

class Resource(db.Model):
    __tablename__ = 'resources'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(Text, nullable=False)
    description = db.Column(Text)
    author_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(Text, nullable=False)  # 'FILE', 'LINK', 'TEXT'
    content = db.Column(Text)
    file_url = db.Column(Text)
    status = db.Column(Text, nullable=False, default='PENDING')  # 'PENDING', 'APPROVED'
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "authorId": self.author_id,
            "type": self.type,
            "content": self.content,
            "fileUrl": self.file_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "author": self.author.to_dict() if self.author else None
        }

class Blog(db.Model):
    __tablename__ = 'blogs'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(Text, nullable=False)
    content = db.Column(Text, nullable=False)
    author_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    cover_image_url = db.Column(Text)
    status = db.Column(Text, nullable=False, default='PENDING')  # 'PENDING', 'APPROVED'
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "authorId": self.author_id,
            "coverImageUrl": self.cover_image_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "author": self.author.to_dict() if self.author else None
        }

class Invitation(db.Model):
    __tablename__ = 'invitations'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inviter_user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    email = db.Column(Text, nullable=False)
    token = db.Column(Text, unique=True, nullable=False)
    status = db.Column(Text, nullable=False, default='PENDING')  # 'PENDING', 'ACCEPTED', 'EXPIRED'
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "inviterUserId": self.inviter_user_id,
            "email": self.email,
            "token": self.token,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

class DiscussionAnalytics(db.Model):
    __tablename__ = 'discussion_analytics'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    posts_count = db.Column(db.Integer, nullable=False, default=0)
    comments_count = db.Column(db.Integer, nullable=False, default=0)
    reactions_received = db.Column(db.Integer, nullable=False, default=0)
    last_activity = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "postsCount": self.posts_count,
            "commentsCount": self.comments_count,
            "reactionsReceived": self.reactions_received,
            "lastActivity": self.last_activity.isoformat() if self.last_activity else None
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(Text, nullable=False)  # 'POST_REACTION', 'COMMENT', 'INVITATION', etc.
    title = db.Column(Text, nullable=False)
    message = db.Column(Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "isRead": self.is_read,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
