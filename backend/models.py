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

    # Business / Organization profile fields
    is_business = db.Column(db.Boolean, nullable=False, default=False)
    business_name = db.Column(db.Text)
    business_description = db.Column(db.Text)
    business_website = db.Column(db.Text)
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
    feedbacks = db.relationship('Feedback', backref='author', lazy=True, cascade="all, delete-orphan")
    promotions = db.relationship('Promotion', backref='business', lazy=True, cascade="all, delete-orphan")

    def calculate_profile_completion_percentage(self):
        fields_to_check = [self.title, self.department, self.state, self.bio]
        completed_fields = sum(1 for field in fields_to_check if field and str(field).strip())
        # Business fields are optional and not counted towards basic profile completion
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
            "isBusiness": self.is_business,
            "businessName": self.business_name,
            "businessDescription": self.business_description,
            "businessWebsite": self.business_website,
            "profileCompletionPercentage": self.calculate_profile_completion_percentage(),
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
    image_url = db.Column(db.Text, nullable=True)  # For advertisement logos/images
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_visible = db.Column(db.Boolean, nullable=False, default=True)  # For admin to hide/show
    created_by = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "message": self.message,
            "imageUrl": self.image_url,
            "isActive": self.is_active,
            "isVisible": self.is_visible,
            "createdBy": str(self.created_by),
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "creator": self.creator.to_dict() if self.creator else None
        }


class Promotion(db.Model):
    __tablename__ = 'promotions'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    business_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    target_url = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='PENDING')  # PENDING, APPROVED, REJECTED
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "businessId": str(self.business_id),
            "title": self.title,
            "description": self.description,
            "imageUrl": self.image_url,
            "targetUrl": self.target_url,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "business": self.business.to_dict() if self.business else None,
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
    rejection_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id), "title": self.title, "description": self.description, "authorId": str(self.author_id),
            "type": self.type, "content": self.content, "fileUrl": self.file_url, "status": self.status,
            "rejectionReason": self.rejection_reason, "created_at": self.created_at.isoformat(), 
            "author": self.author.to_dict() if self.author else None
        }

class NCLEXCourse(db.Model):
    __tablename__ = 'nclex_courses'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='DRAFT')  # DRAFT, PUBLISHED, ARCHIVED
    created_by = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    published_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    creator = db.relationship('User', backref='nclex_courses', lazy=True)
    resources = db.relationship('NCLEXCourseResource', backref='course', lazy=True, cascade="all, delete-orphan", order_by="NCLEXCourseResource.order_index")
    questions = db.relationship('NCLEXQuestion', backref='course', lazy=True, cascade="all, delete-orphan", order_by="NCLEXQuestion.order_index")
    enrollments = db.relationship('NCLEXEnrollment', backref='course', lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_details=False, include_correct_answers=False, enrollment=None):
        data = {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "createdBy": str(self.created_by) if self.created_by else None,
            "creator": self.creator.to_dict() if self.creator else None,
            "publishedAt": self.published_at.isoformat() if self.published_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "resourceCount": len(self.resources or []),
            "questionCount": len(self.questions or [])
        }
        if enrollment:
            data["enrollment"] = enrollment.to_dict(include_resource_progress=True)
        if include_details:
            progress_map = {}
            if enrollment:
                progress_map = {
                    str(progress.resource_id): progress
                    for progress in (enrollment.resource_progress or [])
                }
                data["resourceProgress"] = [
                    progress.to_dict() for progress in (enrollment.resource_progress or [])
                ]
            data["resources"] = [
                resource.to_dict(progress=progress_map.get(str(resource.id)))
                for resource in (self.resources or [])
            ]
            data["questions"] = [
                question.to_dict(include_correct_answers=include_correct_answers)
                for question in (self.questions or [])
            ]
        return data

    def to_public_dict(self, enrollment=None):
        return self.to_dict(include_details=True, include_correct_answers=False, enrollment=enrollment)


class NCLEXCourseResource(db.Model):
    __tablename__ = 'nclex_course_resources'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    course_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_courses.id', ondelete='CASCADE'), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)  # YOUTUBE, VIDEO_UPLOAD, PDF_UPLOAD, ARTICLE
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    url = db.Column(db.Text, nullable=False)
    storage_filename = db.Column(db.Text)
    duration_seconds = db.Column(db.Integer)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    progress_entries = db.relationship('NCLEXResourceProgress', backref='resource', lazy=True, cascade="all, delete-orphan")

    def to_dict(self, progress=None):
        return {
            "id": str(self.id),
            "courseId": str(self.course_id),
            "resourceType": self.resource_type,
            "title": self.title,
            "description": self.description,
            "url": self.url,
            "storageFilename": self.storage_filename,
            "durationSeconds": self.duration_seconds,
            "orderIndex": self.order_index,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "progressStatus": progress.status if progress else None,
            "completedAt": progress.completed_at.isoformat() if progress and progress.completed_at else None
        }


class NCLEXResourceProgress(db.Model):
    __tablename__ = 'nclex_resource_progress'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    enrollment_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_enrollments.id', ondelete='CASCADE'), nullable=False)
    resource_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_course_resources.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='PENDING')
    completed_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint('enrollment_id', 'resource_id', name='uq_enrollment_resource_progress'),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "enrollmentId": str(self.enrollment_id),
            "resourceId": str(self.resource_id),
            "status": self.status,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None
        }


class NCLEXQuestion(db.Model):
    __tablename__ = 'nclex_questions'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    course_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_courses.id', ondelete='CASCADE'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    source = db.Column(db.String(50), nullable=False, default='AI')  # AI or MANUAL
    order_index = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    options = db.relationship('NCLEXQuestionOption', backref='question', lazy=True, cascade="all, delete-orphan", order_by="NCLEXQuestionOption.order_index")

    def to_dict(self, include_correct_answers=False):
        return {
            "id": str(self.id),
            "courseId": str(self.course_id),
            "questionText": self.question_text,
            "explanation": self.explanation,
            "source": self.source,
            "orderIndex": self.order_index,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "options": [
                option.to_dict(include_correct_answers=include_correct_answers)
                for option in (self.options or [])
            ]
        }

    def to_exam_dict(self):
        return self.to_dict(include_correct_answers=False)


class NCLEXQuestionOption(db.Model):
    __tablename__ = 'nclex_question_options'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    question_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_questions.id', ondelete='CASCADE'), nullable=False)
    option_text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    feedback = db.Column(db.Text)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self, include_correct_answers=False):
        data = {
            "id": str(self.id),
            "questionId": str(self.question_id),
            "optionText": self.option_text,
            "orderIndex": self.order_index,
        }
        if include_correct_answers:
            data["isCorrect"] = self.is_correct
            data["feedback"] = self.feedback
        return data


class NCLEXEnrollment(db.Model):
    __tablename__ = 'nclex_enrollments'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    course_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_courses.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='ENROLLED')  # ENROLLED, COMPLETED
    progress_percent = db.Column(db.Float, nullable=False, default=0.0)
    latest_score_percent = db.Column(db.Float, nullable=True)
    attempt_count = db.Column(db.Integer, nullable=False, default=0)
    started_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    completed_at = db.Column(db.TIMESTAMP(timezone=True), nullable=True)

    user = db.relationship('User', backref='nclex_enrollments', lazy=True)
    attempts = db.relationship('NCLEXAttempt', backref='enrollment', lazy=True, cascade="all, delete-orphan", order_by="desc(NCLEXAttempt.submitted_at)")
    resource_progress = db.relationship('NCLEXResourceProgress', backref='enrollment', lazy=True, cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint('course_id', 'user_id', name='uq_course_user_enrollment'),
    )

    def to_dict(self, include_attempts=False, include_resource_progress=False):
        data = {
            "id": str(self.id),
            "courseId": str(self.course_id),
            "userId": str(self.user_id),
            "status": self.status,
            "progressPercent": float(self.progress_percent or 0.0),
            "latestScorePercent": float(self.latest_score_percent) if self.latest_score_percent is not None else None,
            "attemptCount": self.attempt_count,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None
        }
        if include_attempts:
            data["attempts"] = [attempt.to_dict(include_answers=True) for attempt in (self.attempts or [])]
        # Include latest attempt if it was set (for course detail view)
        if hasattr(self, '_latest_attempt') and self._latest_attempt:
            data["latestAttempt"] = self._latest_attempt.to_dict(include_answers=True)
        if include_resource_progress:
            data["resourceProgress"] = [
                progress.to_dict() for progress in (self.resource_progress or [])
            ]
        return data


class NCLEXAttempt(db.Model):
    __tablename__ = 'nclex_attempts'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    enrollment_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_enrollments.id', ondelete='CASCADE'), nullable=False)
    score_percent = db.Column(db.Float, nullable=False, default=0.0)
    total_questions = db.Column(db.Integer, nullable=False, default=0)
    correct_answers = db.Column(db.Integer, nullable=False, default=0)
    submitted_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    answers = db.relationship('NCLEXAttemptAnswer', backref='attempt', lazy=True, cascade="all, delete-orphan")

    def to_dict(self, include_answers=False):
        data = {
            "id": str(self.id),
            "enrollmentId": str(self.enrollment_id),
            "scorePercent": float(self.score_percent or 0.0),
            "totalQuestions": self.total_questions,
            "correctAnswers": self.correct_answers,
            "submittedAt": self.submitted_at.isoformat() if self.submitted_at else None
        }
        if include_answers:
            data["answers"] = [answer.to_dict() for answer in (self.answers or [])]
        return data


class NCLEXAttemptAnswer(db.Model):
    __tablename__ = 'nclex_attempt_answers'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    attempt_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_attempts.id', ondelete='CASCADE'), nullable=False)
    question_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_questions.id', ondelete='CASCADE'), nullable=False)
    selected_option_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_question_options.id', ondelete='SET NULL'), nullable=True)
    correct_option_id = db.Column(db.CHAR(36), db.ForeignKey('nclex_question_options.id', ondelete='SET NULL'), nullable=True)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    explanation = db.Column(db.Text)

    question = db.relationship('NCLEXQuestion', lazy=True)
    selected_option = db.relationship('NCLEXQuestionOption', foreign_keys=[selected_option_id], lazy=True)
    correct_option = db.relationship('NCLEXQuestionOption', foreign_keys=[correct_option_id], lazy=True)

    def to_dict(self):
        return {
            "id": str(self.id),
            "attemptId": str(self.attempt_id),
            "questionId": str(self.question_id),
            "selectedOptionId": str(self.selected_option_id) if self.selected_option_id else None,
            "correctOptionId": str(self.correct_option_id) if self.correct_option_id else None,
            "isCorrect": self.is_correct,
            "explanation": self.explanation,
            "questionText": self.question.question_text if self.question else None,
            "options": [
                option.to_dict(include_correct_answers=True)
                for option in (self.question.options if self.question else [])
            ]
        }


class Blog(db.Model):
    __tablename__ = 'blogs'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    author_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    cover_image_url = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False, default='PENDING')
    rejection_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id), "title": self.title, "content": self.content, "authorId": str(self.author_id),
            "coverImageUrl": self.cover_image_url, "status": self.status, "rejectionReason": self.rejection_reason,
            "created_at": self.created_at.isoformat(), "author": self.author.to_dict() if self.author else None
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

class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 star rating
    status = db.Column(db.String(50), nullable=False, default='PENDING')  # PENDING, APPROVED, REJECTED
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "content": self.content,
            "rating": self.rating,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "author": self.author.to_dict() if self.author else None
        }

# --- CONVERSATION MODELS ---

class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='ACTIVE')  # ACTIVE, INACTIVE
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())
    
    # Relationships
    creator = db.relationship('User', backref='created_conversations', lazy=True)
    messages = db.relationship('ConversationMessage', backref='conversation', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        message_count = len(self.messages) if self.messages else 0
        last_message = max(self.messages, key=lambda m: m.created_at) if self.messages else None
        
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "createdBy": str(self.created_by),
            "createdByName": self.creator.name if self.creator else "Unknown",
            "createdByAvatar": self.creator.avatar_url if self.creator else "/avatar.jpg",
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "messageCount": message_count,
            "lastMessageAt": last_message.created_at.isoformat() if last_message else None
        }

class ConversationMessage(db.Model):
    __tablename__ = 'conversation_messages'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    conversation_id = db.Column(db.CHAR(36), db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    # Relationships
    user = db.relationship('User', backref='conversation_messages', lazy=True)
    reactions = db.relationship('ConversationReaction', backref='message', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "conversationId": str(self.conversation_id),
            "userId": str(self.user_id),
            "userName": self.user.name if self.user else "Unknown",
            "userAvatar": self.user.avatar_url if self.user else "/avatar.jpg",
            "message": self.message,
            "createdAt": self.created_at.isoformat(),
            "reactions": [reaction.to_dict() for reaction in self.reactions]
        }

class ConversationReaction(db.Model):
    __tablename__ = 'conversation_reactions'
    id = db.Column(db.CHAR(36), primary_key=True, default=generate_uuid_str)
    message_id = db.Column(db.CHAR(36), db.ForeignKey('conversation_messages.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.CHAR(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # HEART, SUPPORT, LAUGH, etc.
    created_at = db.Column(db.TIMESTAMP(timezone=True), nullable=False, server_default=db.func.now())
    
    # Relationships
    user = db.relationship('User', backref='conversation_reactions', lazy=True)
    
    def to_dict(self):
        return {
            "id": str(self.id),
            "messageId": str(self.message_id),
            "userId": str(self.user_id),
            "type": self.type,
            "createdAt": self.created_at.isoformat()
        }