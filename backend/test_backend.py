"""
Backend Endpoint Diagnostic Script
Run this to test all endpoints and see which ones are working
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, description, data=None, files=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Method: {method}")
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            if files:
                response = requests.post(url, files=files)
            else:
                response = requests.post(url, json=data)
        
        print(f"Status: {response.status_code}")
        
        if response.ok:
            print(f"✓ SUCCESS")
            print(f"Response: {json.dumps(response.json(), indent=2)[:200]}...")
        else:
            print(f"✗ FAILED")
            print(f"Response: {response.text[:200]}")
            
        return response.ok
        
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("IntelliML Backend Diagnostic")
    print("="*60)
    
    results = {}
    
    # Test basic endpoints
    results['root'] = test_endpoint("GET", "/", "Root endpoint")
    results['health'] = test_endpoint("GET", "/health", "Health check")
    results['test-groq'] = test_endpoint("GET", "/test-groq", "Groq connection test")
    
    # Test data endpoints
    results['data_info'] = test_endpoint("GET", "/api/data/info", "Get dataset info (should fail if no data)")
    results['data_test'] = test_endpoint("GET", "/api/data/test-data", "Test data endpoint")
    
    # Test file upload with a dummy CSV
    print("\n" + "="*60)
    print("Creating test CSV file...")
    test_csv_content = "name,age,city\nJohn,25,NYC\nJane,30,LA\nBob,35,Chicago"
    files = {'file': ('test.csv', test_csv_content, 'text/csv')}
    results['upload'] = test_endpoint("POST", "/api/data/upload", "Upload CSV file", files=files)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for endpoint, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{endpoint:20s} {status}")
    
    print("\n" + "="*60)
    
    # Check if upload failed
    if not results.get('upload'):
        print("\n⚠️  CSV Upload Failed!")
        print("\nPossible issues:")
        print("1. Router not included in main.py")
        print("2. Endpoint path mismatch")
        print("3. CORS blocking the request")
        print("\nTo debug:")
        print("- Check backend logs for the request")
        print("- Verify /api/data/upload is registered")
        print("- Try: curl -X POST http://localhost:8000/api/data/upload -F 'file=@test.csv'")

if __name__ == "__main__":
    main()