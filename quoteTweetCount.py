import json
import re
from collections import Counter

def extract_visakanv_tweet_ids(json_data):
    # Regular expression to extract tweet ID from visakanv URLs
    pattern = r'/visakanv/status/(\d+)'
    
    # List to store all visakanv tweet IDs
    tweet_ids = []
    
    # Iterate through each tweet
    for tweet in json_data:
        # Check if entities and urls exist
        if 'entities' in tweet and 'urls' in tweet['entities']:
            for url in tweet['entities']['urls']:
                if 'expanded_url' in url and 'visakanv' in url['expanded_url']:
                    # Try to extract the tweet ID using regex
                    match = re.search(pattern, url['expanded_url'])
                    if match:
                        tweet_ids.append(match.group(1))
    
    # Count occurrences of each tweet ID
    id_counts = Counter(tweet_ids)
    
    # Convert to desired output format and sort by count
    result = {
        "tweet_counts": sorted([
            {"tweet_id": tweet_id, "count": count}
            for tweet_id, count in id_counts.items()
        ], key=lambda x: x['count'], reverse=True)
    }
    
    return result

def main():
    # Read the input JSON file
    with open('selfQuotedTweets.json', 'r') as file:
        data = json.load(file)
    
    # Process the data
    result = extract_visakanv_tweet_ids(data)
    
    # Save the results
    with open('countSelfQuotes.json', 'w') as file:
        json.dump(result, file, indent=2)
    
    print("Results saved to countSelfQuotes.json")

if __name__ == "__main__":
    main()