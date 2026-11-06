from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from ..auth import auth_required

bp = Blueprint("tokens", __name__)

IST = timezone(timedelta(hours=5, minutes=30))
ACTIVE = ["waiting", "called", "serving"]


def err(e, code=400):
    msg = getattr(e, "message", None) or str(e)
    return jsonify(error=msg), code


@bp.post("/services/<service_id>/join")
@auth_required
def join(service_id):
    try:
        res = g.db.rpc("join_queue", {"p_service": service_id}).execute()
    except Exception as e:
        return err(e)
    return jsonify(res.data), 201


@bp.get("/services/<service_id>/queue")
@auth_required
def summary(service_id):
    try:
        res = g.db.rpc("queue_summary", {"p_service": service_id}).execute()
    except Exception as e:
        return err(e)
    return jsonify(res.data), 200


@bp.get("/services/<service_id>/tokens")
@auth_required
def list_tokens(service_id):
    """Staff dashboard list. RLS means customers only ever see their own."""
    today = datetime.now(IST).date().isoformat()
    res = (
        g.db.table("tokens").select("*")
        .eq("service_id", service_id)
        .eq("queue_date", today)
        .in_("status", ACTIVE)
        .order("token_number")
        .execute()
    )
    return jsonify(res.data), 200


@bp.post("/services/<service_id>/call-next")
@auth_required
def call_next(service_id):
    try:
        res = g.db.rpc("call_next", {"p_service": service_id}).execute()
    except Exception as e:
        return err(e)
    return jsonify(res.data), 200


@bp.get("/tokens/mine")
@auth_required
def my_tokens():
    res = (
        g.db.table("tokens").select("*")
        .eq("customer_id", g.user.id)
        .in_("status", ACTIVE)
        .order("created_at", desc=True)
        .execute()
    )
    return jsonify(res.data), 200


@bp.get("/tokens/<token_id>")
@auth_required
def token_info(token_id):
    try:
        res = g.db.rpc("token_info", {"p_token": token_id}).execute()
    except Exception as e:
        return err(e, 404)
    return jsonify(res.data), 200


@bp.post("/tokens/<token_id>/status")
@auth_required
def set_status(token_id):
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in ("serving", "done", "skipped"):
        return jsonify(error="status must be serving, done or skipped"), 400
    try:
        res = g.db.rpc("set_token_status", {"p_token": token_id, "p_status": status}).execute()
    except Exception as e:
        return err(e)
    return jsonify(res.data), 200


@bp.post("/tokens/<token_id>/cancel")
@auth_required
def cancel(token_id):
    try:
        g.db.rpc("cancel_token", {"p_token": token_id}).execute()
    except Exception as e:
        return err(e)
    return jsonify(message="Token cancelled"), 200