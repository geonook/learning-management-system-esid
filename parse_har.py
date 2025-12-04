import json
import sys
from urllib.parse import urlparse

def parse_har(file_path):
    try:
        with open(file_path, 'r') as f:
            har_data = json.load(f)
        
        entries = har_data['log']['entries']
        print(f"Total entries: {len(entries)}")
        
        for entry in entries:
            request = entry['request']
            response = entry['response']
            url = request['url']
            
            # Filter for relevant URLs
            if 'api/auth' in url or 'api/oauth' in url or 'callback' in url:
                print("-" * 80)
                print(f"URL: {url}")
                print(f"Method: {request['method']}")
                print(f"Status: {response['status']} {response['statusText']}")
                
                # Print Headers
                print("Headers:")
                for header in request['headers']:
                    print(f"  {header['name']}: {header['value']}")

                
                # Print Query Params
                if request.get('queryString'):
                    print("Query Params:")
                    for param in request['queryString']:
                        print(f"  {param['name']}: {param['value']}")
                
                # Print Response Content (if text and small)
                content = response['content']
                if content.get('mimeType') and 'application/json' in content['mimeType']:
                    text = content.get('text', '')
                    if len(text) < 1000:
                        print(f"Response Body: {text}")
                    else:
                        print(f"Response Body (truncated): {text[:200]}...")
                elif response['status'] >= 400:
                     print(f"Error Response Body: {content.get('text', '')[:500]}")

    except Exception as e:
        print(f"Error parsing HAR: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 parse_har.py <file_path>")
    else:
        parse_har(sys.argv[1])
