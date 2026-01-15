from playwright.sync_api import sync_playwright

def test_theme_toggle_functionality():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 Testing Theme Toggle Functionality...")
        print("=" * 50)

        try:
            # Navigate directly to dashboard (bypassing auth for testing)
            print("\n📱 TESTING DASHBOARD ACCESS:")
            print("-" * 30)

            page.goto('http://localhost:3000/dashboard')
            page.wait_for_load_state('networkidle', timeout=10000)

            # Take screenshot of dashboard
            page.screenshot(path='/tmp/dashboard_page.png', full_page=True)
            print("📸 Dashboard screenshot: /tmp/dashboard_page.png")

            # Look for navigation to settings
            print("\n🔗 LOOKING FOR SETTINGS NAVIGATION:")
            print("-" * 30)

            # Look for various possible settings links/buttons
            settings_selectors = [
                'a[href*="settings"]',
                'a:has-text("Settings")',
                'button:has-text("Settings")',
                '[data-testid*="settings"]',
                'nav a[href="/dashboard/settings"]',
                'a[href="/dashboard/settings"]'
            ]

            settings_element = None
            for selector in settings_selectors:
                elements = page.locator(selector).all()
                if elements:
                    settings_element = elements[0]
                    text = settings_element.text_content() or "No text"
                    href = settings_element.get_attribute('href') or "No href"
                    print(f"  ✅ Found settings link: '{text}' -> {href}")
                    break

            if not settings_element:
                print("  ❌ No settings link found, trying direct navigation...")
                # Try direct navigation to settings
                page.goto('http://localhost:3000/dashboard/settings')
                page.wait_for_load_state('networkidle', timeout=5000)
                print("  ✅ Navigated directly to /dashboard/settings")
            else:
                # Click the settings link
                print("  🖱️ Clicking settings link...")
                settings_element.click()
                page.wait_for_load_state('networkidle', timeout=5000)

            # Take screenshot of settings page
            page.screenshot(path='/tmp/settings_theme_test.png', full_page=True)
            print("📸 Settings screenshot: /tmp/settings_theme_test.png")

            # Now look for theme toggle elements
            print("\n🎨 LOOKING FOR THEME TOGGLE:")
            print("-" * 30)

            # More comprehensive theme toggle selectors
            theme_selectors = [
                'button:has-text("Light")',
                'button:has-text("Dark")',
                'button:has-text("System")',
                '[data-testid*="theme"]',
                '[data-testid*="toggle"]',
                '.theme-toggle',
                '.theme-switcher',
                'button[aria-label*="theme"]',
                'button[aria-label*="mode"]',
                'select[name*="theme"]',
                '[role="switch"]',
                'input[type="checkbox"][name*="theme"]',
                'button[class*="theme"]'
            ]

            theme_element = None
            for selector in theme_selectors:
                elements = page.locator(selector).all()
                print(f"  Checking {selector}: {len(elements)} elements found")
                if elements:
                    theme_element = elements[0]
                    text = theme_element.text_content() or "No text"
                    tag_name = theme_element.evaluate('el => el.tagName')
                    class_attr = theme_element.get_attribute('class') or ""
                    print(f"  ✅ Found theme control: <{tag_name}> '{text}' class='{class_attr}'")

                    # Check if it's visible and enabled
                    is_visible = theme_element.is_visible()
                    is_enabled = theme_element.is_enabled()
                    print(f"     Visible: {is_visible}, Enabled: {is_enabled}")

                    # Get styles that might prevent clicking
                    styles = page.evaluate('''(el) => {
                        const computed = window.getComputedStyle(el);
                        return {
                            pointerEvents: computed.pointerEvents,
                            zIndex: computed.zIndex,
                            position: computed.position,
                            display: computed.display,
                            opacity: computed.opacity
                        };
                    }''', theme_element.element_handle())
                    print(f"     Styles: {styles}")

                    if is_visible and is_enabled:
                        break
                    else:
                        theme_element = None

            if not theme_element:
                print("  ❌ No theme toggle found")

                # Let's examine the page content for any theme-related text
                print("\n🔍 EXAMINING PAGE FOR THEME-RELATED CONTENT:")
                page_content = page.content()
                theme_keywords = ['theme', 'dark', 'light', 'mode']
                for keyword in theme_keywords:
                    if keyword in page_content.lower():
                        print(f"  Found '{keyword}' in page content")
                        # Look for surrounding context
                        lines = page_content.split('\n')
                        for i, line in enumerate(lines):
                            if keyword in line.lower():
                                context = ' '.join(lines[max(0, i-1):i+2])
                                print(f"    Context: {context[:150]}...")
                                break

            else:
                # Try clicking the theme toggle
                print("\n🖱️ TESTING THEME TOGGLE CLICK:")
                print("-" * 30)

                try:
                    # Get current theme state
                    html_classes = page.locator('html').get_attribute('class') or ""
                    current_theme = "dark" if "dark" in html_classes else "light"
                    print(f"  Current theme: {current_theme}")
                    print(f"  HTML classes: {html_classes}")

                    # Click the toggle
                    print("  🖱️ Clicking theme toggle...")
                    theme_element.click()

                    # Wait a moment for state change
                    page.wait_for_timeout(1000)

                    # Check if theme changed
                    new_html_classes = page.locator('html').get_attribute('class') or ""
                    new_theme = "dark" if "dark" in new_html_classes else "light"
                    print(f"  New theme: {new_theme}")
                    print(f"  New HTML classes: {new_html_classes}")

                    if new_theme != current_theme:
                        print(f"  ✅ Theme toggle successful! Changed from {current_theme} to {new_theme}")
                    else:
                        print(f"  ❌ Theme toggle failed - no change detected")

                    # Take screenshot after toggle
                    page.screenshot(path='/tmp/theme_after_toggle.png', full_page=True)
                    print("📸 After toggle screenshot: /tmp/theme_after_toggle.png")

                except Exception as e:
                    print(f"  ❌ Error clicking theme toggle: {e}")

            # Let's also check all buttons on the settings page
            print("\n🔘 ALL BUTTONS ON SETTINGS PAGE:")
            print("-" * 30)
            all_buttons = page.locator('button, [role="button"], input[type="submit"], input[type="button"]').all()
            print(f"Found {len(all_buttons)} interactive elements")

            for i, button in enumerate(all_buttons[:10]):  # Show first 10
                try:
                    text = button.text_content() or button.get_attribute('value') or "No text"
                    tag_name = button.evaluate('el => el.tagName')
                    is_visible = button.is_visible()
                    is_enabled = button.is_enabled()
                    print(f"  {i+1}. <{tag_name}> '{text}' | Visible: {is_visible} | Enabled: {is_enabled}")
                except Exception as e:
                    print(f"  {i+1}. Error inspecting button: {e}")

        except Exception as e:
            print(f"❌ Error during testing: {e}")
            # Take emergency screenshot
            page.screenshot(path='/tmp/error_state.png', full_page=True)
            print("📸 Error screenshot: /tmp/error_state.png")

        finally:
            browser.close()

        print(f"\n📋 SUMMARY:")
        print(f"- Dashboard screenshot: /tmp/dashboard_page.png")
        print(f"- Settings screenshot: /tmp/settings_theme_test.png")
        print(f"- Check screenshots to identify specific interaction issues")

if __name__ == "__main__":
    test_theme_toggle_functionality()