from flask import current_app
from supabase import create_client, ClientOptions


def anon_client():
    return create_client(
        current_app.config["SUPABASE_URL"],
        current_app.config["SUPABASE_ANON_KEY"],
    )


def user_client(token):
    """Client that acts as the logged-in user, so RLS applies."""
    return create_client(
        current_app.config["SUPABASE_URL"],
        current_app.config["SUPABASE_ANON_KEY"],
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )