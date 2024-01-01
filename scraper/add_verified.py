import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Supabase client initialization
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def read_user_ids(file_path):
    user_ids = set()
    with open(file_path, 'r') as file:
        for line in file:
            ids_in_line = [id.strip() for id in line.split(',')]
            user_ids.update(ids_in_line)
    return user_ids

legacy_verified_ids = read_user_ids('/Users/shg/Developer/best-tweet/scraper/legacy_verified_ids.txt')

def update_legacy_verified(user_id):
    supabase.table("users").update({"legacy_verified": True}).eq("user_id", user_id).eq("legacy_verified", False).execute()

def process_users():
    response = supabase.table("users").select("user_id").execute()
    if response.data:
        for user in response.data:
            if str(user['user_id']) in legacy_verified_ids:
                update_legacy_verified(user['user_id'])

process_users()