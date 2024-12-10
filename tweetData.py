import json

def load_json_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_tweet_info():
    # Load both JSON files
    print("Loading JSON files...", flush=True)
    count_data = load_json_file('countSelfQuotes.json')
    tweets_data = load_json_file('tweets.json')
    
    # Create a dictionary of tweets for faster lookup
    print("Creating tweet dictionary...", flush=True)
    tweets_dict = {}
    for tweet_list in tweets_data:
        if isinstance(tweet_list, list):
            for tweet in tweet_list:
                tweets_dict[tweet['id_str']] = tweet
        else:
            tweets_dict[tweet_list['id_str']] = tweet_list

    # Match counts with tweets
    print("Matching counts with tweets...", flush=True)
    results = []
    not_found_count = 0
    not_found_tweets = []  # List to store not found tweets
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
            not_found_tweets.append({
                'tweet_id': tweet_id,
                'count': count,
                'tweet_text': 'Tweet not found',
                'retweeted': None,
                'user_mentions': [],
                'urls': [],
                'favorite_count': None,
                'retweet_count': None,
                'in_reply_to_screen_name': None
            })
            result = {
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
            
        results.append(result)
    
    # Sort by count in descending order
    print("Sorting tweets by count...", flush=True)
    results.sort(key=lambda x: x['count'], reverse=True)
    

    print("Tweets not found: ", not_found_count, flush=True)
    
    with open('tweet_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Write not found tweets to the second JSON file
    with open('not_found_tweets.json', 'w', encoding='utf-8') as f:
        json.dump(not_found_tweets, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    extract_tweet_info()