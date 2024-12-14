import json
from collections import Counter, defaultdict
import re
from tqdm import tqdm
import time

def retry_on_failure(step_name, func, *args, **kwargs):
    """Wrapper to retry a function once if it fails"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        print(f"\nFirst attempt of {step_name} failed with error: {str(e)}")
        print("Retrying in 2 seconds...", flush=True)
        time.sleep(2)
        try:
            return func(*args, **kwargs)
        except Exception as e:
            raise Exception(f"Step '{step_name}' failed after retry with error: {str(e)}")

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

def find_self_quotes(tweets_array):
    print("\n=== Finding self-quoted tweets ===", flush=True)
    matching_tweets = []
    
    # Flatten and handle the nested tweet structure
    flattened_tweets = []
    for tweet_item in tweets_array:
        if 'tweet' in tweet_item:
            flattened_tweets.append(tweet_item['tweet'])
        elif isinstance(tweet_item, list):
            flattened_tweets.extend(tweet_item)
        else:
            flattened_tweets.append(tweet_item)
    
    for tweet_obj in flattened_tweets:
        if 'entities' in tweet_obj and 'urls' in tweet_obj['entities']:
            urls = tweet_obj['entities']['urls']
            for url in urls:
                if 'expanded_url' in url and 'visakanv' in url['expanded_url']:
                    matching_tweets.append(tweet_obj)
                    break
    
    print(f"Found {len(matching_tweets)} self-quoted tweets", flush=True)
    return matching_tweets

def count_quote_tweets(self_quoted_tweets):
    print("\n=== Counting quote tweets ===", flush=True)
    pattern = r'/visakanv/status/(\d+)'
    tweet_ids = []
    
    for tweet in self_quoted_tweets:
        if 'entities' in tweet and 'urls' in tweet['entities']:
            for url in tweet['entities']['urls']:
                if 'expanded_url' in url and 'visakanv' in url['expanded_url']:
                    match = re.search(pattern, url['expanded_url'])
                    if match:
                        tweet_ids.append(match.group(1))
    
    id_counts = Counter(tweet_ids)
    result = {
        "tweet_counts": sorted([
            {"tweet_id": tweet_id, "count": count}
            for tweet_id, count in id_counts.items()
        ], key=lambda x: x['count'], reverse=True)
    }
    
    print(f"Processed {len(result['tweet_counts'])} unique quoted tweets", flush=True)
    return result

def extract_tweet_info(tweets_data, count_data):
    print("\n=== Extracting tweet info ===", flush=True)
    
    # Create a dictionary of tweets for faster lookup
    print("\nCreating tweet dictionary...", flush=True)
    tweets_dict = {}
    tweet_count = 0
    
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

    results = []
    not_found_tweets = []
    not_found_count = 0
    
    for tweet_count in count_data['tweet_counts']:
        tweet_id = tweet_count['tweet_id']
        count = tweet_count['count']
        tweet = tweets_dict.get(tweet_id)
        
        if tweet:
            result = {
                'tweet_id': tweet_id,
                'count': count,
                'tweet_text': tweet.get('full_text', ''),
                'retweeted': tweet.get('retweeted', False),
                'user_mentions': [
                    {
                        'name': mention['name'],
                        'screen_name': mention['screen_name']
                    }
                    for mention in tweet.get('entities', {}).get('user_mentions', [])
                ],
                'urls': [
                    {
                        'url': url['url'],
                        'expanded_url': url['expanded_url'],
                        'display_url': url['display_url']
                    }
                    for url in tweet.get('entities', {}).get('urls', [])
                ],
                'favorite_count': tweet.get('favorite_count', 0),
                'retweet_count': tweet.get('retweet_count', 0),
                'in_reply_to_screen_name': tweet.get('in_reply_to_screen_name'),
                'created_at': tweet.get('created_at')
            }
            results.append(result)
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
    
    results.sort(key=lambda x: x['count'], reverse=True)
    print(f"\nTweets not found: {not_found_count}", flush=True)
    return results, not_found_tweets

def find_threads(tweets_data):
    print("\n=== Finding threads ===", flush=True)
    
    # Create a dictionary to store tweets by their ID
    print("Creating tweets by id")
    tweets_by_id = {tweet['tweet']['id_str']: tweet['tweet'] for tweet in tweets_data}
    
    print("Creating reply to tweet mapping")
    # Create a dictionary to map reply tweets to their parent tweets
    reply_to_tweet = defaultdict(list)
    for tweet in tweets_data:
        tweet_data = tweet['tweet']
        if tweet_data.get('in_reply_to_status_id_str'):
            reply_to_tweet[tweet_data['in_reply_to_status_id_str']].append(tweet_data)

    print("Finding thread starts")
    # Find thread starting points (original tweets that have replies)
    thread_starts = set()
    for tweet in tweets_data:
        tweet_data = tweet['tweet']
        tweet_id = tweet_data['id_str']
        
        # Only consider tweets that are not replies and have replies
        if (not tweet_data.get('in_reply_to_status_id_str') and 
            tweet_id in reply_to_tweet):
            thread_starts.add(tweet_id)

    print(f"Found {len(thread_starts)} thread starts")

    print("Building threads")
    threads = {}
    for start_id in tqdm(thread_starts, desc="Building threads"):
        thread = []
        current_tweet = tweets_by_id[start_id]
        thread.append(current_tweet)
        
        # Follow the reply chain
        current_id = start_id
        while current_id in reply_to_tweet:
            replies = reply_to_tweet[current_id]
            # Sort replies by timestamp
            replies.sort(key=lambda x: x['created_at'])
            # Take the first reply
            next_tweet = replies[0]
            thread.append(next_tweet)
            current_id = next_tweet['id_str']
        
        if len(thread) > 1:
            # Calculate thread metrics
            thread_length = len(thread)
            total_likes = sum(int(t.get('favorite_count', 0) or 0) for t in thread)
            total_retweets = sum(int(t.get('retweet_count', 0) or 0) for t in thread)
            thread_start_date = thread[0]['created_at']
            thread_end_date = thread[-1]['created_at']
            
            threads[start_id] = {
                'metadata': {
                    'length': thread_length,
                    'total_likes': total_likes,
                    'total_retweets': total_retweets,
                    'start_date': thread_start_date,
                    'end_date': thread_end_date
                },
                'tweets': [{
                    'tweet_id': t['id_str'],
                    'text': t['full_text'],
                    'created_at': t['created_at'],
                    'order': idx + 1,
                    'favorite_count': int(t.get('favorite_count', 0) or 0),
                    'retweet_count': int(t.get('retweet_count', 0) or 0),
                    'urls': [
                        {
                            'url': url.get('url'),
                            'expanded_url': url.get('expanded_url'),
                            'display_url': url.get('display_url')
                        }
                        for url in t.get('entities', {}).get('urls', [])
                    ],
                    'in_reply_to_status_id': t.get('in_reply_to_status_id_str'),
                    'in_reply_to_user_id_str': t.get('in_reply_to_user_id_str')
                } for idx, t in enumerate(thread)]
            }

    # Calculate thread statistics
    print("Calculating thread statistics")
    total_threads = len(threads)
    
    if total_threads > 0:
        thread_lengths = [thread['metadata']['length'] for thread in threads.values()]
        longest_thread_id = max(threads.keys(), key=lambda k: threads[k]['metadata']['length'])
        longest_thread_length = threads[longest_thread_id]['metadata']['length']
        average_thread_length = sum(thread_lengths) / len(thread_lengths)
        
        stats = {
            'total_threads': total_threads,
            'longest_thread': {
                'length': longest_thread_length,
                'thread_id': longest_thread_id,
                'first_tweet_text': threads[longest_thread_id]['tweets'][0]['text'],
                'total_likes': threads[longest_thread_id]['metadata']['total_likes'],
                'total_retweets': threads[longest_thread_id]['metadata']['total_retweets']
            },
            'average_thread_length': round(average_thread_length, 2)
        }
    else:
        stats = {
            'total_threads': 0,
            'longest_thread': None,
            'average_thread_length': 0
        }
    
    return threads, stats

def main():
    try:
        # Load tweets.json once
        tweets_data = retry_on_failure("Load tweets.json", load_json_file, 'tweets.json')
        
        # Find self-quoted tweets
        print("\n=== Finding self-quoted tweets ===", flush=True)
        self_quoted_tweets = retry_on_failure("Find self-quoted tweets", find_self_quotes, tweets_data)
        with open('selfQuotedTweets.json', 'w', encoding='utf-8') as f:
            json.dump(self_quoted_tweets, f, indent=2, ensure_ascii=False)
        
        # Count quote tweets
        print("\n=== Counting quote tweets ===", flush=True)
        count_data = retry_on_failure("Count quote tweets", count_quote_tweets, self_quoted_tweets)
        with open('countSelfQuotes.json', 'w', encoding='utf-8') as f:
            json.dump(count_data, f, indent=2, ensure_ascii=False)
        
        # Extract tweet info
        print("\n=== Extracting tweet info ===", flush=True)
        results, not_found_tweets = retry_on_failure("Extract tweet info", extract_tweet_info, tweets_data, count_data)
        with open('tweet_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        with open('not_found_tweets.json', 'w', encoding='utf-8') as f:
            json.dump(not_found_tweets, f, indent=2, ensure_ascii=False)
        
        # Find threads
        print("\n=== Finding threads ===", flush=True)
        threads, thread_stats = retry_on_failure("Find threads", find_threads, tweets_data)
        with open('twitter_threads.json', 'w', encoding='utf-8') as f:
            json.dump(threads, f, indent=2, ensure_ascii=False)
        with open('thread_statistics.json', 'w', encoding='utf-8') as f:
            json.dump(thread_stats, f, indent=2, ensure_ascii=False)
        
        print("\n✨ Processing complete!", flush=True)
        
    except Exception as e:
        print("\n" + "="*50)
        print("❌ PROCESSING FAILED")
        print("="*50)
        print(f"Error details: {str(e)}")
        print("\nPartial outputs may have been created for steps that completed successfully.")
        raise

if __name__ == "__main__":
    main()