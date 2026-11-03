import base64
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.main as api_module
from app.main import create_app


def token(username: str = "student", role: str = "STUDENT") -> str:
    raw = f"{username}|{role}|{int(time.time()) + 3600}|WORKSHOP_SECRET_2026"
    return base64.b64encode(raw.encode()).decode()


def headers(username: str = "student", role: str = "STUDENT") -> dict[str, str]:
    return {"Authorization": f"Bearer {token(username, role)}"}


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def test_lists_seeded_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_creates_task_and_summary(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Add tests", "description": "Improve coverage", "status": "TODO", "priority": "HIGH"},
        )
        summary = client.get("/api/summary", headers=headers())
    assert created.status_code == 201
    assert created.json()["owner"] == "student"
    assert summary.json()["total"] == 3


def test_task_sql_values_with_apostrophes_are_preserved(tmp_path: Path) -> None:
    username = "O'Brien"
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app, raise_server_exceptions=False) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(username),
            json={"title": "Owner's task", "description": "A user's note"},
        )
        tasks = client.get("/api/tasks", headers=headers(username), params={"owner": username})
        summary = client.get("/api/summary", headers=headers(username), params={"owner": username})

    assert created.status_code == 201
    assert created.json()["title"] == "Owner's task"
    assert created.json()["description"] == "A user's note"
    assert created.json()["status"] == "TODO"
    assert created.json()["priority"] == "MEDIUM"
    assert tasks.status_code == 200
    assert tasks.json()[0]["owner"] == username
    assert summary.status_code == 200
    assert summary.json()["owner"] == username
    assert summary.json()["total"] == 1


def test_uploads_requirement(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", b"Login must be accessible", "text/plain")},
        )
    assert response.status_code == 201
    assert (upload_dir / "requirements.txt").exists()


def test_rejects_invalid_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401


@pytest.mark.parametrize(
    ("method", "path", "request_kwargs"),
    [
        ("GET", "/api/tasks", {}),
        ("POST", "/api/tasks", {"json": {"title": "Auth check"}}),
        ("GET", "/api/summary", {}),
        ("POST", "/api/requirements", {"files": {"file": ("requirements.txt", b"x", "text/plain")}}),
        ("GET", "/api/backend-health", {}),
    ],
)
@pytest.mark.parametrize("authorization", [None, "Bearer invalid"])
def test_endpoints_reject_missing_or_invalid_authentication(
    client: TestClient,
    method: str,
    path: str,
    request_kwargs: dict[str, Any],
    authorization: str | None,
) -> None:
    request_headers = {} if authorization is None else {"Authorization": authorization}
    response = client.request(method, path, headers=request_headers, **request_kwargs)

    assert response.status_code == 401
    assert response.json()["detail"].startswith("Invalid token:")


@pytest.mark.parametrize(
    ("method", "path", "request_kwargs"),
    [
        ("PUT", "/api/tasks", {}),
        ("PUT", "/api/tasks", {"json": {"title": "Method check"}}),
        ("POST", "/api/summary", {}),
        ("GET", "/api/requirements", {}),
        ("PUT", "/api/backend-health", {}),
    ],
)
def test_endpoints_reject_unsupported_methods(
    client: TestClient,
    method: str,
    path: str,
    request_kwargs: dict[str, Any],
) -> None:
    response = client.request(method, path, headers=headers(), **request_kwargs)

    assert response.status_code == 405
    assert response.json() == {"detail": "Method Not Allowed"}


def test_cors_preflight_rejects_unconfigured_origins(client: TestClient) -> None:
    response = client.options(
        "/api/tasks",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_does_not_authorize_cross_origin_api_response(client: TestClient) -> None:
    response = client.get(
        "/api/tasks",
        headers={**headers(), "Origin": "https://untrusted.example"},
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_list_tasks_with_unknown_owner_is_empty(client: TestClient) -> None:
    response = client.get("/api/tasks", headers=headers(), params={"owner": "unknown"})

    assert response.status_code == 200
    assert response.json() == []


def test_list_tasks_cannot_read_another_owner(client: TestClient) -> None:
    tasks_response = client.get("/api/tasks", headers=headers(), params={"owner": "trainer"})
    summary_response = client.get("/api/summary", headers=headers(), params={"owner": "trainer"})
    leaks = []

    if tasks_response.status_code == 200 and any(task["owner"] != "student" for task in tasks_response.json()):
        leaks.append("GET /api/tasks returned another owner's tasks")
    if summary_response.status_code == 200 and summary_response.json()["owner"] != "student":
        leaks.append("GET /api/summary returned another owner's summary")

    assert tasks_response.status_code in {200, 403}
    assert summary_response.status_code in {200, 403}
    assert not leaks, "; ".join(leaks)


def test_summary_with_unknown_owner_is_empty(client: TestClient) -> None:
    response = client.get("/api/summary", headers=headers(), params={"owner": "unknown"})

    assert response.status_code == 200
    assert response.json() == {
        "owner": "unknown",
        "total": 0,
        "byStatus": {},
        "highPriorityOpen": 0,
    }


def test_create_task_with_empty_payload_uses_defaults(client: TestClient) -> None:
    response = client.post("/api/tasks", headers=headers(), json={})

    assert response.status_code == 201
    assert response.json()["title"] == ""
    assert response.json()["description"] == ""
    assert response.json()["status"] == "TODO"
    assert response.json()["priority"] == "MEDIUM"
    assert response.json()["owner"] == "student"


def test_create_task_cannot_assign_another_owner(client: TestClient) -> None:
    response = client.post(
        "/api/tasks",
        headers=headers(),
        json={"title": "Ownership check", "owner": "trainer"},
    )

    assert response.status_code == 201
    assert response.json()["owner"] == "student"


def test_create_task_without_body_returns_422(client: TestClient) -> None:
    response = client.post("/api/tasks", headers=headers())

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "missing"


def test_create_task_with_invalid_json_returns_422(client: TestClient) -> None:
    response = client.post("/api/tasks", headers=headers(), content="{")

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "json_invalid"


def test_create_task_with_non_object_json_returns_422(client: TestClient) -> None:
    response = client.post("/api/tasks", headers=headers(), json=[])

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "dict_type"


@pytest.mark.parametrize(
    "endpoint_call",
    [
        ("GET", "/api/tasks", {}),
        ("POST", "/api/tasks", {"json": {"title": "DB failure"}}),
        ("GET", "/api/summary", {}),
    ],
)
def test_database_errors_return_500_for_task_routes(
    client: TestClient,
    endpoint_call: tuple[str, str, dict[str, Any]],
) -> None:
    method, path, request_kwargs = endpoint_call
    client.app.state.connection.close()

    response = client.request(method, path, headers=headers(), **request_kwargs)

    assert response.status_code == 500
    assert response.text == "Internal Server Error"


def test_upload_requirement_without_extension_and_empty_content(client: TestClient) -> None:
    response = client.post(
        "/api/requirements",
        headers=headers(),
        files={"file": ("README", b"", "application/octet-stream")},
    )

    stored_path = Path(response.json()["storedAt"])
    assert response.status_code == 201
    assert response.json()["fileName"] == "README"
    assert response.json()["size"] == 0
    assert stored_path.exists()


def test_upload_requirement_without_file_returns_422(client: TestClient) -> None:
    response = client.post("/api/requirements", headers=headers())

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "file"]


def test_upload_requirement_with_malformed_multipart_returns_400(client: TestClient) -> None:
    response = client.post(
        "/api/requirements",
        headers={**headers(), "Content-Type": "multipart/form-data; boundary=expected"},
        content="not multipart",
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "There was an error parsing the body"}


def test_upload_requirement_write_error_returns_500(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_write_bytes(_path: Path, _content: bytes) -> int:
        raise OSError("simulated local write failure")

    monkeypatch.setattr(Path, "write_bytes", fail_write_bytes)
    response = client.post(
        "/api/requirements",
        headers=headers(),
        files={"file": ("requirements.txt", b"requirement", "text/plain")},
    )

    assert response.status_code == 500
    assert response.text == "Internal Server Error"


def test_backend_health_success_response(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    class HealthyPool:
        def request(self, method: str, url: str, timeout: float) -> SimpleNamespace:
            assert method == "GET"
            assert url == "http://localhost:8080/q/health"
            assert timeout == 3.0
            return SimpleNamespace(status=200, data=b'{"status":"UP"}')

    monkeypatch.setattr(api_module.urllib3, "PoolManager", HealthyPool)
    response = client.get("/api/backend-health", headers=headers())

    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 200,
        "body": '{"status":"UP"}',
    }


def test_backend_health_preserves_upstream_non_success_status(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnhealthyPool:
        def request(self, method: str, url: str, timeout: float) -> SimpleNamespace:
            return SimpleNamespace(status=503, data=b"unavailable")

    monkeypatch.setattr(api_module.urllib3, "PoolManager", UnhealthyPool)
    response = client.get("/api/backend-health", headers=headers())

    assert response.status_code == 200
    assert response.json() == {"requestedBy": "student", "status": 503, "body": "unavailable"}


def test_backend_health_dependency_exception_returns_status_zero(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingPool:
        def request(self, method: str, url: str, timeout: float) -> None:
            raise RuntimeError("stubbed backend failure")

    monkeypatch.setattr(api_module.urllib3, "PoolManager", FailingPool)
    response = client.get("/api/backend-health", headers=headers())

    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 0,
        "body": "stubbed backend failure",
    }
