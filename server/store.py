import os
import sqlite3
import threading
import time

import settings

_conn = sqlite3.connect(
    os.path.join(settings.DATA_DIR, "cache.db"), check_same_thread=False
)
_conn.execute(
    "CREATE TABLE IF NOT EXISTS resolved ("
    " key TEXT PRIMARY KEY,"
    " video_id TEXT NOT NULL,"
    " title TEXT NOT NULL,"
    " score REAL NOT NULL,"
    " created_at INTEGER NOT NULL)"
)
_conn.commit()
_lock = threading.Lock()


def get_resolved(key: str) -> tuple[str, str, float] | None:
    with _lock:
        row = _conn.execute(
            "SELECT video_id, title, score FROM resolved WHERE key = ?", (key,)
        ).fetchone()
    return row


def put_resolved(key: str, video_id: str, title: str, score: float) -> None:
    with _lock:
        _conn.execute(
            "INSERT OR REPLACE INTO resolved VALUES (?, ?, ?, ?, ?)",
            (key, video_id, title, score, int(time.time())),
        )
        _conn.commit()
