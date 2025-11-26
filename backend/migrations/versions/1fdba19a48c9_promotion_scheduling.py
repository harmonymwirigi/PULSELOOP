"""promotion scheduling

Revision ID: 1fdba19a48c9
Revises: e6396eecebc8
Create Date: 2025-11-26 22:50:37.669377

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1fdba19a48c9'
down_revision = 'e6396eecebc8'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add scheduling/activation fields to promotions.

    IMPORTANT: Do NOT touch NCLEX-related indexes here. MySQL requires those
    indexes for existing foreign key constraints, and dropping them causes
    `Cannot drop index ... needed in a foreign key constraint` errors.
    """

    # Add new columns to promotions table only.
    with op.batch_alter_table('promotions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')))
        batch_op.add_column(sa.Column('start_at', sa.TIMESTAMP(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('end_at', sa.TIMESTAMP(timezone=True), nullable=True))

    # Remove server_default for future inserts so application default is used.
    with op.batch_alter_table('promotions', schema=None) as batch_op:
        batch_op.alter_column('is_active', server_default=None)


def downgrade():
    """
    Revert promotion scheduling fields.

    Note: We intentionally do NOT modify NCLEX-related indexes here either.
    """

    with op.batch_alter_table('promotions', schema=None) as batch_op:
        batch_op.drop_column('end_at')
        batch_op.drop_column('start_at')
        batch_op.drop_column('is_active')
