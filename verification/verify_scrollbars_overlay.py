from playwright.sync_api import sync_playwright

def verify_scrollbars():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173/")

            print("Waiting for page load...")
            page.wait_for_selector('text=Assets', timeout=10000)

            print("Injecting test overlay with scrollbar...")
            # Create a fixed position overlay with overflow-y: scroll and plenty of content
            # This ensures we see the custom scrollbar styles applied globally
            page.evaluate("""
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '50px';
                overlay.style.left = '50px';
                overlay.style.width = '300px';
                overlay.style.height = '300px';
                overlay.style.backgroundColor = '#18181b'; // zinc-900
                overlay.style.border = '2px solid #0dffff'; // brand color
                overlay.style.zIndex = '9999';
                overlay.style.overflowY = 'scroll';
                overlay.style.padding = '10px';

                // Add content to force scroll
                let content = '<h3 style="color: white; margin-bottom: 10px;">Dark Scrollbar Test</h3>';
                for(let i = 0; i < 20; i++) {
                    content += `<div style="margin-bottom: 10px; padding: 10px; background: #27272a; color: #a1a1aa;">Item ${i+1}: demonstrating the dark scrollbar style.</div>`;
                }
                overlay.innerHTML = content;

                document.body.appendChild(overlay);

                // Scroll the overlay a bit
                overlay.scrollTop = 50;
            """)

            # Take a screenshot of the page which should now include our overlay
            print("Taking screenshot...")
            page.screenshot(path="verification/scrollbar_dark_overlay.png")
            print("Screenshot saved to verification/scrollbar_dark_overlay.png")

        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error_state_overlay.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_scrollbars()
