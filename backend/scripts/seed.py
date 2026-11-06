import random
import time

import httpx

API = "http://localhost:5000/api"
PASSWORD = "test1234"
http = httpx.Client(timeout=30)

BUSINESSES = [
    {
        "owner": ("Riya Shah", "riya.salon@example.com"),
        "staff": ("Neha Patil", "neha.staff@example.com"),
        "name": "Glow Studio Salon",
        "desc": "Hair, skin and grooming",
        "branches": [
            {"name": "Bandra", "address": "Linking Road, Bandra West",
             "services": [("Haircut", 30), ("Hair Spa", 60), ("Facial", 45)]},
            {"name": "Powai", "address": "Hiranandani Gardens, Powai",
             "services": [("Haircut", 30), ("Manicure", 40)]},
        ],
    },
    {
        "owner": ("Dr. Karan Mehta", "karan.dental@example.com"),
        "staff": ("Pooja Nair", "pooja.staff@example.com"),
        "name": "Smile Dental Clinic",
        "desc": "Check-ups, cleaning and root canals",
        "branches": [
            {"name": "Andheri", "address": "Veera Desai Road, Andheri West",
             "services": [("Dental Check-up", 15), ("Teeth Cleaning", 30)]},
        ],
    },
    {
        "owner": ("Imran Khan", "imran.cafe@example.com"),
        "staff": ("Sameer Joshi", "sameer.staff@example.com"),
        "name": "Chai & Chill Cafe",
        "desc": "Takeaway counter, fresh chai and snacks",
        "branches": [
            {"name": "Dadar", "address": "Shivaji Park, Dadar",
             "services": [("Takeaway Counter", 4), ("Table Booking", 10)]},
            {"name": "Thane", "address": "Ghodbunder Road, Thane",
             "services": [("Takeaway Counter", 4)]},
        ],
    },
    {
        "owner": ("Anil Deshmukh", "anil.bank@example.com"),
        "staff": ("Kavita Rao", "kavita.staff@example.com"),
        "name": "Metro Co-op Bank",
        "desc": "Deposits, withdrawals and loans",
        "branches": [
            {"name": "Fort Main Branch", "address": "Fort, Mumbai",
             "services": [("Cash Counter", 6), ("Loan Desk", 20), ("Passbook Update", 5)]},
        ],
    },
    {
        "owner": ("Sneha Kulkarni", "sneha.repair@example.com"),
        "staff": ("Vikram Singh", "vikram.staff@example.com"),
        "name": "FixIt Mobile Repair",
        "desc": "Screen, battery and software repair",
        "branches": [
            {"name": "Borivali", "address": "SV Road, Borivali West",
             "services": [("Screen Repair", 25), ("Battery Replacement", 15)]},
        ],
    },
]

CUSTOMERS = [
    ("Aarav Sharma", "aarav@example.com"),
    ("Diya Iyer", "diya@example.com"),
    ("Rohan Gupta", "rohan@example.com"),
    ("Ananya Reddy", "ananya@example.com"),
    ("Kabir Malhotra", "kabir@example.com"),
    ("Meera Pillai", "meera@example.com"),
    ("Ishaan Verma", "ishaan@example.com"),
    ("Tara Bose", "tara@example.com"),
]


def get_token(name, email):
    r = http.post(f"{API}/auth/register",
                  json={"email": email, "password": PASSWORD, "full_name": name})
    body = r.json() if r.status_code < 400 else {}
    if "access_token" not in body:
        r = http.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
        if r.status_code >= 400:
            raise SystemExit(f"Could not sign in {email}: {r.text}")
        body = r.json()
    time.sleep(0.4)
    return body["access_token"]


def call(method, path, token, **kw):
    return http.request(method, f"{API}{path}",
                        headers={"Authorization": f"Bearer {token}"}, **kw)


def main():
    for biz in BUSINESSES:
        tok = get_token(*biz["owner"])
        existing = [b for b in call("GET", "/businesses", tok).json() if b["name"] == biz["name"]]
        if existing:
            print(f"skip   {biz['name']} (already exists)")
            continue

        b = call("POST", "/businesses", tok,
                 json={"name": biz["name"], "description": biz["desc"]}).json()
        for br in biz["branches"]:
            row = call("POST", f"/businesses/{b['id']}/branches", tok,
                       json={"name": br["name"], "address": br["address"]}).json()
            for sname, mins in br["services"]:
                call("POST", f"/branches/{row['id']}/services", tok,
                     json={"name": sname, "avg_service_minutes": mins})

        get_token(*biz["staff"])
        call("POST", f"/businesses/{b['id']}/staff", tok, json={"email": biz["staff"][1]})
        print(f"created {biz['name']}")

    tokens = {email: get_token(name, email) for name, email in CUSTOMERS}

    first = tokens[CUSTOMERS[0][1]]
    services = []
    for b in call("GET", "/businesses", first).json():
        for br in call("GET", f"/businesses/{b['id']}/branches", first).json():
            for s in call("GET", f"/branches/{br['id']}/services", first).json():
                if s["is_open"]:
                    services.append(s)

    # first 6 customers join 2 random queues each; last 2 stay clean for manual testing
    random.seed(7)
    for name, email in CUSTOMERS[:6]:
        for s in random.sample(services, 2):
            r = call("POST", f"/services/{s['id']}/join", tokens[email])
            print(f"{name}: {'joined ' + s['name'] if r.status_code < 400 else r.json().get('error')}")

    print(f"\nAll seeded accounts use password: {PASSWORD}")
    print("Owners: " + ", ".join(b["owner"][1] for b in BUSINESSES))
    print("Staff: " + ", ".join(b["staff"][1] for b in BUSINESSES))
    print("Customers: " + ", ".join(e for _, e in CUSTOMERS))


if __name__ == "__main__":
    main()