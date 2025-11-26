"""email unscubscribing

Revision ID: 9c9f98a9e456
Revises: 1fdba19a48c9
Create Date: 2025-11-27 00:45:28.993134

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9c9f98a9e456'
down_revision = '1fdba19a48c9'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add newsletter_opt_out flag to users.

    IMPORTANT: Do NOT touch NCLEX-related indexes here. MySQL requires those
    indexes for existing foreign key constraints, and dropping them causes
    `Cannot drop index ... needed in a foreign key constraint` errors.
    """

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('newsletter_opt_out', sa.Boolean(), nullable=False, server_default=sa.text('0')))

    # Remove server_default after initial backfill so future inserts use application default.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('newsletter_opt_out', server_default=None)


def downgrade():
    """
    Remove newsletter_opt_out flag.

    Note: We intentionally do NOT modify NCLEX-related indexes here either.
    """

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('newsletter_opt_out')
