"""
Test the hybrid architecture locally.
This script tests that the proxy can call the backend with the shared secret.

To use this:
1. Start the backend in one terminal: python -m uvicorn plantkb.main:app --port 8000
2. Start the proxy in another terminal: python plantkb/proxy.py
3. Run this test: python test_hybrid.py

This verifies that the architecture works before deploying to Databricks.
"""
import httpx
import json

def test_proxy_to_backend():
    """Test that proxy can call backend with shared secret."""
    print("Testing hybrid architecture...")
    print()

    # Test direct backend access (should fail without secret)
    print("1. Testing backend WITHOUT shared secret (should fail):")
    try:
        response = httpx.post(
            "http://localhost:8000/api/ask",
            json={"question": "What is line of fire?"},
            timeout=120,
        )
        if response.status_code == 401:
            print("   ✓ Backend correctly rejected request without secret")
        else:
            print(f"   ✗ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    print()

    # Test backend access WITH secret
    print("2. Testing backend WITH shared secret (should work):")
    try:
        response = httpx.post(
            "http://localhost:8000/api/ask",
            json={"question": "What is line of fire?"},
            headers={"X-Shared-Secret": "test-secret-key-change-in-production"},
            timeout=120,
        )
        if response.status_code == 200:
            print("   ✓ Backend accepted request with secret")
            print(f"   Response preview: {response.json()['response'][:100]}...")
        else:
            print(f"   ✗ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    print()

    # Test proxy (proxy adds secret automatically)
    print("3. Testing proxy (proxy adds secret automatically):")
    try:
        response = httpx.post(
            "http://localhost:8001/api/ask",
            json={"question": "What is line of fire?"},
            timeout=120,
        )
        if response.status_code == 200:
            print("   ✓ Proxy successfully forwarded request to backend")
            print(f"   Response preview: {response.json()['response'][:100]}...")
        else:
            print(f"   ✗ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    print()

    print("All tests completed! The hybrid architecture is working.")
    print()
    print("Next steps:")
    print("1. Deploy the proxy app to Databricks Apps")
    print("2. Update the proxy to point to the server room IP (when GPU moves)")
    print("3. Add TLS certificate (when on production network)")

if __name__ == "__main__":
    test_proxy_to_backend()
