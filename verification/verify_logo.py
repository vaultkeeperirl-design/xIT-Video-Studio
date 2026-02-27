import time
from playwright.sync_api import sync_playwright

def verify_logo():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Give the server a moment to start up if needed, though usually npm run dev is fast
        # We can also poll or retry, but a simple wait or just goto is often enough for a local dev server
        # that was started in the background.

        try:
            print("Navigating to http://localhost:5173...")
            page.goto("http://localhost:5173", timeout=60000)

            # Wait for the app to load
            page.wait_for_load_state("networkidle")

            # Take a screenshot of the header area where the logo is
            # The header has a specific class or we can just screenshot the top part
            print("Taking screenshot...")
            page.screenshot(path="verification/logo_verification.png")

            # Also try to specifically locate the logo image to verify it's there
            logo = page.locator('img[alt="xIT Logo"]')
            if logo.is_visible():
                print("Logo is visible!")
            else:
                print("Logo NOT found or not visible!")

            # Check title
            title = page.title()
            print(f"Page title: {title}")

        except Exception as e:
            print(f"Error: {e}")
            # Take a screenshot even if there was an error, might show 404 or something
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_logo()
