from flask import Blueprint, request, jsonify, g
from ..supabase_client import anon_client
from ..auth import auth_required

bp = Blueprint("auth", __name__)


def session_payload(res):
    s = res.session
    return {
        "access_token": s.access_token,
        "refresh_token": s.refresh_token,
        "user": {"id": res.user.id, "email": res.user.email},
    }


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if not email or len(password) < 6:
        return jsonify(error="Valid email and password (min 6 chars) required"), 400

    try:
        res = anon_client().auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"full_name": full_name}},
        })
    except Exception as e:
        return jsonify(error=str(e)), 400

    if not res.session:
        return jsonify(message="Registered. Check your email to confirm."), 201
    return jsonify(session_payload(res)), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    try:
        res = anon_client().auth.sign_in_with_password({
            "email": (data.get("email") or "").strip(),
            "password": data.get("password") or "",
        })
    except Exception:
        return jsonify(error="Invalid email or password"), 401
    return jsonify(session_payload(res)), 200


@bp.post("/logout")
@auth_required
def logout():
    # JWTs are stateless; the client just discards its tokens
    return jsonify(message="Logged out"), 200


@bp.get("/me")
@auth_required
def me():
    try:
        profile = (
            g.db.table("profiles").select("*").eq("id", g.user.id).single().execute()
        )
    except Exception as e:
        return jsonify(error="Profile not found"), 404
    return jsonify({"email": g.user.email, **profile.data}), 200

@bp.patch("/me")
@auth_required
def update_me():
    name = ((request.get_json(silent=True) or {}).get("full_name") or "").strip()
    if not 2 <= len(name) <= 60:
        return jsonify(error="Name must be 2 to 60 characters"), 400
    try:
        g.db.table("profiles").update({"full_name": name}).eq("id", g.user.id).execute()
    except Exception as e:
        return jsonify(error=getattr(e, "message", None) or str(e)), 400
    return jsonify(message="Profile updated"), 200


@bp.delete("/me")
@auth_required
def delete_me():
    try:
        g.db.rpc("delete_my_account", {}).execute()
    except Exception as e:
        return jsonify(error=getattr(e, "message", None) or str(e)), 400
    return jsonify(message="Account deleted"), 200