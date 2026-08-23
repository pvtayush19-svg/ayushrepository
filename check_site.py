from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console messages
    page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}".encode('ascii', 'ignore').decode('ascii')))
    
    # Capture page errors
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    # Navigate to the Vercel site
    try:
        page.goto("https://medocarezt.vercel.app/admin/login", wait_until="networkidle")
        
        page.fill("input[type='email']", "admin@medocare.com")
        page.fill("input[type='password']", "@Yush_007*@")
        page.click("button[type='submit']")
        
        page.wait_for_timeout(5000)
        toasts = page.locator(".sonner-toast").all_inner_texts()
        print(f"TOASTS: {toasts}")
        print(f"URL: {page.url}")
    except Exception as e:
        print(f"Error navigating: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
