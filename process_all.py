import os
import time
from datetime import datetime

def run_step(step_name, script_name):
    print(f"\n{'='*50}")
    print(f"Starting {step_name} at {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*50}")
    
    # Clear any existing error status
    _ = os.system('exit 0')
    
    # Try python3 first
    print(f"Attempting with python3...", flush=True)
    result = os.system(f'python3 {script_name}')
    
    # If python3 fails, try python
    if result != 0:
        print(f"\nPython3 attempt failed. Trying with python...", flush=True)
        time.sleep(2)
        # Clear error status before retry
        _ = os.system('exit 0')
        result = os.system(f'python {script_name}')
    
    # If both attempts fail
    if result != 0:
        print("\n" + "="*50)
        print(f"❌ {step_name} FAILED")
        print("="*50)
        print(f"Both python3 and python attempts failed for {script_name}")
        raise Exception(f"Error running {script_name} after both attempts")
    
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
    
    # Step 3: Process tweets
    run_step("Process Tweets", "processTweets.py")
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
        'not_found_tweets.json',
        'twitter_threads.json',
        'thread_statistics.json'  # Added new statistics file
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
    print("- twitter_threads.json (thread data)")
    print("- thread_statistics.json (thread metrics)")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("Processing pipeline failed!")
        exit(1) 