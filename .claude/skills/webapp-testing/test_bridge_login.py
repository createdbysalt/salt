#!/usr/bin/env python3
"""
Test bridge login page loads without redirects
"""

from playwright.sync_api import sync_playwright
import sys

def test_bridge_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to localhost:3000/bridge/login...")

        # Navigate to bridge login and track responses
        responses = []
        def handle_response(response):
            responses.append({
                'url': response.url,
                'status': response.status,
                'headers': dict(response.headers)
            })

        page.on('response', handle_response)

        try:
            # Navigate with longer timeout since compilation might be happening
            page.goto('http://localhost:3000/bridge/login', timeout=30000)

            # Wait for page to fully load
            page.wait_for_load_state('networkidle')

            # Take screenshot for visual verification
            page.screenshot(path='/tmp/bridge_login_test.png', full_page=True)

            # Check final URL (should still be /bridge/login if no redirect)
            final_url = page.url
            print(f"Final URL: {final_url}")

            # Check for redirect responses (307, 301, 302)
            redirect_responses = [r for r in responses if r['status'] in [301, 302, 307, 308]]
            if redirect_responses:
                print("❌ REDIRECTS DETECTED:")
                for resp in redirect_responses:
                    print(f"  {resp['status']} - {resp['url']}")
                    if 'location' in resp['headers']:
                        print(f"    → {resp['headers']['location']}")
            else:
                print("✅ No redirects detected")

            # Verify we're on the correct page
            if '/bridge/login' in final_url:
                print("✅ Successfully loaded bridge login page")

                # Check for page content
                page_title = page.title()
                print(f"Page title: {page_title}")

                # Look for login form elements
                email_input = page.locator('input[type="email"]')
                submit_button = page.locator('button[type="submit"]')

                if email_input.count() > 0 and submit_button.count() > 0:
                    print("✅ Login form elements found")
                    return True
                else:
                    print("❌ Login form elements not found")
                    print("Page content preview:")
                    print(page.content()[:500] + "...")
                    return False
            else:
                print(f"❌ Unexpected final URL: {final_url}")
                return False

        except Exception as e:
            print(f"❌ Error during navigation: {e}")

            # Take screenshot anyway for debugging
            try:
                page.screenshot(path='/tmp/bridge_login_error.png', full_page=True)
                print("Error screenshot saved to /tmp/bridge_login_error.png")
            except:
                pass

            return False
        finally:
            browser.close()

if __name__ == "__main__":
    success = test_bridge_login()
    sys.exit(0 if success else 1)