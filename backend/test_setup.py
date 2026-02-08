import sys
print("Python version:", sys.version)

try:
    import fastapi
    print("✓ FastAPI installed")
except:
    print("✗ FastAPI not found")

try:
    import groq
    print("✓ Groq installed")
except:
    print("✗ Groq not found")

try:
    import sklearn
    print("✓ scikit-learn installed")
except:
    print("✗ scikit-learn not found")

try:
    import pandas
    print("✓ pandas installed")
except:
    print("✗ pandas not found")

try:
    import xgboost
    print("✓ XGBoost installed")
except:
    print("✗ XGBoost not found")

try:
    import shap
    print("✓ SHAP installed")
except:
    print("✗ SHAP not found")

print("\n✓ All core packages installed successfully!")