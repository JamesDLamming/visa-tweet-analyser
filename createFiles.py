import pandas as pd
import json
from tqdm import tqdm
import os

def process_json_file(input_file='visakanv.json'):
    print("Starting JSON processing...")
    
    # Initialize empty lists to store data
    tweets_data = []
    account_data = []
    profile_data = []
    upload_data = []

    print("Reading and processing JSON file...")
    # Create progress bar based on file size
    file_size = os.path.getsize(input_file)
    pbar = tqdm(total=file_size, desc="Processing", unit='B', unit_scale=True)
    
    # Process the file line by line
    current_pos = 0
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            # Update progress bar
            current_pos += len(line.encode('utf-8'))
            pbar.update(len(line.encode('utf-8')))
            
            try:
                data = json.loads(line)
                if 'tweets' in data and data['tweets'] is not None:
                    # Extend the list instead of appending
                    if isinstance(data['tweets'], list):
                        tweets_data.extend(data['tweets'])
                    else:
                        tweets_data.append(data['tweets'])
                if 'account' in data and data['account'] is not None:
                    account_data.append(data['account'])
                if 'profile' in data and data['profile'] is not None:
                    profile_data.append(data['profile'])
                if 'upload-options' in data and data['upload-options'] is not None:
                    upload_data.append(data['upload-options'])
            except json.JSONDecodeError:
                continue  # Skip invalid JSON lines
    
    pbar.close()
    print("\nSaving extracted data to separate files...")
    
    if tweets_data:
        print(f"Saving {len(tweets_data)} tweets...")
        with open('tweets.json', 'w', encoding='utf-8') as f:
            json.dump(tweets_data, f, ensure_ascii=False, indent=2)
        print("✓ Saved tweets.json")

    if account_data:
        print("Saving account data...")
        with open('account.json', 'w', encoding='utf-8') as f:
            json.dump(account_data, f, ensure_ascii=False, indent=2)
        print("✓ Saved account.json")

    if profile_data:
        print("Saving profile data...")
        with open('profile.json', 'w', encoding='utf-8') as f:
            json.dump(profile_data, f, ensure_ascii=False, indent=2)
        print("✓ Saved profile.json")

    if upload_data:
        print("Saving upload data...")
        with open('upload.json', 'w', encoding='utf-8') as f:
            json.dump(upload_data, f, ensure_ascii=False, indent=2)
        print("✓ Saved upload.json")

    if tweets_data:
        print("Saving total tweet count...")
        total_tweets_length = len(tweets_data)
        with open('totalTweetLength.json', 'w', encoding='utf-8') as f:
            json.dump(total_tweets_length, f, ensure_ascii=False, indent=2)
        print(f"✓ Saved totalTweetLength.json with {total_tweets_length} tweets")

    print("\nProcessing complete! ✨")

if __name__ == "__main__":
    process_json_file()