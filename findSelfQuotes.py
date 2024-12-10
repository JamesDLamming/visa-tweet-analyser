import json

def extract_tweets_with_visakanv_urls(tweets_array):
    # Initialize an empty list to store matching tweets
    matching_tweets = []
    
    # Iterate through each tweet object in the flattened array
    for tweet_obj in tweets_array:
        if 'tweet' not in tweet_obj:
            continue
            
        tweet_data = tweet_obj['tweet']
        
        # Check if entities and urls exist
        if 'entities' in tweet_data and 'urls' in tweet_data['entities']:
            urls = tweet_data['entities']['urls']
            
            # Check if any URL contains 'visakanv'
            for url in urls:
                if 'expanded_url' in url and 'visakanv' in url['expanded_url']:
                    # Add the entire tweet object to matching_tweets
                    matching_tweets.append(tweet_data)
                    break  # Break once we find a matching URL in this tweet
    
    return matching_tweets

def main():
    # Read the JSON file
    print("Reading the JSON file...", flush=True)
    try:
        with open('tweets.json', 'r', encoding='utf-8') as file:
            json_data = json.load(file)
        
        # Flatten the nested array structure
        flattened_tweets = []
        for tweet_array in json_data:
            flattened_tweets.extend(tweet_array)
        
        # Extract matching tweets
        print("Extracting tweets with URLs containing 'visakanv'...", flush=True)
        matching_tweets = extract_tweets_with_visakanv_urls(flattened_tweets)
        
        # Save the results to a new JSON file
        with open('selfQuotedTweets.json', 'w', encoding='utf-8') as file:
            json.dump(matching_tweets, file, indent=2)
        
        print(f"Found {len(matching_tweets)} tweets with URLs containing 'visakanv'", flush=True)
        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()