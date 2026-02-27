from playwright.sync_api import sync_playwright, expect

def verify_renames():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Go to the app
        page.goto("http://localhost:5173")

        # Wait for the app to load
        page.wait_for_selector("text=Smart Assistant")

        # Verify renamed tabs
        expect(page.get_by_role("button", name="Smart Assistant")).to_be_visible()
        expect(page.get_by_role("button", name="AI Image Lab")).to_be_visible()
        expect(page.get_by_role("button", name="AI Video Lab")).to_be_visible()

        # Click on AI Image Lab and verify its header
        page.get_by_role("button", name="AI Image Lab").click()
        expect(page.get_by_role("heading", name="AI Image Lab")).to_be_visible()

        # Click on AI Video Lab and verify its header
        page.get_by_role("button", name="AI Video Lab").click()
        expect(page.get_by_role("heading", name="AI Video Lab")).to_be_visible()

        # Take a screenshot of the right panel
        right_panel = page.locator("aside, .h-full.flex.flex-col.bg-zinc-900").last # Adjusted selector for right panel
        page.screenshot(path="verification/renamed_panels.png")

        browser.close()

if __name__ == "__main__":
    import os
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_renames()
