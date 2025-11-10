"""add nclex resource progress

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6_add_nclex_course_tables
Create Date: 2025-11-10 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3c4d5e6f7a8'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'nclex_resource_progress',
        sa.Column('id', sa.CHAR(length=36), nullable=False),
        sa.Column('enrollment_id', sa.CHAR(length=36), nullable=False),
        sa.Column('resource_id', sa.CHAR(length=36), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['enrollment_id'], ['nclex_enrollments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resource_id'], ['nclex_course_resources.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('enrollment_id', 'resource_id', name='uq_enrollment_resource_progress')
    )


def downgrade():
    op.drop_table('nclex_resource_progress')

