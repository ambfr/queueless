from flask import Blueprint, request, jsonify, g
from ..auth import auth_required

bp = Blueprint("businesses", __name__)


def err(e, code=400):
    msg = getattr(e, "message", None) or str(e)
    return jsonify(error=msg), code


@bp.post("")
@auth_required
def create_business():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if len(name) < 2:
        return jsonify(error="Name must be at least 2 characters"), 400
    try:
        res = g.db.rpc("create_business", {
            "p_name": name,
            "p_description": data.get("description"),
        }).execute()
    except Exception as e:
        return err(e)
    return jsonify(res.data), 201


@bp.get("")
@auth_required
def list_businesses():
    res = g.db.table("businesses").select("*").order("created_at", desc=True).execute()
    return jsonify(res.data), 200

@bp.get("/mine")
@auth_required
def my_businesses():
    owned = g.db.table("businesses").select("*").eq("owner_id", g.user.id).execute().data
    staffed = (
        g.db.table("business_staff")
        .select("businesses(*)")
        .eq("user_id", g.user.id)
        .execute().data
    )
    out = [{**b, "my_role": "owner"} for b in owned]
    out += [{**r["businesses"], "my_role": "staff"} for r in staffed if r.get("businesses")]
    return jsonify(out), 200

@bp.get("/<business_id>")
@auth_required
def get_business(business_id):
    try:
        res = g.db.table("businesses").select("*").eq("id", business_id).single().execute()
    except Exception:
        return jsonify(error="Business not found"), 404
    return jsonify(res.data), 200


@bp.patch("/<business_id>")
@auth_required
def update_business(business_id):
    data = request.get_json(silent=True) or {}
    changes = {k: data[k] for k in ("name", "description") if k in data}
    if not changes:
        return jsonify(error="Nothing to update"), 400
    res = g.db.table("businesses").update(changes).eq("id", business_id).execute()
    if not res.data:
        return jsonify(error="Not found or not the owner"), 404
    return jsonify(res.data[0]), 200


@bp.get("/<business_id>/staff")
@auth_required
def list_staff(business_id):
    res = (
        g.db.table("business_staff")
        .select("user_id, created_at, profiles(full_name, role)")
        .eq("business_id", business_id)
        .execute()
    )
    return jsonify(res.data), 200


@bp.post("/<business_id>/staff")
@auth_required
def add_staff(business_id):
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip()
    if not email:
        return jsonify(error="Email required"), 400
    try:
        g.db.rpc("add_staff", {"p_business": business_id, "p_email": email}).execute()
    except Exception as e:
        return err(e)
    return jsonify(message="Staff added"), 201


@bp.delete("/<business_id>/staff/<user_id>")
@auth_required
def remove_staff(business_id, user_id):
    try:
        g.db.rpc("remove_staff", {"p_business": business_id, "p_user": user_id}).execute()
    except Exception as e:
        return err(e)
    return jsonify(message="Staff removed"), 200