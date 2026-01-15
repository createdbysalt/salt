from playwright.sync_api import sync_playwright

def verify_ui_functionality():
    """
    Test the UI components on the dedicated test page to verify functionality
    without authentication barriers.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 VERIFYING UI FUNCTIONALITY")
        print("=" * 50)

        try:
            # Navigate to UI test page
            print("🌐 Navigating to UI test page...")
            page.goto('http://localhost:3000/ui-test')
            page.wait_for_load_state('networkidle', timeout=10000)

            # Take initial screenshot
            page.screenshot(path='/tmp/ui_test_initial.png', full_page=True)
            print("📸 Initial UI test screenshot: /tmp/ui_test_initial.png")

            # Test 1: Greeting Header
            print("\n1️⃣ GREETING HEADER TEST:")
            print("-" * 30)

            greeting_header = page.locator('h1').first
            if greeting_header.is_visible():
                greeting_text = greeting_header.text_content()
                print(f"   ✅ Greeting header found: '{greeting_text}'")

                # Check for name personalization
                if "Gabriella" in greeting_text:
                    print("   ✅ Name personalization working")
                else:
                    print("   ⚠️ Name personalization not detected")
            else:
                print("   ❌ No greeting header found")

            # Test 2: Theme Toggle
            print("\n2️⃣ THEME TOGGLE TEST:")
            print("-" * 30)

            theme_toggle = page.locator('button[aria-label="Toggle theme"]').first
            if theme_toggle.is_visible():
                print("   ✅ Theme toggle found and visible")

                # Get current theme
                html_classes = page.locator('html').get_attribute('class') or ""
                current_theme = "dark" if "dark" in html_classes else "light"
                print(f"   📋 Current theme: {current_theme}")

                # Test click
                try:
                    print("   🖱️ Testing theme toggle click...")
                    theme_toggle.click()
                    page.wait_for_timeout(1000)

                    # Check if theme changed
                    new_html_classes = page.locator('html').get_attribute('class') or ""
                    new_theme = "dark" if "dark" in new_html_classes else "light"
                    print(f"   📋 New theme: {new_theme}")

                    if new_theme != current_theme:
                        print("   ✅ Theme toggle working correctly!")

                        # Take screenshot after theme change
                        page.screenshot(path='/tmp/ui_test_theme_changed.png', full_page=True)
                        print("   📸 Theme changed screenshot: /tmp/ui_test_theme_changed.png")
                    else:
                        print("   ❌ Theme toggle click had no effect")

                except Exception as e:
                    print(f"   ❌ Theme toggle click failed: {e}")
            else:
                print("   ❌ Theme toggle not found")

            # Test 3: Tab Navigation
            print("\n3️⃣ TAB NAVIGATION TEST:")
            print("-" * 30)

            tab_names = ["profile", "notifications", "security", "billing"]
            tab_results = {}

            for tab_name in tab_names:
                try:
                    # Find and click tab
                    tab_button = page.locator(f'[role="tab"]:has-text("{tab_name.title()}")').first
                    if tab_button.is_visible():
                        print(f"   📑 Testing {tab_name} tab...")

                        tab_button.click()
                        page.wait_for_timeout(500)

                        # Check if tab is now active
                        is_active = tab_button.get_attribute('data-state') == 'active'

                        # Check if content is visible
                        content_visible = page.locator(f'[role="tabpanel"]').is_visible()

                        print(f"      Active: {is_active}, Content visible: {content_visible}")

                        if is_active and content_visible:
                            tab_results[tab_name] = "✅ Working"
                        else:
                            tab_results[tab_name] = "❌ Not working"
                    else:
                        print(f"   ❌ {tab_name} tab not found")
                        tab_results[tab_name] = "❌ Not found"

                except Exception as e:
                    print(f"   ❌ Error testing {tab_name} tab: {e}")
                    tab_results[tab_name] = "❌ Error"

            print("\n   📊 Tab Test Summary:")
            for tab, result in tab_results.items():
                print(f"      {tab.title()}: {result}")

            # Test 4: CSS Interference Check
            print("\n4️⃣ CSS INTERFERENCE CHECK:")
            print("-" * 30)

            # Check for problematic overlays
            high_z_elements = page.evaluate('''() => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements
                    .map(el => {
                        const style = window.getComputedStyle(el);
                        const zIndex = parseInt(style.zIndex);
                        if (zIndex > 1000) {
                            return {
                                tag: el.tagName,
                                id: el.id,
                                classes: el.className,
                                zIndex: zIndex,
                                rect: el.getBoundingClientRect(),
                                visible: el.offsetParent !== null
                            };
                        }
                        return null;
                    })
                    .filter(item => item !== null);
            }''')

            if high_z_elements:
                print(f"   ⚠️ Found {len(high_z_elements)} high z-index elements:")
                for el in high_z_elements[:5]:  # Show first 5
                    visibility = "visible" if el['visible'] else "hidden"
                    print(f"      {el['tag']} (z-index: {el['zIndex']}) - {visibility}")
            else:
                print("   ✅ No problematic high z-index elements found")

            # Test 5: Interactive Element Accessibility
            print("\n5️⃣ ACCESSIBILITY CHECK:")
            print("-" * 30)

            # Check clickable elements
            clickable_selectors = [
                'button[aria-label="Toggle theme"]',
                '[role="tab"]',
                'button:not([disabled])'
            ]

            for selector in clickable_selectors:
                elements = page.locator(selector).all()
                accessible_count = 0
                for element in elements:
                    try:
                        if element.is_visible() and element.is_enabled():
                            # Check if element is actually clickable (not blocked)
                            element_info = page.evaluate('''(el) => {
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                return {
                                    pointerEvents: style.pointerEvents,
                                    visibility: style.visibility,
                                    opacity: style.opacity,
                                    inBounds: rect.width > 0 && rect.height > 0
                                };
                            }''', element.element_handle())

                            if (element_info['pointerEvents'] != 'none' and
                                element_info['visibility'] != 'hidden' and
                                float(element_info['opacity']) > 0 and
                                element_info['inBounds']):
                                accessible_count += 1
                    except:
                        pass

                print(f"   📋 {selector}: {accessible_count} accessible elements")

            # Final screenshot
            page.screenshot(path='/tmp/ui_test_final.png', full_page=True)
            print("\n📸 Final UI test screenshot: /tmp/ui_test_final.png")

        except Exception as e:
            print(f"❌ Test error: {e}")
            page.screenshot(path='/tmp/ui_test_error.png', full_page=True)
            print("📸 Error screenshot: /tmp/ui_test_error.png")

        finally:
            browser.close()

        print(f"\n📋 UI FUNCTIONALITY VERIFICATION COMPLETE")
        print("=" * 50)
        print("Screenshots generated:")
        print("- /tmp/ui_test_initial.png")
        print("- /tmp/ui_test_theme_changed.png")
        print("- /tmp/ui_test_final.png")
        print("\nAccess the test page at: http://localhost:3000/ui-test")

if __name__ == "__main__":
    verify_ui_functionality()