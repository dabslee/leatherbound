
from playwright.sync_api import sync_playwright

def verify_data_tab():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000')

        # Click Configure button
        page.click('button:has-text("Configure")')

        # Click Data tab
        page.click('button:has-text("Data")')

        # Verify Data tab content
        page.wait_for_selector('h3:has-text("Account & Sync")')
        page.wait_for_selector('h3:has-text("Backup & Restore")')
        page.wait_for_selector('button:has-text("Login")')
        page.wait_for_selector('button:has-text("Register")')

        # Take screenshot
        page.screenshot(path='verification/data_tab.png')
        browser.close()

if __name__ == '__main__':
    verify_data_tab()
