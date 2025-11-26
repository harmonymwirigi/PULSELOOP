"""bussiness users

Revision ID: e6396eecebc8
Revises: b3c4d5e6f7a8
Create Date: 2025-11-26 16:02:03.629212

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'e6396eecebc8'
down_revision = 'b3c4d5e6f7a8'
branch_labels = None
depends_on = None


def upgrade():
    # Only add the new promotions table and business-related user columns.
    # Do NOT modify NCLEX indexes here to avoid MySQL FK/index issues.

    # Create promotions table only if it does not already exist
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'promotions' not in existing_tables:
        op.create_table(
            'promotions',
            sa.Column('id', sa.CHAR(length=36), nullable=False),
            sa.Column('business_id', sa.CHAR(length=36), nullable=False),
            sa.Column('title', sa.Text(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('image_url', sa.Text(), nullable=True),
            sa.Column('target_url', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['business_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_business', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('business_name', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('business_description', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('business_website', sa.Text(), nullable=True))

    # Remove server_default after initial backfill so future inserts use application default.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('is_business', server_default=None)


def downgrade():
    # Drop business-related user columns and promotions table.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('business_website')
        batch_op.drop_column('business_description')
        batch_op.drop_column('business_name')
        batch_op.drop_column('is_business')

    op.drop_table('promotions')
