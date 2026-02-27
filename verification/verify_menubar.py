from playwright.sync_api import sync_playwright, expect

def verify_menubar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Go to the app
        page.goto("http://localhost:5173")

        # Wait for the app to load
        page.wait_for_selector("text=YouTube")

        # Take a screenshot of the top bar
        menubar = page.locator(".app-region-drag").first
        menubar.screenshot(path="verification/menubar_icons.png")

        # Also take a full page screenshot
        page.screenshot(path="verification/full_page.png")

        browser.close()

if __name__ == "__main__":
    import os
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_menubar()
