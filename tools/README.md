# WeRead Authentication Tool

This tool helps you obtain WeRead cookies required for the API integration. It uses Selenium to automate the login process through QR code scanning.

## Prerequisites

1. Python 3.7 or higher
2. Chrome browser installed
3. ChromeDriver matching your Chrome version

## Installation

1. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

2. ChromeDriver Setup:
   - Option 1: Install ChromeDriver through your system's package manager
     ```bash
     # macOS (using Homebrew)
     brew install chromedriver
     
     # Ubuntu/Debian
     sudo apt install chromium-chromedriver
     ```
   
   - Option 2: Download ChromeDriver manually
     1. Check your Chrome version in Chrome menu -> Help -> About Google Chrome
     2. Download matching ChromeDriver from https://chromedriver.chromium.org/downloads
     3. Place the `chromedriver` executable in this directory

## Usage

1. Run the authentication script:
   ```bash
   python weread_auth.py
   ```

2. A Chrome window will open with WeRead's login QR code
3. Scan the QR code using your WeRead mobile app
4. After successful login, the script will:
   - Capture the required cookies
   - Save them to `.dev.vars` in the project root
   - Close the browser automatically

## Troubleshooting

1. **ChromeDriver Error**:
   - Ensure ChromeDriver version matches your Chrome browser version
   - Make sure ChromeDriver is in your PATH or in the tools directory

2. **Login Timeout**:
   - The script waits 60 seconds for QR code scanning
   - If timeout occurs, run the script again

3. **Cookie Save Error**:
   - Check if the script has write permissions for `.dev.vars`
   - Ensure the `.dev.vars` file is not locked by another process

## Security Notes

- The tool saves cookies in `.dev.vars` which should be kept secure
- Never commit `.dev.vars` to version control
- Cookies expire periodically; rerun the tool when they expire
- The Chrome window is visible by default for security (to see what you're logging into) 