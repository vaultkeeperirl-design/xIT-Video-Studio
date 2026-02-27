from playwright.sync_api import sync_playwright

def verify_github_links():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto("http://localhost:5173/")

        # Wait for the app to load
        page.wait_for_selector("text=Help")

        # Click on Help menu
        page.click("text=Help")

        # Take a screenshot of the menu
        page.screenshot(path="verification/menu_screenshot.png")

        # Check if "About xIT Video Studio" is present and click it
        if page.is_visible("text=About xIT Video Studio"):
            print("About menu item found")
            page.click("text=About xIT Video Studio")

            # Wait for modal to appear
            page.wait_for_selector("text=GitHub")

            # Take a screenshot of the About modal
            page.screenshot(path="verification/about_modal_screenshot.png")

            # Verify the link href in the About modal
            github_link = page.get_attribute("a:has-text('GitHub')", "href")
            print(f"About Modal GitHub Link: {github_link}")

            if github_link == "https://github.com/vaultkeeperirl-design/xIT-Video-Studio":
                print("SUCCESS: About Modal GitHub link is correct")
            else:
                print(f"FAILURE: About Modal GitHub link is incorrect: {github_link}")
        else:
            print("About menu item not found")

        # Reload page to close modal and reset state
        page.reload()
        page.wait_for_selector("text=Help")
        page.click("text=Help")

        # Verify the documentation link action in the menu
        # Since window.open is used, we need to intercept it or check the action logic.
        # However, for verification script, we can't easily check the window.open target directly in a simple way
        # without mocking or handling the new page event if it actually opens.
        # But we can try to find the menu item and see if we can trigger it and catch the popup.

        try:
            with page.expect_popup() as popup_info:
                page.click("text=Documentation")
            popup = popup_info.value
            print(f"Documentation Link Target: {popup.url}")

            if popup.url == "https://github.com/vaultkeeperirl-design/xIT-Video-Studio":
                 print("SUCCESS: Documentation menu link is correct")
            else:
                 print(f"FAILURE: Documentation menu link is incorrect: {popup.url}")

        except Exception as e:
            print(f"Could not verify Documentation link directly via popup: {e}")

        browser.close()

if __name__ == "__main__":
    verify_github_links()
