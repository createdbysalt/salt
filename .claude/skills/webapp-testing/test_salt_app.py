#!/usr/bin/env python3
"""Test Salt Core app - homepage, signin, and protected routes."""

from playwright.sync_api import sync_playwright
import sys

def test_salt_app():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test 1: Homepage loads
        print("Test 1: Verifying homepage loads...")
        try:
            page.goto('http://localhost:3000', timeout=30000)
            page.wait_for_load_state('networkidle')
            title = page.title()
            print(f"  Homepage title: {title}")

            # Take screenshot
            page.screenshot(path='/tmp/homepage.png')
            print("  Screenshot saved to /tmp/homepage.png")
            results.append(("Homepage loads", True, f"Title: {title}"))
        except Exception as e:
            results.append(("Homepage loads", False, str(e)))
            print(f"  FAILED: {e}")

        # Test 2: Navigate to signin page
        print("\nTest 2: Checking signin page...")
        try:
            page.goto('http://localhost:3000/signin', timeout=30000)
            page.wait_for_load_state('networkidle')

            # Check for login form elements
            page.screenshot(path='/tmp/signin.png')
            print("  Screenshot saved to /tmp/signin.png")

            # Look for common signin elements
            content = page.content()
            has_email_input = 'email' in content.lower() or page.locator('input[type="email"]').count() > 0
            has_password_input = page.locator('input[type="password"]').count() > 0

            print(f"  Has email input: {has_email_input}")
            print(f"  Has password input: {has_password_input}")
            results.append(("Signin page loads", True, f"Email: {has_email_input}, Password: {has_password_input}"))
        except Exception as e:
            results.append(("Signin page loads", False, str(e)))
            print(f"  FAILED: {e}")

        # Test 3: Dashboard routes are protected (should redirect)
        print("\nTest 3: Verifying dashboard routes are protected...")
        protected_routes = [
            '/dashboard/overview',
            '/dashboard/projects',
            '/dashboard/clients',
        ]

        for route in protected_routes:
            try:
                page.goto(f'http://localhost:3000{route}', timeout=30000)
                page.wait_for_load_state('networkidle')
                current_url = page.url

                # Check if redirected away from dashboard (to signin or similar)
                is_protected = 'signin' in current_url or 'login' in current_url or current_url != f'http://localhost:3000{route}'
                print(f"  {route}: redirected to {current_url} - {'PROTECTED' if is_protected else 'NOT PROTECTED'}")
                results.append((f"Route {route} protected", is_protected, f"Redirected to: {current_url}"))
            except Exception as e:
                results.append((f"Route {route} protected", False, str(e)))
                print(f"  {route}: FAILED - {e}")

        # Test 4: Bridge routes
        print("\nTest 4: Checking bridge route...")
        try:
            page.goto('http://localhost:3000/bridge', timeout=30000)
            page.wait_for_load_state('networkidle')
            page.screenshot(path='/tmp/bridge.png')
            print("  Screenshot saved to /tmp/bridge.png")
            current_url = page.url
            print(f"  Bridge URL: {current_url}")
            results.append(("Bridge route accessible", True, f"URL: {current_url}"))
        except Exception as e:
            results.append(("Bridge route accessible", False, str(e)))
            print(f"  FAILED: {e}")

        browser.close()

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    passed = 0
    failed = 0
    for name, success, details in results:
        status = "PASS" if success else "FAIL"
        if success:
            passed += 1
        else:
            failed += 1
        print(f"[{status}] {name}: {details}")

    print(f"\nTotal: {passed} passed, {failed} failed")
    return failed == 0

if __name__ == "__main__":
    success = test_salt_app()
    sys.exit(0 if success else 1)
