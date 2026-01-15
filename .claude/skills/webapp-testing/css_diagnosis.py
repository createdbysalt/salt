from playwright.sync_api import sync_playwright

def diagnose_css_loading():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🔍 Navigating to localhost:3000...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')  # Wait for JS and CSS to load

        # Take screenshot to see visual state
        print("📸 Taking screenshot...")
        page.screenshot(path='/tmp/homepage_state.png', full_page=True)

        # Check if any CSS files are loaded
        print("\n🎨 CSS Resources Loaded:")
        stylesheets = page.locator('link[rel="stylesheet"]').all()
        for i, sheet in enumerate(stylesheets):
            href = sheet.get_attribute('href')
            print(f"  {i+1}. {href}")

        # Check for style tags (inline CSS)
        print("\n📝 Style Tags Found:")
        style_tags = page.locator('style').all()
        for i, style in enumerate(style_tags):
            content_preview = style.text_content()[:100] if style.text_content() else "Empty"
            print(f"  {i+1}. {content_preview}...")

        # Check for Tailwind classes in the DOM
        print("\n🧵 Checking for Tailwind classes in DOM...")
        body_classes = page.locator('body').get_attribute('class') or ""
        html_classes = page.locator('html').get_attribute('class') or ""
        print(f"  HTML classes: {html_classes}")
        print(f"  Body classes: {body_classes}")

        # Look for common Tailwind utility classes
        tailwind_selectors = [
            '[class*="bg-"]', '[class*="text-"]', '[class*="p-"]',
            '[class*="m-"]', '[class*="flex"]', '[class*="grid"]'
        ]

        for selector in tailwind_selectors:
            elements = page.locator(selector).all()
            if elements:
                print(f"  Found {len(elements)} elements with {selector}")
                # Show first few examples
                for i, el in enumerate(elements[:3]):
                    classes = el.get_attribute('class')
                    print(f"    Example {i+1}: {classes}")

        # Check browser console for errors
        print("\n🚨 Console Errors:")
        console_logs = []
        def handle_console_msg(msg):
            if msg.type in ['error', 'warning']:
                console_logs.append(f"{msg.type.upper()}: {msg.text}")

        page.on('console', handle_console_msg)

        # Reload to capture any loading errors
        page.reload()
        page.wait_for_load_state('networkidle')

        for log in console_logs:
            print(f"  {log}")

        if not console_logs:
            print("  No console errors detected")

        # Check computed styles on a test element
        print("\n💅 Checking computed styles...")
        try:
            # Look for any button or common element
            test_elements = page.locator('button, [class*="btn"], [class*="button"]').all()
            if test_elements:
                element = test_elements[0]
                styles = page.evaluate("""
                    (element) => {
                        const computed = window.getComputedStyle(element);
                        return {
                            backgroundColor: computed.backgroundColor,
                            color: computed.color,
                            fontSize: computed.fontSize,
                            padding: computed.padding,
                            margin: computed.margin
                        };
                    }
                """, element.element_handle())
                print(f"  Sample element styles: {styles}")
            else:
                print("  No test elements found for style inspection")
        except Exception as e:
            print(f"  Error inspecting styles: {e}")

        # Check if Tailwind CSS is actually being applied
        print("\n🔧 Tailwind CSS Detection:")
        try:
            # Check if CSS variables are defined (from our theme)
            css_vars = page.evaluate("""
                () => {
                    const style = getComputedStyle(document.documentElement);
                    return {
                        primary: style.getPropertyValue('--primary'),
                        background: style.getPropertyValue('--background'),
                        foreground: style.getPropertyValue('--foreground')
                    };
                }
            """)
            print(f"  CSS Variables: {css_vars}")

            if any(css_vars.values()):
                print("  ✅ CSS variables are loaded")
            else:
                print("  ❌ CSS variables not found - theme not loading")

        except Exception as e:
            print(f"  Error checking CSS variables: {e}")

        browser.close()
        print("\n📋 Screenshot saved to: /tmp/homepage_state.png")

if __name__ == "__main__":
    diagnose_css_loading()