from playwright.sync_api import sync_playwright

def verify_scrollbars():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with dimensions that force scrolling
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            # Navigate to the app
            print("Navigating to app...")
            page.goto("http://localhost:5173/")

            # Wait for the page to load
            print("Waiting for page load...")
            # Use a more generic selector that should exist
            page.wait_for_selector('div', state="attached", timeout=10000)

            print("Injecting content to force scroll...")
            # Inject CSS to force a long page and show scrollbars
            # We add a tall element to the body to force the main window scrollbar
            page.evaluate("""
                const div = document.createElement('div');
                div.style.height = '2000px';
                div.style.width = '100%';
                div.style.background = 'linear-gradient(to bottom, #18181b, #0dffff)';
                div.innerHTML = '<h1 style="color: white; padding: 20px;">Scroll down to see the scrollbar</h1>';
                document.body.appendChild(div);
            """)

            # Scroll a bit to make sure the scrollbar thumb is visible and not at the very top
            page.evaluate("window.scrollTo(0, 100)")

            # Take a screenshot of the entire page to see the main scrollbar
            print("Taking screenshot...")
            page.screenshot(path="verification/scrollbar_dark.png")

            print("Screenshot saved to verification/scrollbar_dark.png")

        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error_state.png")
                print("Error screenshot saved to verification/error_state.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_scrollbars()
