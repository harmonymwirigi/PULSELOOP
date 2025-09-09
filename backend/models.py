import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import text

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(UUID(as_uuid=True), primary_key=True) 
    name = db.Column(db.Text, nullable=False)
    email = db.Column(db.Text, unique=True, nullable=False)
    role = db.Column(db.Text, nullable=False, default='PENDING')
    avatar_url = db.Column(db.Text)
    title = db.Column(db.Text)  # e.g., "PA", "RN", "NP"
    state = db.Column(db.Text)  # e.g., "CA", "NY", "TX"
    department = db.Column(db.Text)  # e.g., "Cardiology", "Intensive Care Unit"
    bio = db.Column(db.Text)  # User biography
    invited_by_user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    expertise_level = db.Column(db.Text, nullable=False, server_default='BEGINNER')  # BEGINNER, INTERMEDIATE, EXPERT
    expertise_areas = db.Column(ARRAY(db.Text), nullable=False, server_default='{}')  # Array of expertise areas
    discussion_contribution_score = db.Column(db.Float, nullable=False, server_default='0.0')

    posts = db.relationship('Post', backref='author', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='user', lazy=True, cascade="all, delete-orphan")
    
    # --- ADDED RELATIONSHIPS ---
    resources = db.relationship('Resource', backref='author', lazy=True, cascade="all, delete-orphan")
    blogs = db.relationship('Blog', backref='author', lazy=True, cascade="all, delete-orphan")
    
    # Invitation relationships
    sent_invitations = db.relationship('Invitation', backref='inviter', lazy=True, foreign_keys='Invitation.inviter_user_id', cascade="all, delete-orphan")
    invited_by = db.relationship('User', backref='invited_users', remote_side=[id], foreign_keys=[invited_by_user_id])

    def calculate_profile_completion_percentage(self):
        """
        Calculate profile completion percentage based on 4 key fields (excluding avatar).
        Each field adds 25% to the score.
        """
        fields_to_check = [
            self.title,
            self.department,
            self.state,
            self.bio
        ]
        
        completed_fields = sum(1 for field in fields_to_check if field and str(field).strip())
        return int((completed_fields / 4) * 100)

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "avatarUrl": self.avatar_url,
            "title": self.title,
            "state": self.state,
            "department": self.department,
            "bio": self.bio,
            "profileCompletionPercentage": self.calculate_profile_completion_percentage()
        }

class Post(db.Model):
    __tablename__ = 'posts'
    # ... (no changes to this model) ...
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    media_url = db.Column(db.Text)
    media_type = db.Column(db.Text)
    display_name = db.Column(db.Text, nullable=False)  # Generated display name based on user preference
    tags = db.Column(ARRAY(db.Text), nullable=False, server_default='{}')  # Array of tags
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    comments = db.relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")
    reactions = db.relationship('Reaction', backref='post', lazy=True, cascade="all, delete-orphan")
    def to_dict(self, include_comments=True, include_reactions=True):
        result = { 
            "id": str(self.id), 
            "authorId": str(self.author_id), 
            "text": self.text, 
            "mediaUrl": self.media_url, 
            "mediaType": self.media_type, 
            "displayName": self.display_name,
            "createdAt": self.created_at.isoformat(), 
            "author": self.author.to_dict() if self.author else None, 
            "tags": self.tags or [],  # Return actual tags array or empty array
        }
        
        # Only include comments and reactions if requested (for performance)
        if include_comments:
            result["comments"] = [comment.to_dict() for comment in (self.comments or [])]
        else:
            result["comments"] = []
            
        if include_reactions:
            result["reactions"] = [reaction.to_dict() for reaction in (self.reactions or [])]
        else:
            result["reactions"] = []
            
        return result

class Comment(db.Model):
    __tablename__ = 'comments'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    post_id = db.Column(UUID(as_uuid=True), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_comment_id = db.Column(UUID(as_uuid=True), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    # Relationships
    author = db.relationship('User', backref='comments')
    parent_comment = db.relationship('Comment', backref='replies', remote_side=[id])
    reactions = db.relationship('CommentReaction', backref='comment', cascade="all, delete-orphan")
    
    def to_dict(self, include_replies=True, include_reactions=True):
        result = {
            "id": str(self.id),
            "postId": str(self.post_id),
            "authorId": str(self.author_id),
            "parentCommentId": str(self.parent_comment_id) if self.parent_comment_id else None,
            "text": self.text,
            "createdAt": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None,
            "depth": self.get_depth(),
            "replyCount": len(self.replies) if self.replies else 0
        }
        
        if include_reactions:
            result["reactions"] = [reaction.to_dict() for reaction in (self.reactions or [])]
            result["reactionCounts"] = self.get_reaction_counts()
        else:
            result["reactions"] = []
            result["reactionCounts"] = {}
            
        if include_replies:
            result["replies"] = [reply.to_dict(include_replies=False, include_reactions=include_reactions) for reply in (self.replies or [])]
        else:
            result["replies"] = []
            
        return result
    
    def get_depth(self):
        """Calculate comment depth in thread"""
        depth = 0
        current = self.parent_comment
        while current:
            depth += 1
            current = current.parent_comment
            if depth > 10:  # Prevent infinite loops
                break
        return depth
    
    def get_reaction_counts(self):
        """Get aggregated reaction counts"""
        counts = {}
        for reaction in self.reactions:
            counts[reaction.type] = counts.get(reaction.type, 0) + 1
        return counts

class Reaction(db.Model):
    __tablename__ = 'reactions'
    # ... (no changes to this model) ...
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    post_id = db.Column(UUID(as_uuid=True), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='uq_user_post_reaction'),)
    def to_dict(self):
        return { "id": str(self.id), "postId": str(self.post_id), "userId": str(self.user_id), "type": self.type }

# --- NEW MODELS ADDED BELOW ---

class CommentReaction(db.Model):
    __tablename__ = 'comment_reactions'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    comment_id = db.Column(UUID(as_uuid=True), db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Text, nullable=False)  # 'UPVOTE', 'DOWNVOTE', 'HELPFUL', 'EXPERT'
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    __table_args__ = (db.UniqueConstraint('comment_id', 'user_id', 'type', name='uq_comment_user_reaction_type'),)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "commentId": str(self.comment_id),
            "userId": str(self.user_id),
            "type": self.type,
            "createdAt": self.created_at.isoformat()
        }

class DiscussionAnalytics(db.Model):
    __tablename__ = 'discussion_analytics'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    post_id = db.Column(UUID(as_uuid=True), db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False, unique=True)
    total_comments = db.Column(db.Integer, nullable=False, server_default='0')
    total_replies = db.Column(db.Integer, nullable=False, server_default='0')
    total_upvotes = db.Column(db.Integer, nullable=False, server_default='0')
    total_downvotes = db.Column(db.Integer, nullable=False, server_default='0')
    expert_participants = db.Column(db.Integer, nullable=False, server_default='0')
    discussion_score = db.Column(db.Float, nullable=False, server_default='0.0')
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
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Text, nullable=False)  # 'COMMENT_REPLY', 'POST_REACTION', 'MENTION', 'EXPERT_RESPONSE'
    title = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON, nullable=True)  # Additional data like post_id, comment_id, etc.
    is_read = db.Column(db.Boolean, nullable=False, server_default='false')
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    # Relationships
    user = db.relationship('User', backref='notifications')
    
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

class Resource(db.Model):
    __tablename__ = 'resources'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.Text, nullable=False) # 'FILE', 'LINK', 'TEXT'
    content = db.Column(db.Text)
    file_url = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, server_default='PENDING') # 'PENDING', 'APPROVED'
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "authorId": str(self.author_id),
            "type": self.type,
            "content": self.content,
            "fileUrl": self.file_url,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None
        }

class Blog(db.Model):
    __tablename__ = 'blogs'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    cover_image_url = db.Column(db.Text)
    status = db.Column(db.Text, nullable=False, server_default='PENDING') # 'PENDING', 'APPROVED'
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "content": self.content,
            "authorId": str(self.author_id),
            "coverImageUrl": self.cover_image_url,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "author": self.author.to_dict() if self.author else None
        }

class Invitation(db.Model):
    __tablename__ = 'invitations'
    id = db.Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    inviter_user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    invitee_email = db.Column(db.Text, nullable=False, index=True)
    token = db.Column(db.Text, nullable=False, unique=True, index=True)
    status = db.Column(db.Text, nullable=False, server_default='PENDING')  # 'PENDING', 'ACCEPTED'
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    accepted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "inviterUserId": str(self.inviter_user_id),
            "inviteeEmail": self.invitee_email,
            "token": self.token,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "acceptedAt": self.accepted_at.isoformat() if self.accepted_at else None,
            "inviter": self.inviter.to_dict() if self.inviter else None
        }