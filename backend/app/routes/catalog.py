from flask import Blueprint, request, jsonify, g
from ..auth import auth_required

bp = Blueprint("catalog", __name__)


def err(e, code=400):
    msg = getattr(e, "message", None) or str(e)
    return jsonify(error=msg), code


def pick(data, fields):
    return {k: data[k] for k in fields if k in data}


# ---------- branches ----------

@bp.get("/businesses/<business_id>/branches")
@auth_required
def list_branches(business_id):
    res = (
        g.db.table("branches").select("*")
        .eq("business_id", business_id).order("created_at").execute()
    )
    return jsonify(res.data), 200


@bp.post("/businesses/<business_id>/branches")
@auth_required
def create_branch(business_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if len(name) < 2:
        return jsonify(error="Name must be at least 2 characters"), 400
    try:
        res = g.db.table("branches").insert({
            "business_id": business_id,
            "name": name,
            "address": data.get("address"),
        }).execute()
    except Exception as e:
        return err(e, 403)
    return jsonify(res.data[0]), 201


@bp.patch("/branches/<branch_id>")
@auth_required
def update_branch(branch_id):
    changes = pick(request.get_json(silent=True) or {}, ("name", "address"))
    if not changes:
        return jsonify(error="Nothing to update"), 400
    try:
        res = g.db.table("branches").update(changes).eq("id", branch_id).execute()
    except Exception as e:
        return err(e)
    if not res.data:
        return jsonify(error="Not found or not the owner"), 404
    return jsonify(res.data[0]), 200


@bp.delete("/branches/<branch_id>")
@auth_required
def delete_branch(branch_id):
    res = g.db.table("branches").delete().eq("id", branch_id).execute()
    if not res.data:
        return jsonify(error="Not found or not the owner"), 404
    return jsonify(message="Branch deleted"), 200


# ---------- services ----------

@bp.get("/branches/<branch_id>/services")
@auth_required
def list_services(branch_id):
    res = (
        g.db.table("services").select("*")
        .eq("branch_id", branch_id).order("created_at").execute()
    )
    return jsonify(res.data), 200


@bp.post("/branches/<branch_id>/services")
@auth_required
def create_service(branch_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if len(name) < 2:
        return jsonify(error="Name must be at least 2 characters"), 400
    row = {"branch_id": branch_id, "name": name}
    if "avg_service_minutes" in data:
        row["avg_service_minutes"] = data["avg_service_minutes"]
    try:
        res = g.db.table("services").insert(row).execute()
    except Exception as e:
        return err(e, 403)
    return jsonify(res.data[0]), 201


@bp.patch("/services/<service_id>")
@auth_required
def update_service(service_id):
    changes = pick(
        request.get_json(silent=True) or {},
        ("name", "avg_service_minutes", "is_open"),
    )
    if not changes:
        return jsonify(error="Nothing to update"), 400
    try:
        res = g.db.table("services").update(changes).eq("id", service_id).execute()
    except Exception as e:
        return err(e)
    if not res.data:
        return jsonify(error="Not found or not the owner"), 404
    return jsonify(res.data[0]), 200


@bp.delete("/services/<service_id>")
@auth_required
def delete_service(service_id):
    res = g.db.table("services").delete().eq("id", service_id).execute()
    if not res.data:
        return jsonify(error="Not found or not the owner"), 404
    return jsonify(message="Service deleted"), 200