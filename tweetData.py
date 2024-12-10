import json

def load_json_file(filename):
    print(f"Attempting to load {filename}...", flush=True)
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"✓ Successfully loaded {filename}", flush=True)
            return data
    except FileNotFoundError:
        print(f"❌ Error: File not found: {filename}", flush=True)
        raise
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in file: {filename}", flush=True)
        raise

def extract_tweet_info():
    # Load both JSON files
    print("\n=== Starting tweet info extraction ===", flush=True)
    count_data = load_json_file('countSelfQuotes.json')
    tweets_data = load_json_file('tweets.json')
    
    # Create a dictionary of tweets for faster lookup
    print("\nCreating tweet dictionary...", flush=True)
    tweets_dict = {}
    tweet_count = 0
    
    print(f"Type of tweets_data: {type(tweets_data)}", flush=True)
    print(f"Length of tweets_data: {len(tweets_data)}", flush=True)
    
    for i, tweet_list in enumerate(tweets_data):
        if isinstance(tweet_list, list):
            print(f"Processing list {i} (length: {len(tweet_list)})", flush=True)
            for tweet_obj in tweet_list:
                if isinstance(tweet_obj, dict) and 'tweet' in tweet_obj:
                    tweet = tweet_obj['tweet']
                    if 'id_str' in tweet:
                        tweets_dict[tweet['id_str']] = tweet
                        tweet_count += 1
        elif isinstance(tweet_list, dict) and 'tweet' in tweet_list:
            tweet = tweet_list['tweet']
            if 'id_str' in tweet:
                tweets_dict[tweet['id_str']] = tweet
                tweet_count += 1

    print(f"✓ Processed {tweet_count} tweets into dictionary", flush=True)

    # Match counts with tweets
    print("\nMatching counts with tweets...", flush=True)
    results = []
    not_found_count = 0
    not_found_tweets = []  # List to store not found tweets
    
    print(f"Processing {len(count_data['tweet_counts'])} tweet counts", flush=True)
    
    for tweet_count in count_data['tweet_counts']:
        tweet_id = tweet_count['tweet_id']
        count = tweet_count['count']
        tweet = tweets_dict.get(tweet_id)
        
        if tweet:
            # Extract user mentions
            user_mentions = [
                {
                    'name': mention['name'],
                    'screen_name': mention['screen_name']
                }
                for mention in tweet.get('entities', {}).get('user_mentions', [])
            ]

            # Extract URLs
            urls = [
                {
                    'url': url['url'],
                    'expanded_url': url['expanded_url'],
                    'display_url': url['display_url']
                }
                for url in tweet.get('entities', {}).get('urls', [])
            ]

            result = {
                'tweet_id': tweet_id,
                'count': count,
                'tweet_text': tweet.get('full_text', ''),
                'retweeted': tweet.get('retweeted', False),
                'user_mentions': user_mentions,
                'urls': urls,
                'favorite_count': tweet.get('favorite_count', 0),
                'retweet_count': tweet.get('retweet_count', 0),
                'in_reply_to_screen_name': tweet.get('in_reply_to_screen_name'),
                'created_at': tweet.get('created_at')
            }
        else:
            not_found_count += 1
            not_found_tweet = {
                'tweet_id': tweet_id,
                'count': count,
                'tweet_text': 'Tweet not found',
                'retweeted': None,
                'user_mentions': [],
                'urls': [],
                'favorite_count': None,
                'retweet_count': None,
                'in_reply_to_screen_name': None
            }
            not_found_tweets.append(not_found_tweet)
            results.append(not_found_tweet)
            continue
            
        results.append(result)
    
    # Sort by count in descending order
    print("\nSorting tweets by count...", flush=True)
    results.sort(key=lambda x: x['count'], reverse=True)
    
    print(f"\nTweets not found: {not_found_count}", flush=True)
    
    print("\nSaving results...", flush=True)
    with open('tweet_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Write not found tweets to the second JSON file
    with open('not_found_tweets.json', 'w', encoding='utf-8') as f:
        json.dump(not_found_tweets, f, ensure_ascii=False, indent=2)
    
    print("✓ Processing complete!", flush=True)

if __name__ == "__main__":
    extract_tweet_info()