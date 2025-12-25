import sys
import threading
import time
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
from playwright.sync_api import sync_playwright

def run_server():
    # Serve the current directory (which will be 'build')
    server = HTTPServer(('localhost', 3000), SimpleHTTPRequestHandler)
    print("Server started on port 3000")
    server.serve_forever()

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.goto('http://localhost:3000')

        # Wait for app to load
        try:
            page.wait_for_selector('.app', timeout=5000)
        except:
            print("Timeout waiting for .app")
            # snapshot
            page.screenshot(path='error_snapshot.png')
            sys.exit(1)

        # Find an app with a textarea (e.g., Schedule or Notes)
        app_handle = page.query_selector('.app:has(textarea)')

        if not app_handle:
            print("No app with textarea found.")
            sys.exit(1)

        textarea = app_handle.query_selector('textarea')

        # Get initial height
        initial_height = app_handle.evaluate("el => el.getBoundingClientRect().height")
        print(f"Initial height: {initial_height}")

        # Add a lot of text
        long_text = "Line\n" * 50
        textarea.fill(long_text)

        # Wait a bit for layout update
        page.wait_for_timeout(1000)

        # Get new height
        new_height = app_handle.evaluate("el => el.getBoundingClientRect().height")
        print(f"New height: {new_height}")

        diff = new_height - initial_height
        print(f"Height difference: {diff}")

        if diff > 10: # Allow small tolerance
            print(f"FAIL: App grew by {diff}px")
            browser.close()
            sys.exit(1)
        else:
            print("PASS: App height did not change significantly.")
            browser.close()
            sys.exit(0)

if __name__ == "__main__":
    # Ensure we are in the build directory
    if not os.path.exists('index.html'):
        print("Error: index.html not found. Are you in the build directory?")
        sys.exit(1)

    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()

    time.sleep(3) # Wait for server

    try:
        verify()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
