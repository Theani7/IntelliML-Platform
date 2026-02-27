"""
Simple in-memory cache for analysis results.
Hash-based invalidation: cache entry is keyed on a hash of the DataFrame shape + column names.
"""

import hashlib
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class AnalysisCache:
    """In-memory cache with automatic invalidation when dataset changes."""

    def __init__(self, ttl: int = 300):
        """
        Args:
            ttl: Time-to-live in seconds (default 5 minutes).
        """
        self.ttl = ttl
        self._store: Dict[str, Dict[str, Any]] = {}

    def _hash_df(self, df) -> str:
        """Create a lightweight hash from the DataFrame's shape, columns, and dtypes."""
        sig = f"{df.shape}|{'|'.join(df.columns)}|{'|'.join(str(d) for d in df.dtypes)}"
        return hashlib.md5(sig.encode()).hexdigest()

    def get(self, key: str, df=None) -> Optional[Any]:
        """
        Retrieve a cached result.

        Args:
            key: Cache key (e.g. "analysis", "quality").
            df: If provided, used to validate the cache entry still matches the current data.

        Returns:
            Cached value or None if miss/expired/invalidated.
        """
        entry = self._store.get(key)
        if entry is None:
            return None

        # Check TTL
        if time.time() - entry["ts"] > self.ttl:
            logger.info(f"Cache expired for '{key}'")
            del self._store[key]
            return None

        # Check data hash (if df provided)
        if df is not None:
            current_hash = self._hash_df(df)
            if entry["hash"] != current_hash:
                logger.info(f"Cache invalidated for '{key}' (data changed)")
                del self._store[key]
                return None

        logger.info(f"Cache hit for '{key}'")
        return entry["value"]

    def set(self, key: str, value: Any, df=None) -> None:
        """
        Store a result in the cache.

        Args:
            key: Cache key.
            value: Value to cache.
            df: If provided, hash is stored for later validation.
        """
        self._store[key] = {
            "value": value,
            "ts": time.time(),
            "hash": self._hash_df(df) if df is not None else "",
        }
        logger.info(f"Cached result for '{key}'")

    def invalidate(self, key: Optional[str] = None) -> None:
        """Invalidate a specific key or all cached entries."""
        if key:
            self._store.pop(key, None)
            logger.info(f"Invalidated cache for '{key}'")
        else:
            self._store.clear()
            logger.info("All cache entries invalidated")


# Singleton instance
analysis_cache = AnalysisCache()
