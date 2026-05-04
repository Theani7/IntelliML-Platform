import pytest
import pandas as pd
from app.services.data_service import DataService
from app.core.exceptions import ValidationError

def test_process_uploaded_file_csv(data_service, sample_csv_content):
    """Test parsing a valid CSV file"""
    info = data_service.process_uploaded_file(
        content=sample_csv_content,
        filename="test.csv",
        session_id="test_sess"
    )
    
    assert info["filename"] == "test.csv"
    assert info["rows"] == 3
    assert info["cols"] == 3
    assert "A" in info["columns"]
    
    df = data_service.get_dataframe("test_sess")
    assert isinstance(df, pd.DataFrame)
    assert df.shape == (3, 3)

def test_unsupported_file_type(data_service):
    """Test error handling for unsupported file types"""
    with pytest.raises(ValidationError) as excinfo:
        data_service.process_uploaded_file(
            content=b"some binary data",
            filename="image.png",
            session_id="test_sess"
        )
    assert "Unsupported file type" in str(excinfo.value)

def test_session_isolation(data_service, sample_csv_content):
    """Test that data is isolated between sessions"""
    # Load into session 1
    data_service.process_uploaded_file(sample_csv_content, "s1.csv", "session1")
    
    # Load different data into session 2
    df2 = pd.DataFrame({"X": [1]})
    data_service.set_dataframe(df2, "session2", "s2.csv")
    
    df1 = data_service.get_dataframe("session1")
    df2_retrieved = data_service.get_dataframe("session2")
    
    assert df1.columns[0] == "A"
    assert df2_retrieved.columns[0] == "X"
    assert df1.shape != df2_retrieved.shape

def test_reset_session(data_service, sample_csv_content):
    """Test clearing session data"""
    data_service.process_uploaded_file(sample_csv_content, "test.csv", "test_sess")
    assert data_service.get_dataframe("test_sess") is not None
    
    data_service.reset_session("test_sess")
    assert data_service.get_dataframe("test_sess") is None
