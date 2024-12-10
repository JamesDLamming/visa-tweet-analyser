import json

def extract_tweets_with_visakanv_urls(tweets_array):
    # Initialize an empty list to store matching tweets
    matching_tweets = []
    
    # Flatten and handle the nested tweet structure
    flattened_tweets = []
    for tweet_item in tweets_array:
        if 'tweet' in tweet_item:  # Handle the nested tweet structure
            flattened_tweets.append(tweet_item['tweet'])
        elif isinstance(tweet_item, list):
            flattened_tweets.extend(tweet_item)
        else:
            flattened_tweets.append(tweet_item)
    
    # Iterate through each tweet object in the flattened array
    for tweet_obj in flattened_tweets:
        # Check if entities and urls exist
        if 'entities' in tweet_obj and 'urls' in tweet_obj['entities']:
            urls = tweet_obj['entities']['urls']
            
            # Check if any URL contains 'visakanv'
            for url in urls:
                if 'expanded_url' in url and 'visakanv' in url['expanded_url']:
                    # Add the entire tweet object to matching_tweets
                    matching_tweets.append(tweet_obj)
                    break  # Break once we find a matching URL in this tweet
    
    return matching_tweets

def main():
    # Read the JSON file
    print("Reading the JSON file...", flush=True)
    try:
        with open('tweets.json', 'r', encoding='utf-8') as file:
            json_data = json.load(file)
        
        # Extract matching tweets
        print("Extracting tweets with URLs containing 'visakanv'...", flush=True)
        matching_tweets = extract_tweets_with_visakanv_urls(json_data)
        
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