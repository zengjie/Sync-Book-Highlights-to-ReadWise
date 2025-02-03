#!/usr/bin/env python3
import json
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

class WeReadAuthenticator:
    def __init__(self):
        self.login_url = "https://weread.qq.com/web/shelf#login"
        
    def setup_driver(self):
        """Setup Chrome driver with appropriate options"""
        chrome_options = Options()
        # Uncomment the following line to run headless if needed
        # chrome_options.add_argument('--headless')
        chrome_options.add_argument('--window-size=800,600')
        
        # Try to use chromedriver from PATH, fallback to local
        try:
            driver = webdriver.Chrome(options=chrome_options)
        except:
            # If chromedriver is not in PATH, try to use local one
            current_dir = os.path.dirname(os.path.abspath(__file__))
            chromedriver_path = os.path.join(current_dir, 'chromedriver')
            service = Service(chromedriver_path)
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
        return driver

    def get_cookies(self):
        """Launch browser and get WeRead cookies after QR code login"""
        driver = self.setup_driver()
        
        try:
            # Navigate to login page
            driver.get(self.login_url)
            print("Please scan the QR code to login...")
            
            # Wait for successful login (max 60 seconds)
            # We detect successful login by checking if we're redirected away from login page
            try:
                WebDriverWait(driver, 60).until(
                    lambda driver: "login" not in driver.current_url
                )
            except TimeoutException:
                print("Login timeout. Please try again.")
                driver.quit()
                return None
            
            print("Login successful: ", driver.current_url)

            # Small delay to ensure all cookies are set
            time.sleep(2)
            
            # Get all cookies
            cookies = driver.get_cookies()
            
            # Filter and format required cookies
            weread_cookies = {}
            for cookie in cookies:
                if cookie['name'].startswith('wr_'):
                    weread_cookies[cookie['name']] = cookie['value']
            
            # Verify we have at least some cookies
            if not weread_cookies:
                print("No WeRead cookies (wr_*) found")
                return None
                
            return weread_cookies
            
        finally:
            driver.quit()

    def save_cookies(self, cookies, output_file='.dev.vars'):
        """Save cookies to the specified file"""
        if not cookies:
            return False
            
        try:
            # Read existing .dev.vars if it exists
            env_vars = {}
            if os.path.exists(output_file):
                with open(output_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            env_vars[key] = value

            # Update WEREAD_COOKIES
            env_vars['WEREAD_COOKIES'] = json.dumps(cookies)
            
            # Write back all variables
            with open(output_file, 'w', encoding='utf-8') as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")
                    
            print(f"Cookies saved to {output_file}")
            return True
            
        except Exception as e:
            print(f"Error saving cookies: {e}")
            return False

def main():
    authenticator = WeReadAuthenticator()
    print("Launching browser for WeRead login...")
    cookies = authenticator.get_cookies()
    
    if cookies:
        print("Successfully obtained WeRead cookies!")
        if authenticator.save_cookies(cookies):
            print("Cookies have been saved to .dev.vars")
            print("You can now use these cookies for WeRead API access")
        else:
            print("Failed to save cookies")
    else:
        print("Failed to obtain WeRead cookies")

if __name__ == "__main__":
    main() 