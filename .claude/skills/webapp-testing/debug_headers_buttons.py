from playwright.sync_api import sync_playwright

def debug_headers_and_buttons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 Debugging Headers and Button Issues...")
        print("=" * 50)

        # Navigate to homepage
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')

        print("\n📝 HEADER VISIBILITY INVESTIGATION:")
        print("-" * 30)

        # Find all heading elements and check their visibility
        headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        for heading_tag in headings:
            elements = page.locator(heading_tag).all()
            print(f"\n{heading_tag.upper()} Elements found: {len(elements)}")

            for i, element in enumerate(elements[:3]):  # Check first 3 of each type
                try:
                    text = element.text_content()
                    is_visible = element.is_visible()

                    # Get computed styles
                    styles = page.evaluate('''(el) => {
                        const computed = window.getComputedStyle(el);
                        return {
                            color: computed.color,
                            backgroundColor: computed.backgroundColor,
                            display: computed.display,
                            visibility: computed.visibility,
                            opacity: computed.opacity,
                            fontSize: computed.fontSize,
                            fontWeight: computed.fontWeight
                        };
                    }''', element.element_handle())

                    print(f"  {i+1}. Text: '{text[:50]}...' | Visible: {is_visible}")
                    if not is_visible or not text.strip():
                        print(f"     ❌ Styles: {styles}")
                    else:
                        print(f"     ✅ Color: {styles['color']}, Size: {styles['fontSize']}")

                except Exception as e:
                    print(f"  {i+1}. Error checking element: {e}")

        # Take screenshot of current state
        page.screenshot(path='/tmp/homepage_headers.png', full_page=True)
        print(f"\n📸 Homepage screenshot: /tmp/homepage_headers.png")

        # Look for main navigation or header areas
        print("\n🧭 NAVIGATION & HEADER AREAS:")
        print("-" * 30)

        nav_selectors = ['nav', 'header', '.header', '[role="banner"]', '.navigation']
        for selector in nav_selectors:
            elements = page.locator(selector).all()
            if elements:
                element = elements[0]
                text = element.text_content()
                is_visible = element.is_visible()
                print(f"  {selector}: Visible={is_visible}, Text='{text[:100]}...'")

        # Now test button clicking issues
        print("\n🔘 BUTTON INTERACTION TESTING:")
        print("-" * 30)

        # Find all buttons and test their clickability
        buttons = page.locator('button, [role="button"], .btn').all()
        print(f"Found {len(buttons)} button elements")

        for i, button in enumerate(buttons[:5]):  # Test first 5 buttons
            try:
                text = button.text_content() or "No text"
                is_visible = button.is_visible()
                is_enabled = button.is_enabled()

                # Check if button has click handlers
                has_click = page.evaluate('''(el) => {
                    return {
                        hasOnClick: !!el.onclick,
                        hasEventListeners: typeof el.addEventListener !== 'undefined'
                    };
                }''', button.element_handle())

                # Check CSS that might prevent clicking
                styles = page.evaluate('''(el) => {
                    const computed = window.getComputedStyle(el);
                    return {
                        pointerEvents: computed.pointerEvents,
                        zIndex: computed.zIndex,
                        position: computed.position,
                        display: computed.display
                    };
                }''', button.element_handle())

                print(f"  {i+1}. '{text[:30]}' | Visible: {is_visible} | Enabled: {is_enabled}")
                if not is_visible or not is_enabled or styles['pointerEvents'] == 'none':
                    print(f"     ❌ Issue: {styles}")
                else:
                    print(f"     ✅ Clickable")

            except Exception as e:
                print(f"  {i+1}. Error testing button: {e}")

        # Try to navigate to settings to test the light mode toggle
        print("\n🔧 TESTING SETTINGS PAGE:")
        print("-" * 30)

        # Look for settings link
        settings_links = page.locator('a[href*="setting"], a[href*="settings"], a:has-text("Settings")').all()
        if settings_links:
            try:
                settings_link = settings_links[0]
                href = settings_link.get_attribute('href')
                print(f"Found settings link: {href}")

                # Try to navigate to settings
                settings_link.click()
                page.wait_for_load_state('networkidle', timeout=5000)

                # Look for theme toggle
                theme_selectors = [
                    'button:has-text("Light")',
                    'button:has-text("Dark")',
                    '[data-testid*="theme"]',
                    '.theme-toggle',
                    'button[aria-label*="theme"]'
                ]

                for selector in theme_selectors:
                    toggle_buttons = page.locator(selector).all()
                    if toggle_buttons:
                        button = toggle_buttons[0]
                        text = button.text_content()
                        is_clickable = button.is_enabled() and button.is_visible()

                        print(f"  Found theme toggle: '{text}' | Clickable: {is_clickable}")

                        if is_clickable:
                            # Test actual click
                            try:
                                print("  Attempting to click theme toggle...")
                                button.click()
                                page.wait_for_timeout(1000)  # Wait for potential theme change

                                # Check if theme changed
                                new_classes = page.locator('html').get_attribute('class')
                                print(f"  After click - HTML classes: {new_classes}")
                            except Exception as e:
                                print(f"  ❌ Click failed: {e}")
                        break
                else:
                    print("  ❌ No theme toggle found")

                # Take screenshot of settings page
                page.screenshot(path='/tmp/settings_page.png', full_page=True)
                print(f"📸 Settings screenshot: /tmp/settings_page.png")

            except Exception as e:
                print(f"❌ Failed to navigate to settings: {e}")
        else:
            print("❌ No settings link found")
            # Try to manually navigate to common settings paths
            common_settings_paths = ['/dashboard/settings', '/settings', '/profile/settings']
            for path in common_settings_paths:
                try:
                    print(f"Trying path: {path}")
                    page.goto(f'http://localhost:3000{path}')
                    page.wait_for_load_state('networkidle', timeout=3000)
                    if page.url.endswith(path):
                        print(f"✅ Found settings at: {path}")
                        page.screenshot(path=f'/tmp/settings_{path.replace("/", "_")}.png')
                        break
                except:
                    continue

        browser.close()

        print(f"\n📋 SUMMARY:")
        print(f"- Check /tmp/homepage_headers.png for header visibility issues")
        print(f"- Check /tmp/settings_page.png for button interaction issues")
        print(f"- Look above for specific CSS problems identified")

if __name__ == "__main__":
    debug_headers_and_buttons()