import httpx
import json

url = "http://localhost:1133/api/v1/exam-rooms"

payload = {
    "name": "P11",
    "exam_period_id": "69d923421b7266db6c994575",
    "exam_ids": ["69d9bc981b7266db6c99458e", "69d924681b7266db6c99457c"],
    "exam_mode": "online",
    "department_id": "69d9b7ec1b7266db6c994585",
    "location": "",
    "proctor_id": "",
    "scheduled_start": "2026-04-18T05:58:00.000Z",
    "scheduled_end": "2026-04-19T05:58:00.000Z",
    "capacity": 50,
    "candidate_user_ids": [],
    "notes": ""
}

try:
    # We need a token. Since I don't have one, I expect a 401/403.
    # But if the server is running, I want to see if it even reaches the endpoint.
    response = httpx.post(url, json=payload, timeout=10.0)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
