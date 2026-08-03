"""
Verify that radar and feed APIs return the same events.
Run this after restarting the backend to confirm synchronization.
"""
import requests
import json

API_URL = "http://localhost:8000"

def test_api_sync():
    """Test that radar and feed return the same events."""
    print("🔍 Testing API Synchronization...\n")
    
    # Fetch feed data
    print("📡 Fetching feed data...")
    feed_response = requests.get(f"{API_URL}/feed?page_size=100")
    feed_data = feed_response.json()
    feed_events = feed_data.get("events", [])
    print(f"✅ Feed returned {len(feed_events)} events")
    
    # Fetch radar data
    print("\n📡 Fetching radar data...")
    radar_response = requests.get(f"{API_URL}/feed/radar?limit=10")
    radar_events = radar_response.json()
    print(f"✅ Radar returned {len(radar_events)} events")
    
    # Compare first 10 events
    print("\n🔄 Comparing first 10 events...\n")
    
    matches = 0
    mismatches = 0
    
    for i in range(min(10, len(feed_events), len(radar_events))):
        feed_event = feed_events[i]
        radar_event = radar_events[i]
        
        feed_id = feed_event.get("id")
        radar_id = radar_event.get("id")
        
        feed_title = feed_event.get("title", "")[:50]
        radar_title = radar_event.get("title", "")[:50]
        
        feed_score = feed_event.get("importance_score")
        radar_score = radar_event.get("importance_score")
        
        if feed_id == radar_id:
            matches += 1
            print(f"✅ Event {i+1}: MATCH")
            print(f"   Title: {feed_title}...")
            print(f"   Score: {feed_score}")
        else:
            mismatches += 1
            print(f"❌ Event {i+1}: MISMATCH")
            print(f"   Feed:  {feed_title}... (score: {feed_score})")
            print(f"   Radar: {radar_title}... (score: {radar_score})")
        print()
    
    # Summary
    print("=" * 60)
    print(f"📊 RESULTS:")
    print(f"   Matches: {matches}/10")
    print(f"   Mismatches: {mismatches}/10")
    
    if mismatches == 0:
        print("\n✅ SUCCESS! Radar and feed are perfectly synchronized!")
    else:
        print("\n❌ FAILED! Radar and feed are NOT synchronized.")
        print("   Please restart the backend and try again.")
    print("=" * 60)
    
    return mismatches == 0

if __name__ == "__main__":
    try:
        success = test_api_sync()
        exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to backend at http://localhost:8000")
        print("   Please make sure the backend is running.")
        exit(1)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        exit(1)
