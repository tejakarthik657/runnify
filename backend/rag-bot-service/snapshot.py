"""Daily Snapshot Service - Exports data from MongoDB for RAG ingestion"""
import os
from datetime import datetime
from typing import List, Dict
import pymongo
from dotenv import load_dotenv
import json
import schedule
import time

load_dotenv()

class SnapshotService:
    """Handles daily data snapshots from MongoDB"""
    
    def __init__(self):
        mongo_uri = os.getenv("MONGODB_URI")
        self.client = pymongo.MongoClient(mongo_uri)
        self.db = self.client["territory-run"]
        self.snapshot_dir = "./snapshots"
        
        # Create snapshot directory
        os.makedirs(self.snapshot_dir, exist_ok=True)
    
    def export_territories(self) -> List[Dict]:
        """Export territory ownership data"""
        territories = self.db.territories.find()
        return list(territories)
    
    def export_leaderboard(self) -> List[Dict]:
        """Export top players"""
        leaderboard = self.db.users.find().sort("totalCredits", -1).limit(100)
        return list(leaderboard)
    
    def export_runs(self, days: int = 1) -> List[Dict]:
        """Export recent runs"""
        cutoff = datetime.utcnow().timestamp() - (days * 86400)
        runs = self.db.runs.find({"startTime": {"$gte": cutoff}})
        return list(runs)
    
    def create_knowledge_document(self) -> str:
        """Create a formatted document for RAG ingestion"""
        territories = self.export_territories()
        leaderboard = self.export_leaderboard()
        runs = self.export_runs()
        
        timestamp = datetime.utcnow().isoformat()
        
        doc = f"""# Territory Run Daily Snapshot
Generated: {timestamp}

## Current Stats
- Total Territories: {len(territories)}
- Active Players: {len(leaderboard)}
- Recent Runs (24h): {len(runs)}

## Top Players
"""
        
        for i, player in enumerate(leaderboard[:10], 1):
            doc += f"{i}. {player.get('username', 'Unknown')} - {player.get('totalCredits', 0)} credits\n"
        
        doc += "\n## Territory Distribution\n"
        
        # Group territories by owner
        owner_counts = {}
        for territory in territories:
            owner = territory.get('owner', 'Unclaimed')
            owner_counts[owner] = owner_counts.get(owner, 0) + 1
        
        for owner, count in sorted(owner_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            doc += f"- {owner}: {count} hexes\n"
        
        doc += "\n## Recent Activity\n"
        
        for run in runs[:20]:
            user = run.get('userId', 'Unknown')
            distance = run.get('distance', 0)
            hexes = len(run.get('hexesCaptured', []))
            doc += f"- User {user}: {distance:.2f}m run, {hexes} hexes captured\n"
        
        return doc
    
    def save_snapshot(self):
        """Save daily snapshot to file"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        filename = f"{self.snapshot_dir}/snapshot_{timestamp}.md"
        
        print(f"Creating snapshot: {filename}")
        doc = self.create_knowledge_document()
        
        with open(filename, 'w') as f:
            f.write(doc)
        
        print(f"✅ Snapshot saved: {filename}")
        return filename
    
    def run_daily_job(self):
        """Execute daily snapshot job"""
        print(f"🕐 Running daily snapshot at {datetime.utcnow()}")
        self.save_snapshot()

def start_scheduler():
    """Start scheduled daily snapshots"""
    service = SnapshotService()
    
    # Schedule daily at 00:00 UTC
    schedule.every().day.at("00:00").do(service.run_daily_job)
    
    print("📅 Snapshot scheduler started")
    print("Waiting for scheduled time (00:00 UTC)...")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    # Run once immediately for testing
    service = SnapshotService()
    service.save_snapshot()
    
    # Then start scheduler
    # start_scheduler()
