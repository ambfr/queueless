def with_estimate(s):
    """Adds effective_minutes + estimate_basis to a service dict."""
    n = s.get("sample_count") or 0
    base = s["avg_service_minutes"]
    learned = s.get("learned_minutes")

    if n and learned is not None:
        w = min(n / 10, 1)
        eff = round(w * float(learned) + (1 - w) * base, 1)
    else:
        eff = float(base)

    s["effective_minutes"] = eff
    s["estimate_basis"] = "owner" if n == 0 else ("learning" if n < 10 else "learned")
    return s