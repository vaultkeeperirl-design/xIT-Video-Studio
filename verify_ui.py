from playwright.sync_api import sync_playwright
import time

def verify_ui_elements():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the app
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            # Wait for the page to load and the toolbar to be visible
            # The toolbar has specific text content we can look for
            print("Waiting for toolbar...")
            page.wait_for_selector("text=Split", timeout=30000)

            # Take a screenshot of the entire page
            print("Taking full page screenshot...")
            page.screenshot(path="verification_full.png")

            # Take a screenshot of just the toolbar area
            # We'll try to find the container that holds the tools
            # Based on the code: <div className="flex items-center gap-1 px-4 py-3 bg-zinc-900/30 border-b border-zinc-800/50">
            toolbar = page.locator("text=Split").locator("..").locator("..")

            print("Taking toolbar screenshot...")
            toolbar.screenshot(path="verification_toolbar.png")

            print("Verification complete!")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Take a screenshot even if it fails, to see what happened
            page.screenshot(path="verification_error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui_elements()
