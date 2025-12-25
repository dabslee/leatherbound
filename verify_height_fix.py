import sys
import threading
import time
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
from playwright.sync_api import sync_playwright

def run_server():
    server = HTTPServer(('localhost', 3000), SimpleHTTPRequestHandler)
    print("Server started on port 3000")
    server.serve_forever()

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Wide Desktop Verification
        # Expectation: Height is FIXED (approx 2.9rem), Content scrolls internally.
        print("Verifying Wide Desktop (1920x1080)...")
        page_wide = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page_wide.goto('http://localhost:3000')
        page_wide.wait_for_selector('#quicklinks')

        app = page_wide.query_selector('#quicklinks')
        container = app.query_selector('#quicklinks-container')

        h1 = app.evaluate("el => el.getBoundingClientRect().height")

        # Inject many divs to force expansion if not constrained
        page_wide.evaluate("""
            const container = document.getElementById('quicklinks-container');
            for(let i=0; i<50; i++) {
                const div = document.createElement('div');
                div.style.width = '100px';
                div.style.height = '100px';
                div.style.border = '1px solid black';
                div.innerText = 'Item ' + i;
                container.appendChild(div);
            }
        """)

        page_wide.wait_for_timeout(500)
        h2 = app.evaluate("el => el.getBoundingClientRect().height")

        print(f"Wide Desktop Height: {h1} -> {h2}")
        if abs(h2 - h1) > 10:
            print("FAIL: Wide Desktop QuickLinks grew! Should be fixed.")
        else:
            print("PASS: Wide Desktop QuickLinks height fixed.")

        page_wide.close()

        # 2. Narrow Desktop Verification (Max Aspect Ratio 1.4/1)
        # Use 1000x1000 (AspectRatio 1.0).
        # Expectation: Height GROWS to fit content.
        print("Verifying Narrow Desktop (1000x1000)...")
        page_narrow = browser.new_page(viewport={'width': 1000, 'height': 1000})
        page_narrow.goto('http://localhost:3000')
        page_narrow.wait_for_selector('#quicklinks')

        app = page_narrow.query_selector('#quicklinks')

        h1 = app.evaluate("el => el.getBoundingClientRect().height")

        page_narrow.evaluate("""
            const container = document.getElementById('quicklinks-container');
            for(let i=0; i<50; i++) {
                const div = document.createElement('div');
                div.style.width = '100px';
                div.style.height = '100px';
                div.style.border = '1px solid black';
                div.innerText = 'Item ' + i;
                container.appendChild(div);
            }
        """)

        page_narrow.wait_for_timeout(500)
        h2 = app.evaluate("el => el.getBoundingClientRect().height")

        print(f"Narrow Desktop Height: {h1} -> {h2}")
        if h2 > h1 + 100:
            print("PASS: Narrow Desktop QuickLinks grew as expected.")
        else:
            print("FAIL: Narrow Desktop QuickLinks DID NOT grow!")

        page_narrow.close()

        # 3. Mobile Verification
        # Expectation: Weather is vertical.
        print("Verifying Mobile (375x812)...")
        page_mobile = browser.new_page(viewport={'width': 375, 'height': 812})
        page_mobile.goto('http://localhost:3000')
        page_mobile.wait_for_selector('.weather-content')

        direction = page_mobile.eval_on_selector('.weather-content', 'el => window.getComputedStyle(el).flexDirection')
        print(f"Mobile Weather Flex Direction: {direction}")

        if direction == 'column':
            print("PASS: Mobile weather is vertical.")
        else:
            print("FAIL: Mobile weather is not vertical.")

        page_mobile.close()
        browser.close()

if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    time.sleep(3)
    try:
        verify()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
