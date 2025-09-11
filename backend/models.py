import uuid
import json
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()

# A simple, reusable function to generate UUID strings for MySQL compatibility.
def generate_uuid_str():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    name = db.Column(db.Text, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False) # Use String for better indexing
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='PENDING')
    avatar_url = db.Column(db.Text)
    title = db.Column(db.Text)
    state = db.Column(db.Text)
    department = db.Column(db.Text)
    bio = db.Column(db.Text)
    invited_by_user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    expertise_level = db.Column(db.String(50), nullable=False, default='BEGINNER')
    expertise_areas = db.Column(db.Text, nullable=False, default='[]')  # Stored as a JSON string
    discussion_contribution_score = db.Column(db.Float, nullable=False, default=0.0)

    # Relationships
    posts = db.relationship('Post', backref='author', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='user', lazy=True, cascade="all, delete-orphan")
    resources = db.relationship('Resource', backref='author', lazy=True, cascade="all, delete-orphan")
    blogs = db.relationship('Blog', backref='author', lazy=True, cascade="all, delete-orphan")
    sent_invitations = db.relationship('Invitation', backref='inviter', lazy=True, foreign_keys='Invitation.inviter_user_id', cascade="all, delete-orphan")
    invited_by = db.relationship('User', backref='invited_users', remote_side=[id], foreign_keys=[invited_by_user_id])
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")
    broadcast_messages = db.relationship('BroadcastMessage', backref='creator', lazy=True)
    comments = db.relationship('Comment', backref='author', lazy=True)

    def calculate_profile_completion_percentage(self):
        fields_to_check = [self.title, self.department, self.state, self.bio]
        completed_fields = sum(1 for field in fields_to_check if field and str(field).strip())
        return int((completed_fields / 4) * 100)

    def to_dict(self):
        return {
            "id": str(self.id), "name": self.name, "email": self.email, "role": self.role,
            "avatarUrl": self.avatar_url, "title": self.title, "state": self.state,
            "department": self.department, "bio": self.bio,
            "profileCompletionPercentage": self.calculate_profile_completion_percentage()
        }

class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    author_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    media_url = db.Column(db.Text)
    media_type = db.Column(db.Text)
    display_name = db.Column(db.Text, nullable=False)
    tags = db.Column(db.Text, nullable=False, default='[]') # Stored as a JSON string
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    comments = db.relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='post', lazy=True, cascade="all, delete-orphan")

    @property
    def tags_list(self):
        """Convert tags JSON string to list"""
        try:
            return json.loads(self.tags or '[]')
        except (json.JSONDecodeError, TypeError):
            return []
    
    @tags_list.setter
    def tags_list(self, value):
        """Convert list to tags JSON string"""
        if isinstance(value, list):
            self.tags = json.dumps(value)
        else:
            self.tags = '[]'

    def to_dict(self, include_comments=False, include_reactions=False):
        result = {
            "id": str(self.id), "authorId": str(self.author_id), "text": self.text, "mediaUrl": self.media_url,
            "mediaType": self.media_type, "displayName": self.display_name, "createdAt": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None, "tags": json.loads(self.tags or '[]'),
            "commentCount": len(self.comments), "reactionCount": len(self.reactions)
        }
        if include_comments:
            result["comments"] = [comment.to_dict() for comment in (self.comments or [])]
        if include_reactions:
            result["reactions"] = [reaction.to_dict() for reaction in (self.reactions or [])]
        return result

    def to_dict_detailed(self):
        return self.to_dict(include_comments=True, include_reactions=True)
    
    def to_dict_feed(self):
        """Optimized method for feed display - minimal data for performance"""
        return {
            "id": str(self.id), 
            "authorId": str(self.author_id), 
            "text": self.text, 
            "mediaUrl": self.media_url,
            "mediaType": self.media_type, 
            "displayName": self.display_name, 
            "createdAt": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None, 
            "tags": json.loads(self.tags or '[]'),
            "commentCount": len(self.comments), 
            "reactionCount": len(self.reactions),
            "reactions": [reaction.to_dict() for reaction in (self.reactions or [])],
            "comments": [comment.to_dict() for comment in (self.comments or [])]
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    post_id = db.Column(db.CHAR(36), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_comment_id = db.Column(db.CHAR(36), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    parent_comment = db.relationship('Comment', backref='replies', remote_side=[id])
    reactions = db.relationship('CommentReaction', backref='comment', cascade="all, delete-orphan")

    def to_dict(self):
        # Calculate reaction counts by type
        reaction_counts = {}
        for reaction in (self.reactions or []):
            reaction_type = reaction.type
            reaction_counts[reaction_type] = reaction_counts.get(reaction_type, 0) + 1
        
        return {
            "id": str(self.id), 
            "postId": str(self.post_id), 
            "authorId": str(self.author_id),
            "parentCommentId": str(self.parent_comment_id) if self.parent_comment_id else None,
            "text": self.text, 
            "createdAt": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None,
            "replyCount": len(self.replies) if self.replies else 0,
            "replies": [reply.to_dict() for reply in (self.replies or [])],
            "reactionCounts": reaction_counts,
            "reactions": [reaction.to_dict() for reaction in (self.reactions or [])]
        }

class Reaction(db.Model):
    __tablename__ = 'reactions'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    post_id = db.Column(db.CHAR(36), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='uq_user_post_reaction'),)
    def to_dict(self):
        return { "id": str(self.id), "postId": str(self.post_id), "userId": str(self.user_id), "type": self.type }

class CommentReaction(db.Model):
    __tablename__ = 'comment_reactions'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    comment_id = db.Column(db.CHAR(36), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    __table_args__ = (db.UniqueConstraint('comment_id', 'user_id', 'type', name='uq_comment_user_reaction_type'),)
    def to_dict(self):
        return { "id": str(self.id), "commentId": str(self.comment_id), "userId": str(self.user_id), "type": self.type }

class DiscussionAnalytics(db.Model):
    __tablename__ = 'discussion_analytics'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    post_id = db.Column(db.CHAR(36), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False, unique=True)
    total_comments = db.Column(db.Integer, nullable=False, default=0)
    total_replies = db.Column(db.Integer, nullable=False, default=0)
    total_upvotes = db.Column(db.Integer, nullable=False, default=0)
    total_downvotes = db.Column(db.Integer, nullable=False, default=0)
    expert_participants = db.Column(db.Integer, nullable=False, default=0)
    discussion_score = db.Column(db.Float, nullable=False, default=0.0)
    last_activity = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "postId": str(self.post_id),
            "totalComments": self.total_comments,
            "totalReplies": self.total_replies,
            "totalUpvotes": self.total_upvotes,
            "totalDownvotes": self.total_downvotes,
            "expertParticipants": self.expert_participants,
            "discussionScore": self.discussion_score,
            "lastActivity": self.last_activity.isoformat(),
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON, nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "data": self.data or {},
            "isRead": self.is_read,
            "createdAt": self.created_at.isoformat()
        }

class BroadcastMessage(db.Model):
    __tablename__ = 'broadcast_messages'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    title = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "message": self.message,
            "isActive": self.is_active,
            "createdBy": str(self.created_by),
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "creator": self.creator.to_dict() if self.creator else None
        }

class Resource(db.Model):
    __tablename__ = 'resources'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    author_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text)
    file_url = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id), "title": self.title, "description": self.description, "authorId": str(self.author_id),
            "type": self.type, "content": self.content, "fileUrl": self.file_url, "status": self.status,
            "created_at": self.created_at.isoformat(), "author": self.author.to_dict() if self.author else None
        }

class Blog(db.Model):
    __tablename__ = 'blogs'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    author_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    cover_image_url = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id), "title": self.title, "content": self.content, "authorId": str(self.author_id),
            "coverImageUrl": self.cover_image_url, "status": self.status, "created_at": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None
        }

class Invitation(db.Model):
    __tablename__ = 'invitations'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    inviter_user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    invitee_email = db.Column(db.String(255), nullable=False, index=True)
    # KEY CHANGE: Using String(255) instead of Text allows it to be indexed in MySQL. This fixes your error.
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    accepted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id), "inviterUserId": str(self.inviter_user_id), "inviteeEmail": self.invitee_email,
            "token": self.token, "status": self.status, "createdAt": self.created_at.isoformat(),
            "acceptedAt": self.accepted_at.isoformat() if self.accepted_at else None,
            "inviter": self.inviter.to_dict() if self.inviter else None
        }

class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "token": self.token,
            "expiresAt": self.expires_at.isoformat(),
            "used": self.used,
            "createdAt": self.created_at.isoformat()
        }