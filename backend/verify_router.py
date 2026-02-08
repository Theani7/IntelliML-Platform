"""
Verify the data router is correctly defined
Run this to check if the router object exists and has routes
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

print("="*60)
print("Data Router Verification")
print("="*60)

try:
    print("\n1. Importing data module...")
    from app.api import data
    print("   ✓ Import successful")
    
    print("\n2. Checking for router object...")
    if hasattr(data, 'router'):
        print("   ✓ Router object exists")
        router = data.router
    else:
        print("   ✗ ERROR: No 'router' object found in data.py!")
        print("   Available attributes:", dir(data))
        sys.exit(1)
    
    print("\n3. Checking router type...")
    print(f"   Router type: {type(router)}")
    
    print("\n4. Checking routes...")
    if hasattr(router, 'routes'):
        routes = router.routes
        print(f"   Found {len(routes)} routes:")
        for route in routes:
            if hasattr(route, 'path'):
                methods = getattr(route, 'methods', [])
                print(f"      {str(methods):30s} {route.path}")
    else:
        print("   ✗ Router has no routes attribute")
    
    print("\n5. Checking prefix...")
    prefix = getattr(router, 'prefix', None)
    print(f"   Router prefix: {prefix}")
    
    print("\n" + "="*60)
    print("VERIFICATION COMPLETE")
    print("="*60)
    
    if len(routes) > 0:
        print("\n✓ Router is properly configured!")
        print("\nTo fix main.py, ensure you have:")
        print("   from app.api import data")
        print("   app.include_router(data.router, prefix='/api/data', tags=['data'])")
    else:
        print("\n✗ Router has no routes! Check data.py")
        
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()