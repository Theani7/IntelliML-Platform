import pytest
import io
import os
from app import main

def test_health_check(client):
    """Test public health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_root_endpoint(client):
    """Test root endpoint info"""
    response = client.get("/")
    assert response.status_code == 200
    assert "IntelliML API" in response.json()["message"]

def test_unauthorized_access(client):
    """Test that protected endpoints require authentication"""
    # /api/data/info is protected by SecurityMiddleware
    response = client.get("/api/data/info")
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]

def test_api_key_access(client):
    """Test authentication via X-API-Key header"""
    # Override the global API_KEY in main module for testing
    original_key = main.API_KEY
    main.API_KEY = "test-secret-key"
    try:
        response = client.get(
            "/api/data/info",
            headers={"X-API-Key": "test-secret-key"}
        )
        # It should be 404 (NotFoundError) because no data is loaded, but not 401.
        assert response.status_code == 404
        assert response.json()["error_code"] == "NOT_FOUND"
    finally:
        main.API_KEY = original_key

def test_upload_flow(client):
    """Test full upload flow via API"""
    original_key = main.API_KEY
    main.API_KEY = "test-secret-key"
    try:
        # Create a small CSV
        csv_data = "col1,col2\n1,2\n3,4"
        files = {"file": ("test.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        
        response = client.post(
            "/api/data/upload?session_id=test_user",
            files=files,
            headers={"X-API-Key": "test-secret-key"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test.csv"
        assert data["rows"] == 2
        
        # Verify we can get the info back
        response = client.get(
            "/api/data/info?session_id=test_user",
            headers={"X-API-Key": "test-secret-key"}
        )
        assert response.status_code == 200
        assert response.json()["rows"] == 2
    finally:
        main.API_KEY = original_key
