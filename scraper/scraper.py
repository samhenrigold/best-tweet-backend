import os
import json
import requests
from requests_oauthlib import OAuth1
from supabase import create_client, Client
from dotenv import load_dotenv
from random import randint
from time import sleep
import pyperclip

load_dotenv()

# Supabase initialization
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Twitter OAuth setup
auth = OAuth1(os.environ.get("CONSUMER_KEY"), os.environ.get("CONSUMER_SECRET"), 
              os.environ.get("ACCESS_TOKEN"), os.environ.get("ACCESS_SECRET"))

# Base URL for Twitter API requests
BASE_URL = 'https://api.twitter.com/2/timeline/conversation/'

def random_sleep():
    duration = randint(0, 6)
    print(f"Sleeping for {duration} seconds")
    sleep(duration)

def fetch_conversation(tweet_id: str):
    try:
        response = requests.get(
            f"{BASE_URL}{tweet_id}.json",
            params={
                "ext": "altText",
                "contributor_details": "0",
                "include_cards": "0",
                "include_carousels": "0",
                "include_entities": "0",
                "include_ext_media_color": "false",
                "include_media_features": "false",
                "include_my_retweet": "0",
                "include_profile_interstitial_type": "false",
                "include_profile_location": "false",
                "include_reply_count": "0",
                "include_user_entities": "false",
                "include_user_hashtag_entities": "false",
                "include_user_mention_entities": "false",
                "include_user_symbol_entities": "false",
                "tweet_mode": "extended",
            },
            auth=auth
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'HTTP Request failed: {e}')
        return None

def upsert_to_supabase(table_name: str, data: dict):
    # response = supabase.table(table_name).upsert(data).execute()
    # assert len(response.data) > 0, "Upsert operation failed"
    return

def extract_alt_text_madness(media: dict):
    alt_text = None
    if 'ext' in media and isinstance(media['ext'], dict):
        alt_text_dict = media['ext'].get('altText')
        if isinstance(alt_text_dict, dict):
            r_value = alt_text_dict.get('r')
            if isinstance(r_value, dict):
                alt_text = r_value.get('ok')  # Extract 'ok' if r_value is a dict
            else:
                alt_text = r_value  # Use r_value directly if it's not a dict
    return alt_text if alt_text not in [None, 'Missing'] else ''

def process_tweet(tweet: dict):
    print(f"Processing {tweet['id']}")
    # Extract and upsert author data
    author = tweet.get('user')
    if author:
        upsert_to_supabase("users", {
            "user_id": author['id'],
            "name": author['name'],
            "screen_name": author['screen_name'],
            "profile_image_url_https": author['profile_image_url_https']
        })

    # Upsert tweet data
    upsert_to_supabase("tweets", {
        "tweet_id": tweet['id'],
        "created_at": tweet['created_at'],
        "full_text": tweet['full_text'],
        "user_id": tweet['user_id'],
        "in_reply_to_status_id": tweet.get('in_reply_to_status_id'),
        "retweet_count": tweet['retweet_count'],
        "favorite_count": tweet['favorite_count'],
        "lang": tweet['lang']
    })

    # Process and upsert media data if available


    if 'extended_entities' in tweet:
        for media in tweet['extended_entities']['media']:
            if media['type'] == 'video':
                highestMp4 = None
                for variant in media['video_info']['variants']:
                    if variant['content_type'] == 'video/mp4':
                        if not highestMp4 or variant['bitrate'] > highestMp4['bitrate']:
                            highestMp4 = variant
                print(highestMp4['url'])
                pyperclip.copy(highestMp4['url'])
            else:
                upsert_to_supabase("tweet_media", {
                    "media_id": media['id'],
                    "tweet_id": tweet['id'],
                    "media_url_https": media['media_url_https'],
                    "type": media['type'],
                    "width": media['original_info']['width'],
                    "height": media['original_info']['height'],
                    "alt_text": extract_alt_text_madness(media),
                })

def main():
    # Get a list of tweet_ids from ./complete_list.txt (line break separated)
    tweet_ids = []
    with open('complete_list.txt', 'r') as f:
        tweet_ids = f.read().splitlines()

    for tweet_id in tweet_ids:
        random_sleep()

        conversation = fetch_conversation(tweet_id)
        
        # Create a json file and dump the conversation data.
        with open(f'conversation_{tweet_id}.json', 'w') as f:
            json.dump(conversation, f, indent=4)

        if not conversation:
            continue

        global_objects = conversation.get('globalObjects', {})
        tweets = global_objects.get('tweets', {})
        users = global_objects.get('users', {})

        focused_tweet = tweets.get(tweet_id)
        if not focused_tweet:
            continue

        # Add user data to tweet
        focused_tweet['user'] = users.get(focused_tweet.get('user_id_str'))

        # Process focused tweet and its author
        process_tweet(focused_tweet)

        # Process replying tweet and its author if available
        reply_to_id = focused_tweet.get('in_reply_to_status_id_str')
        if reply_to_id:
            replying_tweet = tweets.get(reply_to_id)
            if replying_tweet:
                replying_tweet['user'] = users.get(replying_tweet.get('user_id_str'))
                process_tweet(replying_tweet)

if __name__ == "__main__":
    main()
