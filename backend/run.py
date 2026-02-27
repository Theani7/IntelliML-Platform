import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    import uvicorn
    # Binding to 127.0.0.1 for local testing
    uvicorn.run("app.main:app", host="127.0.0.1", port=8010, reload=True)