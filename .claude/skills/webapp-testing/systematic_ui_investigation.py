from playwright.sync_api import sync_playwright
import json

def systematic_ui_investigation():
    """
    Systematic debugging of UI interaction issues:
    1. Settings tab buttons not clickable
    2. Light mode button misplaced/not clickable
    3. Missing personalized greeting headers
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 SYSTEMATIC UI DEBUGGING")
        print("=" * 60)
        print("Issues to investigate:")
        print("1. Settings tab buttons not clickable")
        print("2. Light mode button misplaced/not clickable")
        print("3. Missing personalized greeting headers")
        print()

        try:
            # Phase 1: Root Cause Investigation
            print("📋 PHASE 1: ROOT CAUSE INVESTIGATION")
            print("-" * 40)

            # Navigate to dashboard settings
            print("🌐 Navigating to dashboard settings...")
            page.goto('http://localhost:3000/dashboard/settings')
            page.wait_for_load_state('networkidle', timeout=10000)

            # Take initial screenshot
            page.screenshot(path='/tmp/settings_initial_state.png', full_page=True)
            print("📸 Initial screenshot: /tmp/settings_initial_state.png")

            # Check if we're actually on settings or redirected to auth
            current_url = page.url
            print(f"📍 Current URL: {current_url}")

            if 'signin' in current_url or 'login' in current_url:
                print("❌ Redirected to authentication - testing public routes instead")

                # Test homepage first
                page.goto('http://localhost:3000/')
                page.wait_for_load_state('networkidle', timeout=5000)
                page.screenshot(path='/tmp/homepage_for_debugging.png', full_page=True)
                print("📸 Homepage screenshot: /tmp/homepage_for_debugging.png")

                current_url = page.url
                print(f"📍 Homepage URL: {current_url}")

            # Phase 2: Element Discovery and Interaction Testing
            print("\n🔍 PHASE 2: ELEMENT DISCOVERY & INTERACTION")
            print("-" * 40)

            # 1. Check for personalized greeting headers
            print("\n1️⃣ PERSONALIZED GREETING HEADER INVESTIGATION:")
            print("-" * 30)

            # Look for various header patterns from the greetings.md
            greeting_selectors = [
                'h1:has-text("Good morning")',
                'h1:has-text("Good afternoon")',
                'h1:has-text("Good evening")',
                'h1:has-text("Hey")',
                'h1:has-text("Welcome back")',
                '[data-testid*="greeting"]',
                '.greeting',
                '.page-greeting',
                '.page-header h1',
                'header h1'
            ]

            greeting_found = False
            for selector in greeting_selectors:
                elements = page.locator(selector).all()
                if elements:
                    element = elements[0]
                    text = element.text_content()
                    is_visible = element.is_visible()
                    print(f"   ✅ Found greeting: '{text}' | Visible: {is_visible}")
                    greeting_found = True

                    # Check styles
                    styles = page.evaluate('''(el) => {
                        const computed = window.getComputedStyle(el);
                        return {
                            color: computed.color,
                            display: computed.display,
                            visibility: computed.visibility,
                            opacity: computed.opacity,
                            fontSize: computed.fontSize
                        };
                    }''', element.element_handle())
                    print(f"      Styles: {styles}")
                    break

            if not greeting_found:
                print("   ❌ No personalized greeting found")
                # Search page content for greeting-related terms
                content = page.content()
                greeting_keywords = ['Good morning', 'Good afternoon', 'Good evening', 'Hey', 'Welcome back']
                for keyword in greeting_keywords:
                    if keyword in content:
                        print(f"      Found '{keyword}' in page content but not in visible headers")

            # 2. Check all tab buttons if we're on settings
            print("\n2️⃣ TAB BUTTON CLICKABILITY INVESTIGATION:")
            print("-" * 30)

            tab_selectors = [
                '[role="tab"]',
                '[data-value="profile"]',
                '[data-value="notifications"]',
                '[data-value="security"]',
                '[data-value="billing"]',
                'button:has-text("Profile")',
                'button:has-text("Notifications")',
                'button:has-text("Security")',
                'button:has-text("Billing")'
            ]

            tabs_found = []
            for selector in tab_selectors:
                elements = page.locator(selector).all()
                for element in elements:
                    text = element.text_content() or "No text"
                    if 'Profile' in text or 'Notifications' in text or 'Security' in text or 'Billing' in text:
                        is_visible = element.is_visible()
                        is_enabled = element.is_enabled()

                        # Check for interaction blockers
                        styles = page.evaluate('''(el) => {
                            const computed = window.getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            return {
                                pointerEvents: computed.pointerEvents,
                                zIndex: computed.zIndex,
                                position: computed.position,
                                opacity: computed.opacity,
                                width: rect.width,
                                height: rect.height,
                                top: rect.top,
                                left: rect.left
                            };
                        }''', element.element_handle())

                        print(f"   Tab: '{text}' | Visible: {is_visible} | Enabled: {is_enabled}")
                        print(f"      Position: top={styles['top']}, left={styles['left']}")
                        print(f"      Size: {styles['width']}x{styles['height']}")
                        print(f"      Pointer Events: {styles['pointerEvents']}")
                        print(f"      Z-Index: {styles['zIndex']}")

                        tabs_found.append({
                            'text': text,
                            'visible': is_visible,
                            'enabled': is_enabled,
                            'element': element,
                            'styles': styles
                        })

                        # Test actual click if element seems clickable
                        if is_visible and is_enabled and styles['pointerEvents'] != 'none':
                            try:
                                print(f"      🖱️ Testing click on '{text}'...")
                                element.click()
                                page.wait_for_timeout(1000)

                                # Check if anything changed
                                active_tab = page.locator('[role="tab"][aria-selected="true"]').first
                                if active_tab.is_visible():
                                    active_text = active_tab.text_content()
                                    print(f"      ✅ Click successful - active tab: '{active_text}'")
                                else:
                                    print(f"      ❌ Click had no visible effect")

                            except Exception as e:
                                print(f"      ❌ Click failed: {e}")

            if not tabs_found:
                print("   ❌ No tab buttons found")

            # 3. Light mode button investigation
            print("\n3️⃣ THEME TOGGLE BUTTON INVESTIGATION:")
            print("-" * 30)

            # Look for theme toggle in various locations
            theme_selectors = [
                'button[aria-label="Toggle theme"]',
                'button:has([data-lucide="sun"])',
                'button:has([data-lucide="moon"])',
                'button:has-text("Light")',
                'button:has-text("Dark")',
                '.theme-toggle',
                '[data-testid*="theme"]'
            ]

            theme_buttons = []
            for selector in theme_selectors:
                elements = page.locator(selector).all()
                for element in elements:
                    is_visible = element.is_visible()
                    is_enabled = element.is_enabled()

                    # Get detailed positioning info
                    position_info = page.evaluate('''(el) => {
                        const rect = el.getBoundingClientRect();
                        const computed = window.getComputedStyle(el);
                        return {
                            rect: {
                                top: rect.top,
                                left: rect.left,
                                width: rect.width,
                                height: rect.height,
                                bottom: rect.bottom,
                                right: rect.right
                            },
                            styles: {
                                position: computed.position,
                                transform: computed.transform,
                                pointerEvents: computed.pointerEvents,
                                zIndex: computed.zIndex,
                                opacity: computed.opacity,
                                overflow: computed.overflow
                            },
                            aria: {
                                label: el.getAttribute('aria-label'),
                                disabled: el.getAttribute('aria-disabled')
                            }
                        };
                    }''', element.element_handle())

                    print(f"   Theme Toggle Found:")
                    print(f"      Visible: {is_visible} | Enabled: {is_enabled}")
                    print(f"      Position: {position_info['rect']}")
                    print(f"      Styles: {position_info['styles']}")
                    print(f"      ARIA: {position_info['aria']}")

                    # Check if button is "misplaced" (outside viewport or overlapped)
                    viewport_size = page.viewport_size
                    rect = position_info['rect']

                    is_in_viewport = (
                        rect['top'] >= 0 and
                        rect['left'] >= 0 and
                        rect['bottom'] <= viewport_size['height'] and
                        rect['right'] <= viewport_size['width']
                    )

                    print(f"      In viewport: {is_in_viewport}")
                    print(f"      Viewport size: {viewport_size}")

                    # Test clicking if seems accessible
                    if is_visible and is_enabled and is_in_viewport:
                        try:
                            print(f"      🖱️ Testing theme toggle click...")

                            # Get current theme state
                            html_classes = page.locator('html').get_attribute('class') or ""
                            current_theme = "dark" if "dark" in html_classes else "light"
                            print(f"         Current theme: {current_theme}")

                            # Perform click
                            element.click()
                            page.wait_for_timeout(1000)

                            # Check if theme changed
                            new_html_classes = page.locator('html').get_attribute('class') or ""
                            new_theme = "dark" if "dark" in new_html_classes else "light"
                            print(f"         New theme: {new_theme}")

                            if new_theme != current_theme:
                                print(f"      ✅ Theme toggle works! {current_theme} → {new_theme}")
                            else:
                                print(f"      ❌ Theme toggle click had no effect")

                        except Exception as e:
                            print(f"      ❌ Theme toggle click failed: {e}")

                    theme_buttons.append({
                        'visible': is_visible,
                        'enabled': is_enabled,
                        'position': position_info,
                        'in_viewport': is_in_viewport
                    })

            if not theme_buttons:
                print("   ❌ No theme toggle buttons found")

            # Phase 3: CSS Interference Analysis
            print("\n🎨 PHASE 3: CSS INTERFERENCE ANALYSIS")
            print("-" * 40)

            # Check for potential CSS issues that could block interactions
            css_issues = page.evaluate('''() => {
                const issues = [];

                // Check for global pointer-events: none
                const body = document.body;
                const bodyStyle = window.getComputedStyle(body);
                if (bodyStyle.pointerEvents === 'none') {
                    issues.push('Body has pointer-events: none');
                }

                // Check for overlapping elements with high z-index
                const allElements = document.querySelectorAll('*');
                const highZElements = [];
                allElements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const zIndex = parseInt(style.zIndex);
                    if (zIndex > 1000) {
                        highZElements.push({
                            tag: el.tagName,
                            id: el.id,
                            classes: el.className,
                            zIndex: zIndex,
                            rect: el.getBoundingClientRect()
                        });
                    }
                });

                if (highZElements.length > 0) {
                    issues.push(`Found ${highZElements.length} elements with z-index > 1000`);
                }

                // Check for CSS that might hide content
                const hiddenElements = [];
                document.querySelectorAll('h1, h2, button, [role="tab"]').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                        hiddenElements.push({
                            tag: el.tagName,
                            text: el.textContent?.slice(0, 30),
                            issue: `${style.display === 'none' ? 'display:none' : style.visibility === 'hidden' ? 'visibility:hidden' : 'opacity:0'}`
                        });
                    }
                });

                return {
                    issues,
                    highZElements,
                    hiddenElements
                };
            }''')

            print(f"CSS Issues Found: {len(css_issues['issues'])}")
            for issue in css_issues['issues']:
                print(f"   ⚠️ {issue}")

            print(f"\nHigh Z-Index Elements: {len(css_issues['highZElements'])}")
            for el in css_issues['highZElements'][:5]:  # Show first 5
                print(f"   📏 {el['tag']} (z-index: {el['zIndex']}) - {el['classes'][:50]}")

            print(f"\nHidden Interactive Elements: {len(css_issues['hiddenElements'])}")
            for el in css_issues['hiddenElements'][:10]:  # Show first 10
                print(f"   👻 {el['tag']}: '{el['text']}' - {el['issue']}")

            # Phase 4: Network and Console Errors
            print("\n🚨 PHASE 4: ERROR ANALYSIS")
            print("-" * 40)

            # Capture console logs
            console_logs = []
            def handle_console_msg(msg):
                if msg.type in ['error', 'warning']:
                    console_logs.append(f"{msg.type.upper()}: {msg.text}")

            page.on('console', handle_console_msg)

            # Reload to capture any loading errors
            page.reload()
            page.wait_for_load_state('networkidle')

            print("Console Errors/Warnings:")
            if console_logs:
                for log in console_logs[-10:]:  # Last 10 logs
                    print(f"   🚨 {log}")
            else:
                print("   ✅ No console errors detected")

        except Exception as e:
            print(f"❌ Investigation error: {e}")
            page.screenshot(path='/tmp/investigation_error.png', full_page=True)
            print("📸 Error screenshot: /tmp/investigation_error.png")

        finally:
            # Final comprehensive screenshot
            page.screenshot(path='/tmp/final_investigation_state.png', full_page=True)
            print(f"\n📸 Final screenshot: /tmp/final_investigation_state.png")
            browser.close()

        print(f"\n📋 INVESTIGATION COMPLETE")
        print("=" * 60)
        print("Screenshots generated:")
        print("- /tmp/settings_initial_state.png")
        print("- /tmp/homepage_for_debugging.png")
        print("- /tmp/final_investigation_state.png")
        print("\nNext: Analyze screenshots and implement fixes based on findings")

if __name__ == "__main__":
    systematic_ui_investigation()