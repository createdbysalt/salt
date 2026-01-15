from playwright.sync_api import sync_playwright
import time

def fix_ui_issues():
    """
    Direct UI issue testing and diagnosis for the authenticated dashboard.
    This bypasses authentication by testing with an actual browser session.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for debugging
        context = browser.new_context()
        page = context.new_page()

        print("🔧 FIXING UI ISSUES - MANUAL SESSION")
        print("=" * 50)
        print("This will open a browser where you can:")
        print("1. Sign in manually")
        print("2. Navigate to dashboard/settings")
        print("3. Test the UI components")
        print()
        print("The script will then analyze what's working/broken.")
        print()

        try:
            # Navigate to the app
            print("🌐 Opening application...")
            page.goto('http://localhost:3000/')
            page.wait_for_load_state('networkidle')

            print("📋 INSTRUCTIONS:")
            print("1. Please sign in to your dashboard manually in the browser")
            print("2. Navigate to Settings")
            print("3. Press ENTER here when you're on the Settings page")

            input("Press ENTER when you're on the Settings page...")

            # Now analyze the authenticated settings page
            print("\n🔍 ANALYZING SETTINGS PAGE...")

            # Take diagnostic screenshot
            page.screenshot(path='/tmp/manual_settings_page.png', full_page=True)
            print("📸 Settings page screenshot: /tmp/manual_settings_page.png")

            # Test 1: Check for greeting header
            print("\n1️⃣ GREETING HEADER CHECK:")
            print("-" * 30)

            greeting_selectors = [
                'h1',
                '[data-testid*="greeting"]',
                '.page-greeting h1',
                'header h1'
            ]

            greeting_found = False
            for selector in greeting_selectors:
                elements = page.locator(selector).all()
                for element in elements:
                    if element.is_visible():
                        text = element.text_content()
                        if any(word in text.lower() for word in ['good', 'hey', 'welcome', 'morning', 'afternoon', 'evening']):
                            print(f"   ✅ Found greeting: '{text}'")
                            greeting_found = True
                            break

            if not greeting_found:
                print("   ❌ No personalized greeting found")
                # Check if PageGreetingHeader is in DOM but hidden
                all_h1s = page.locator('h1').all()
                print(f"   📋 All H1 elements found: {len(all_h1s)}")
                for h1 in all_h1s[:3]:
                    text = h1.text_content()
                    visible = h1.is_visible()
                    print(f"      H1: '{text}' (Visible: {visible})")

            # Test 2: Check tab functionality
            print("\n2️⃣ TAB FUNCTIONALITY CHECK:")
            print("-" * 30)

            # Look for tabs in Settings
            tab_selectors = [
                '[role="tab"]',
                'button:has-text("Profile")',
                'button:has-text("Notifications")',
                'button:has-text("Security")',
                'button:has-text("Billing")'
            ]

            working_tabs = 0
            total_tabs = 0

            for selector in tab_selectors:
                tabs = page.locator(selector).all()
                for tab in tabs:
                    if tab.is_visible():
                        total_tabs += 1
                        text = tab.text_content()

                        # Test clickability
                        try:
                            print(f"   Testing tab: {text}")

                            # Check current state
                            before_state = tab.get_attribute('aria-selected') or tab.get_attribute('data-state')

                            # Click tab
                            tab.click()
                            page.wait_for_timeout(500)

                            # Check if state changed or content updated
                            after_state = tab.get_attribute('aria-selected') or tab.get_attribute('data-state')

                            if before_state != after_state or after_state == 'active':
                                print(f"      ✅ Tab '{text}' is clickable and functional")
                                working_tabs += 1
                            else:
                                print(f"      ❌ Tab '{text}' click had no effect")

                        except Exception as e:
                            print(f"      ❌ Tab '{text}' click failed: {e}")

            print(f"   📊 Tab Summary: {working_tabs}/{total_tabs} tabs working")

            # Test 3: Theme Toggle
            print("\n3️⃣ THEME TOGGLE CHECK:")
            print("-" * 30)

            theme_selectors = [
                'button[aria-label="Toggle theme"]',
                'button:has([data-lucide="sun"])',
                'button:has([data-lucide="moon"])',
                '.theme-toggle'
            ]

            theme_toggle_found = False
            for selector in theme_selectors:
                toggles = page.locator(selector).all()
                for toggle in toggles:
                    if toggle.is_visible():
                        theme_toggle_found = True
                        print("   ✅ Theme toggle found")

                        # Get current theme
                        html_classes = page.locator('html').get_attribute('class') or ""
                        current_theme = "dark" if "dark" in html_classes else "light"
                        print(f"   📋 Current theme: {current_theme}")

                        # Check position and styles
                        position_info = page.evaluate('''(el) => {
                            const rect = el.getBoundingClientRect();
                            const style = getComputedStyle(el);
                            return {
                                visible: rect.width > 0 && rect.height > 0,
                                inViewport: rect.top >= 0 && rect.left >= 0 &&
                                           rect.bottom <= window.innerHeight &&
                                           rect.right <= window.innerWidth,
                                position: `top: ${rect.top}, left: ${rect.left}`,
                                zIndex: style.zIndex,
                                pointerEvents: style.pointerEvents,
                                opacity: style.opacity
                            };
                        }''', toggle.element_handle())

                        print(f"   📏 Toggle position: {position_info['position']}")
                        print(f"   🎨 Z-index: {position_info['zIndex']}, Pointer events: {position_info['pointerEvents']}")
                        print(f"   👁️ In viewport: {position_info['inViewport']}, Visible: {position_info['visible']}")

                        # Test click if it looks accessible
                        if position_info['inViewport'] and position_info['pointerEvents'] != 'none':
                            try:
                                print("   🖱️ Testing theme toggle click...")
                                toggle.click()
                                page.wait_for_timeout(1000)

                                # Check theme change
                                new_html_classes = page.locator('html').get_attribute('class') or ""
                                new_theme = "dark" if "dark" in new_html_classes else "light"

                                if new_theme != current_theme:
                                    print(f"   ✅ Theme toggle works! {current_theme} → {new_theme}")
                                else:
                                    print("   ❌ Theme toggle click had no effect")

                            except Exception as e:
                                print(f"   ❌ Theme toggle click failed: {e}")
                        else:
                            print("   ⚠️ Theme toggle appears blocked or inaccessible")

                        break

            if not theme_toggle_found:
                print("   ❌ No theme toggle found")

            # Test 4: CSS Issues Analysis
            print("\n4️⃣ CSS ANALYSIS:")
            print("-" * 30)

            # Check for overlays or blocking elements
            blocking_analysis = page.evaluate('''() => {
                // Check for invisible overlays
                const elements = document.querySelectorAll('*');
                const issues = [];

                elements.forEach(el => {
                    const style = getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    // High z-index invisible elements
                    if (parseInt(style.zIndex) > 1000 && style.opacity === '0') {
                        issues.push(`Invisible overlay: ${el.tagName} (z-index: ${style.zIndex})`);
                    }

                    // Large elements with pointer-events: none
                    if (style.pointerEvents === 'none' && rect.width > 100 && rect.height > 100) {
                        issues.push(`Blocked area: ${el.tagName} (${rect.width}x${rect.height})`);
                    }
                });

                return issues;
            }''')

            if blocking_analysis:
                print("   ⚠️ Potential blocking issues found:")
                for issue in blocking_analysis:
                    print(f"      {issue}")
            else:
                print("   ✅ No obvious CSS blocking issues detected")

            # Final screenshot
            page.screenshot(path='/tmp/manual_analysis_complete.png', full_page=True)
            print("\n📸 Analysis complete screenshot: /tmp/manual_analysis_complete.png")

            print("\n🎯 RECOMMENDATIONS:")
            print("-" * 30)
            if not greeting_found:
                print("   💡 Greeting Header: Check if PageGreetingHeader is rendering but hidden")
            if working_tabs < total_tabs:
                print("   💡 Tabs: Some tabs may have CSS pointer-events issues")
            if not theme_toggle_found:
                print("   💡 Theme Toggle: Check if it's in a collapsed card or hidden section")

        except KeyboardInterrupt:
            print("\n⏹️ Manual testing interrupted by user")
        except Exception as e:
            print(f"❌ Analysis error: {e}")

        finally:
            input("\nPress ENTER to close browser and continue...")
            browser.close()

        print("\n📋 MANUAL ANALYSIS COMPLETE")
        print("Screenshots saved for review")

if __name__ == "__main__":
    fix_ui_issues()