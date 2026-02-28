from playwright.sync_api import sync_playwright
import time

def verify_auto_edit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:3000")
        time.sleep(2) # Wait for initial load

        # Mock hasProject and hasClips to make button enabled
        # The button is disabled based on hasProject
        # Instead, we will type a prompt in the text area to trigger auto-edit directly

        # Find the text area and type the magic word
        textarea = page.locator("textarea[placeholder='Upload a video first...']")
        if textarea.count() > 0:
            print("Video needed to trigger auto-edit")
            page.screenshot(path="verification/initial_state.png")

        browser.close()

if __name__ == "__main__":
    verify_auto_edit()
