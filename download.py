import requests
from tqdm import tqdm

username = 'visakanv'
url = f'https://fabxmporizzqflnftavs.supabase.co/storage/v1/object/public/archives/visakanv/archive.json'


# Helper function to downnload the data and display a progress bar
def downloadUserData(username):
  output_filename = f'{username}.json'
  
  print("Downloading tweet data for:", username)
  response = requests.get(url, stream=True)
  total_size = int(response.headers.get('content-length', 0))
  progress_bar = tqdm(total=total_size, unit='B', unit_scale=True, desc="Downloading JSON")

  # Download and save the file
  with open(f'{username}.json', 'wb') as f:
      for chunk in response.iter_content(chunk_size=8192):
          if chunk:
              f.write(chunk)
              progress_bar.update(len(chunk))
  
  progress_bar.close()

downloadUserData(username)