# ai_guidelines.py
import json

def get_guidelines(disaster_type):
    with open("gov_guidelines.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    if disaster_type in data:
        return data[disaster_type]
    else:
        return {"message": "No official guidelines available for this disaster."}
