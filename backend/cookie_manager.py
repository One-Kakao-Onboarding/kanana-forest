"""
YouTube Cookie Manager using Selenium
Selenium으로 로그인 후 쿠키를 Netscape 형식으로 직접 내보내기
"""

import os
import time
import subprocess
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from dotenv import load_dotenv

load_dotenv()

# 쿠키 파일 경로
CHROME_PROFILE_DIR = Path("/app/chrome-profile")

# 쿠키 파일 우선순위:
# 1. 외부에서 마운트된 쿠키 파일 (수동 추출)
# 2. 자동 생성된 쿠키 파일
MOUNTED_COOKIE_FILE = Path("/app/cookies/cookies.txt")  # 수동으로 추출한 쿠키 파일 (마운트)
AUTO_COOKIE_FILE = Path("/app/cookies/youtube_cookies.txt")  # 자동 생성된 쿠키 파일

def get_cookie_file():
    """사용 가능한 쿠키 파일 반환 (마운트된 파일 우선)"""
    if MOUNTED_COOKIE_FILE.exists() and MOUNTED_COOKIE_FILE.stat().st_size > 100:
        print(f"[CookieManager] Using mounted cookie file: {MOUNTED_COOKIE_FILE}")
        return MOUNTED_COOKIE_FILE
    elif AUTO_COOKIE_FILE.exists() and AUTO_COOKIE_FILE.stat().st_size > 100:
        print(f"[CookieManager] Using auto-generated cookie file: {AUTO_COOKIE_FILE}")
        return AUTO_COOKIE_FILE
    return None

# 호환성을 위한 COOKIE_FILE 변수
COOKIE_FILE = AUTO_COOKIE_FILE

# Google 계정 정보
GOOGLE_EMAIL = os.getenv("GOOGLE_EMAIL")
GOOGLE_PASSWORD = os.getenv("GOOGLE_PASSWORD")


def get_chrome_driver(use_incognito=False):
    """
    Headless Chromium 드라이버 생성

    Args:
        use_incognito: True면 incognito 모드로 실행 (YouTube 쿠키 추출용)
    """
    # 프로필 디렉토리 생성 (incognito가 아닐 때만)
    if not use_incognito:
        CHROME_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    # Incognito 모드 또는 영구 프로필
    if use_incognito:
        options.add_argument("--incognito")
        print("[CookieManager] Using incognito mode for cookie extraction")
    else:
        options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
        options.add_argument("--profile-directory=Default")

    # Chromium 바이너리 경로 설정
    options.binary_location = "/usr/bin/chromium"

    # Automation 감지 우회
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    from selenium.webdriver.chrome.service import Service
    service = Service("/usr/bin/chromedriver")

    driver = webdriver.Chrome(service=service, options=options)

    # webdriver 속성 숨기기
    try:
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            """
        })
    except:
        pass

    return driver


def google_login(driver):
    """Google 계정으로 로그인"""
    if not GOOGLE_EMAIL or not GOOGLE_PASSWORD:
        print("[CookieManager] Google credentials not found in environment")
        return False

    try:
        print(f"[CookieManager] Logging in as {GOOGLE_EMAIL}...")

        # Google 로그인 페이지로 이동
        driver.get("https://accounts.google.com/signin/v2/identifier?service=youtube")
        time.sleep(3)

        # 이메일 입력
        try:
            email_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
            )
            email_input.clear()
            email_input.send_keys(GOOGLE_EMAIL)
            email_input.send_keys(Keys.RETURN)
            print("[CookieManager] Email entered")
            time.sleep(3)
        except Exception as e:
            print(f"[CookieManager] Failed to enter email: {str(e)}")
            return False

        # 비밀번호 입력
        try:
            password_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
            )
            password_input.clear()
            password_input.send_keys(GOOGLE_PASSWORD)
            password_input.send_keys(Keys.RETURN)
            print("[CookieManager] Password entered")
            time.sleep(5)
        except Exception as e:
            print(f"[CookieManager] Failed to enter password: {str(e)}")
            return False

        # 로그인 후 robots.txt로 이동 (YouTube 쿠키 rotation 방지)
        # 문서: https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp
        print("[CookieManager] Navigating to robots.txt to prevent cookie rotation...")
        driver.get("https://www.youtube.com/robots.txt")
        time.sleep(3)

        # 로그인 상태 확인 (YouTube 메인으로 이동)
        driver.get("https://www.youtube.com")
        time.sleep(2)

        try:
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "button#avatar-btn, img#img[alt*='Avatar'], ytd-topbar-menu-button-renderer"))
            )
            print("[CookieManager] Login successful!")
            # 다시 robots.txt로 이동해서 쿠키를 안전하게 유지
            driver.get("https://www.youtube.com/robots.txt")
            time.sleep(2)
            return True
        except:
            print("[CookieManager] Login verification failed - may require 2FA or CAPTCHA")
            try:
                driver.save_screenshot("/app/cookies/login_debug.png")
            except:
                pass
            return False

    except Exception as e:
        print(f"[CookieManager] Login error: {str(e)}")
        return False


def export_cookies_to_netscape(driver, output_path):
    """
    Selenium 드라이버에서 쿠키를 Netscape 형식으로 내보내기
    """
    try:
        cookies = driver.get_cookies()

        # Netscape 쿠키 파일 형식으로 작성
        lines = ["# Netscape HTTP Cookie File"]
        lines.append("# https://curl.haxx.se/rfc/cookie_spec.html")
        lines.append("# This is a generated file! Do not edit.")
        lines.append("")  # 빈 줄 추가

        for cookie in cookies:
            # domain, flag, path, secure, expiration, name, value
            domain = cookie.get('domain', '')
            # domain이 .으로 시작하면 TRUE, 아니면 FALSE
            flag = "TRUE" if domain.startswith('.') else "FALSE"
            path = cookie.get('path', '/')
            secure = "TRUE" if cookie.get('secure', False) else "FALSE"
            # 만료 시간 (없으면 세션 쿠키 - 0)
            expiry = cookie.get('expiry', 0)
            if expiry == 0:
                expiry = int(time.time()) + 86400 * 365  # 1년 후
            name = cookie.get('name', '')
            value = cookie.get('value', '')

            line = f"{domain}\t{flag}\t{path}\t{secure}\t{expiry}\t{name}\t{value}"
            lines.append(line)

        # 파일로 저장
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', newline='\n') as f:
            f.write('\n'.join(lines))
            f.write('\n')  # 파일 끝 개행

        print(f"[CookieManager] Exported {len(cookies)} cookies to {output_path}")
        return True

    except Exception as e:
        print(f"[CookieManager] Failed to export cookies: {str(e)}")
        return False


def setup_browser_profile():
    """
    Incognito 모드로 로그인 후 쿠키를 Netscape 형식으로 내보내기

    YouTube의 쿠키 rotation을 방지하기 위한 권장 방식:
    1. Incognito/Private 창에서 로그인
    2. robots.txt로 이동
    3. 쿠키 추출
    4. 즉시 브라우저 종료

    참고: https://github.com/yt-dlp/yt-dlp/wiki/FAQ#exporting-youtube-cookies
    """
    driver = None
    try:
        print("[CookieManager] Setting up browser profile (incognito mode)...")
        # Incognito 모드로 드라이버 생성
        driver = get_chrome_driver(use_incognito=True)

        # Google 로그인 시도 (로그인 후 자동으로 robots.txt로 이동됨)
        login_success = google_login(driver)

        if login_success:
            # 쿠키를 Netscape 형식으로 즉시 내보내기
            # 추가 페이지 방문 없이 바로 쿠키 추출 (rotation 방지)
            export_cookies_to_netscape(driver, COOKIE_FILE)
            print("[CookieManager] Cookie extraction complete. Closing incognito session...")

        return login_success

    except Exception as e:
        print(f"[CookieManager] Error: {str(e)}")
        return False
    finally:
        if driver:
            # Incognito 세션을 즉시 종료하여 쿠키 rotation 방지
            driver.quit()
            print("[CookieManager] Incognito session closed")


def fetch_youtube_cookies():
    """
    Incognito 모드에서 브라우저 로그인 후 쿠키 추출

    주의: --cookies-from-browser 방식은 사용하지 않음 (yt-dlp FAQ 권장사항)
    대신 Selenium으로 직접 쿠키를 Netscape 형식으로 추출
    """
    return setup_browser_profile()


def get_cookie_file_path():
    """쿠키 파일 경로 반환, 없으면 생성"""
    if not COOKIE_FILE.exists():
        print("[CookieManager] Cookie file not found, fetching...")
        fetch_youtube_cookies()

    return str(COOKIE_FILE) if COOKIE_FILE.exists() else None




def refresh_cookies_if_needed():
    """쿠키가 오래되었으면 갱신 (6시간 기준)"""
    if not COOKIE_FILE.exists():
        return fetch_youtube_cookies()

    mtime = COOKIE_FILE.stat().st_mtime
    age_hours = (time.time() - mtime) / 3600

    if age_hours > 6:
        print(f"[CookieManager] Cookies are {age_hours:.1f} hours old, refreshing...")
        return fetch_youtube_cookies()

    print(f"[CookieManager] Cookies are {age_hours:.1f} hours old, still valid")
    return True


if __name__ == "__main__":
    print("Setting up YouTube cookies...")
    success = fetch_youtube_cookies()
    print(f"Success: {success}")

    if COOKIE_FILE.exists():
        print(f"\nCookie file: {COOKIE_FILE}")
        print(f"Size: {COOKIE_FILE.stat().st_size} bytes")
