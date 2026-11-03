from __future__ import annotations

import sqlite3
from typing import Any

from app.repositories.task_repository import TaskRepository

DEFAULT_TASK_STATUS = "TODO"
DEFAULT_TASK_PRIORITY = "MEDIUM"
HIGH_PRIORITY = "HIGH"
CLOSED_STATUSES = frozenset({"DONE", "ARCHIVED"})


class TaskService:
    def __init__(self, repository: TaskRepository) -> None:
        self._repository = repository

    def list_tasks(self, owner: str) -> list[dict[str, Any]]:
        return [self._as_task(row) for row in self._repository.list_tasks(owner)]

    def create_task(
        self,
        title: str,
        description: str,
        status: str,
        owner: str,
        priority: str,
    ) -> dict[str, Any]:
        row = self._repository.create_task(title, description, status, owner, priority)
        return self._as_task(row)

    def summarize_tasks(self, owner: str) -> dict[str, Any]:
        rows = self._repository.get_summary_rows(owner)
        status_counts: dict[str, int] = {}
        high_priority_open = 0

        for row in rows:
            status = row["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
            if row["priority"] == HIGH_PRIORITY and status not in CLOSED_STATUSES:
                high_priority_open += 1

        return {
            "owner": owner,
            "total": len(rows),
            "byStatus": status_counts,
            "highPriorityOpen": high_priority_open,
        }

    @staticmethod
    def _as_task(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "status": row["status"],
            "owner": row["owner"],
            "priority": row["priority"],
            "createdAt": row["created_at"],
        }