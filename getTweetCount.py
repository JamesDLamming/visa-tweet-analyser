import requests

# Supabase connection details
SUPABASE_URL = "https://fabxmporizzqflnftavs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhYnhtcG9yaXp6cWZsbmZ0YXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIyNDQ5MTIsImV4cCI6MjAzNzgyMDkxMn0.UIEJiUNkLsW28tBHmG-RQDW-I5JNlJLt62CSk9D_qG8"

def get_total_tweets():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "count=exact"
    }
    
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/tweets?account_id=eq.16884623&select=count",
            headers=headers
        )
        print(response.json())
        response.raise_for_status()  # Raise an exception for bad status codes
        count = response.json()
        print(f"Total tweets in database: {count}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")

def get_upload_dates():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/archive_upload?account_id=eq.16884623&select=*",
            headers=headers
        )
        response.raise_for_status()
        dates = response.json()
        print(f"Upload dates: {dates[0]['end_date']}")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    get_total_tweets()
    get_upload_dates()


