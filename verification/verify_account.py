
from playwright.sync_api import sync_playwright

def verify_account_tab():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000')

        # Click Configure button
        page.click('button:has-text("Configure")')

        # Click Account tab
        page.click('button:has-text("Account")')

        # Verify Account tab content
        page.wait_for_selector('button:has-text("Login")')
        page.wait_for_selector('button:has-text("Register")')

        # Take screenshot
        page.screenshot(path='verification/account_tab.png')
        browser.close()

if __name__ == '__main__':
    verify_account_tab()
