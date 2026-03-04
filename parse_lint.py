import json
import os
try:
    if not os.path.exists('lint_results_pintura.json'):
        print("File not found")
    else:
        with open('lint_results_pintura.json', 'r') as f:
            data = json.load(f)
        for file_data in data:
            messages = file_data.get('messages', [])
            if messages:
                print(f"File: {file_data['filePath']}")
                for msg in messages:
                    if msg.get('severity', 0) == 2: # Error
                        print(f"  {msg.get('line')}:{msg.get('column')} - {msg.get('ruleId')} - {msg.get('message')}")
except Exception as e:
    print(f"Error: {e}")
