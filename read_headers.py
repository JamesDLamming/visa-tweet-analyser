import json

def display_json_headers():
    try:
        with open('visakanv.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
            
            # If the data is a list of dictionaries, take the first item
            if isinstance(data, list) and len(data) > 0:
                headers = list(data[0].keys())
                print("Column headers in visakanv.json:")
                for header in headers:
                    print(f"- {header}")
            else:
                # If it's a single dictionary
                headers = list(data.keys())
                print("Column headers in visakanv.json:")
                for header in headers:
                    print(f"- {header}")
                
    except FileNotFoundError:
        print("Error: visakanv.json file not found")
    except json.JSONDecodeError:
        print("Error: Invalid JSON format")

if __name__ == "__main__":
    display_json_headers() 