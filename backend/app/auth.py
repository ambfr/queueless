from functools import wraps
from flask import request, jsonify, g
from .supabase_client import anon_client, user_client


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify(error="Missing token"), 401

        token = header.split(" ", 1)[1]
        try:
            user = anon_client().auth.get_user(token).user
        except Exception:
            return jsonify(error="Invalid or expired token"), 401

        if not user:
            return jsonify(error="Invalid or expired token"), 401

        g.user = user
        g.token = token
        g.db = user_client(token)
        return f(*args, **kwargs)

    return wrapper