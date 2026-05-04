import pytest
import pandas as pd
import io
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_service import DataService

@pytest.fixture
def client():
    """Returns a FastAPI TestClient"""
    return TestClient(app)

@pytest.fixture
def data_service():
    """Returns a fresh DataService instance and clears sessions"""
    service = DataService()
    service.clear_all_sessions()
    return service

@pytest.fixture
def sample_csv_content():
    """Returns raw bytes of a sample CSV"""
    df = pd.DataFrame({
        "A": [1, 2, 3],
        "B": ["x", "y", "z"],
        "C": [1.1, 2.2, 3.3]
    })
    tobytes = io.BytesIO()
    df.to_csv(tobytes, index=False)
    return tobytes.getvalue()

@pytest.fixture
def sample_df():
    """Returns a sample DataFrame"""
    return pd.DataFrame({
        "target": [0, 1, 0, 1],
        "feat1": [1.0, 2.0, 1.1, 2.1],
        "feat2": ["A", "B", "A", "B"]
    })
