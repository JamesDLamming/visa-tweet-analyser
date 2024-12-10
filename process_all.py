import os
import time
from datetime import datetime

def run_step(step_name, script_name):
    print(f"\n{'='*50}")
    print(f"Starting {step_name} at {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*50}")
    
    result = os.system(f'python3 {script_name}')
    if result != 0:
        result = os.system(f'python {script_name}')
    
    if result != 0:
        raise Exception(f"Error running {script_name}")
    
    
    if result != 0:
        raise Exception(f"Error running {script_name}")
    
    print(f"\n✓ Completed {step_name}")
    time.sleep(1)  # Small pause between steps for readability

def check_file_exists(filename):
    if not os.path.exists(filename):
        raise Exception(f"Expected output file {filename} not found!")

def main():
    print("Starting Twitter data processing pipeline...")
    
    # Create data directory if it doesn't exist
    os.makedirs('public', exist_ok=True)
    
    # Step 1: Download the data
    run_step("Download", "download.py")
    check_file_exists("visakanv.json")
    
    # Step 2: Create separate files from the raw data
    run_step("Create Files", "createFiles.py")
    check_file_exists("tweets.json")
    
    # Step 3: Find self-quotes
    run_step("Find Self Quotes", "findSelfQuotes.py")
    check_file_exists("selfQuotedTweets.json")
    
    # Step 4: Count quote tweets
    run_step("Count Quote Tweets", "quoteTweetCount.py")
    check_file_exists("countSelfQuotes.json")
    
    # Step 5: Extract tweet data
    run_step("Extract Tweet Data", "tweetData.py")
    check_file_exists("tweet_results.json")
    # Move JSON files to public directory
    json_files = [
        'tweets.json',
        'selfQuotedTweets.json',
        'countSelfQuotes.json',
        'tweet_results.json',
        'totalTweetLength.json',
        'upload.json',
        'account.json',
        'profile.json',
        'not_found_tweets.json'

    ]
    
    print("\nMoving JSON files to public directory...")
    for file in json_files:
        try:
            if os.path.exists(file):
                os.rename(file, f'public/{file}')
                print(f"✓ Moved {file} to public/")
        except Exception as e:
            print(f"! Error moving {file}: {str(e)}")
    
    print("\n✨ All processing completed successfully! ✨")
    print("\nOutput files created:")
    print("- visakanv.json (raw data)")
    print("- tweets.json (processed tweets)")
    print("- selfQuotedTweets.json (tweets with self-quotes)")
    print("- countSelfQuotes.json (quote counts)")
    print("- tweet_results.json (final results)")
    print("- not_found_tweets.json (missing tweets)")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("Processing pipeline failed!")
        exit(1) 