# Service 17: Run Name Generator
# Port: 8017
# Tech: Python random, word lists
# Purpose: Generate creative, motivational, and location-based run names

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import random
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import formatter

app = FastAPI(title="Run Name Generator", version="1.0.0")

class NameGenerationRequest(BaseModel):
    user_name: Optional[str] = None
    distance_km: Optional[float] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None  # morning, afternoon, evening
    mood: Optional[str] = "random"  # epic, funny, motivational, chill, random

# Word banks for creative names
ADJECTIVES = {
    "epic": ["Legendary", "Epic", "Mighty", "Heroic", "Supreme", "Ultimate", "Unstoppable", "Victorious"],
    "funny": ["Wobbly", "Sweaty", "Gasping", "Wobbly-Legged", "Caffeine-Fueled", "Questionable", "Ambitious"],
    "motivational": ["Determined", "Inspired", "Powerful", "Fearless", "Triumphant", "Relentless", "Unstoppable"],
    "chill": ["Peaceful", "Zen", "Relaxed", "Easy-Going", "Casual", "Breezy", "Smooth"]
}

NOUNS = {
    "epic": ["Conqueror", "Champion", "Warrior", "Thunder", "Blitz", "Storm", "Crusade", "Quest"],
    "funny": ["Waddle", "Shuffle", "Stumble", "Adventure", "Mishap", "Journey", "Expedition", "Escapade"],
    "motivational": ["Journey", "Mission", "Victory", "Triumph", "Breakthrough", "Achievement", "Success"],
    "chill": ["Stroll", "Cruise", "Glide", "Flow", "Breeze", "Wander", "Drift"]
}

TIME_PREFIXES = {
    "morning": ["Dawn", "Sunrise", "Early Bird", "Morning", "AM"],
    "afternoon": ["Midday", "Afternoon", "Golden Hour", "PM"],
    "evening": ["Sunset", "Twilight", "Evening", "Dusk", "Night"]
}

DISTANCE_NICKNAMES = {
    (0, 3): "Sprint",
    (3, 5): "5K",
    (5, 8): "Quick Run",
    (8, 11): "10K",
    (11, 15): "Half Marathon Prep",
    (15, 25): "Long Run",
    (25, 100): "Ultra Distance"
}


def get_distance_nickname(distance_km: float) -> str:
    """Get nickname based on distance"""
    for (min_dist, max_dist), nickname in DISTANCE_NICKNAMES.items():
        if min_dist <= distance_km < max_dist:
            return nickname
    return "Epic Run"


def generate_creative_name(mood: str = "random") -> str:
    """Generate a creative run name"""
    # Select mood
    if mood == "random" or mood not in ADJECTIVES:
        mood = random.choice(list(ADJECTIVES.keys()))
    
    adj = random.choice(ADJECTIVES[mood])
    noun = random.choice(NOUNS[mood])
    
    return f"The {adj} {noun}"


def generate_location_based_name(location: str, distance_km: Optional[float] = None) -> str:
    """Generate location-based name"""
    templates = [
        f"{location} Adventure",
        f"Conquering {location}",
        f"{location} Explorer",
        f"Running {location}",
        f"The {location} Challenge"
    ]
    
    name = random.choice(templates)
    
    if distance_km:
        dist_nickname = get_distance_nickname(distance_km)
        name = f"{name} - {dist_nickname}"
    
    return name


def generate_achievement_name(user_name: str, distance_km: float) -> str:
    """Generate achievement-style name"""
    dist_nickname = get_distance_nickname(distance_km)
    
    templates = [
        f"{user_name}'s {dist_nickname}",
        f"{user_name} Crushes {distance_km:.1f}km",
        f"{user_name}'s {dist_nickname} Victory",
        f"{user_name}: {dist_nickname} Complete"
    ]
    
    return random.choice(templates)


def generate_time_based_name(time_of_day: str, mood: str = "random") -> str:
    """Generate time-of-day based name"""
    if time_of_day not in TIME_PREFIXES:
        time_of_day = "morning"
    
    time_prefix = random.choice(TIME_PREFIXES[time_of_day])
    
    # Combine with creative suffix
    if mood == "random" or mood not in NOUNS:
        mood = random.choice(list(NOUNS.keys()))
    
    noun = random.choice(NOUNS[mood])
    
    return f"{time_prefix} {noun}"


def generate_funny_name() -> str:
    """Generate a funny run name"""
    funny_templates = [
        "Why Am I Running Again?",
        "Regret-Free Run (Mostly)",
        "The Great Sweat Adventure",
        "Running from My Problems",
        "Cardio? More Like Card-NO",
        "Just Here for the Post-Run Snacks",
        "My Legs Hate Me Now",
        "One Foot in Front of the Other",
        "The Wobble Chronicles",
        "Gasping for Glory"
    ]
    
    return random.choice(funny_templates)


def generate_motivational_name() -> str:
    """Generate a motivational run name"""
    motivational_templates = [
        "Every Step Counts",
        "Crushing Goals, One Mile at a Time",
        "Stronger Than Yesterday",
        "No Excuses, Just Results",
        "The Journey Continues",
        "Pushing Past Limits",
        "Mind Over Miles",
        "Unstoppable Force",
        "Victory Lap",
        "The Comeback Run"
    ]
    
    return random.choice(motivational_templates)


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "run-name-generator", "port": 8017}


@app.post("/names/generate")
async def generate_run_name(req: NameGenerationRequest):
    """Generate creative run name"""
    try:
        # Generate multiple suggestions
        suggestions = []
        
        # Creative general name
        suggestions.append({
            "name": generate_creative_name(req.mood),
            "type": "creative"
        })
        
        # Funny name
        if req.mood in ["funny", "random"]:
            suggestions.append({
                "name": generate_funny_name(),
                "type": "funny"
            })
        
        # Motivational name
        if req.mood in ["motivational", "random"]:
            suggestions.append({
                "name": generate_motivational_name(),
                "type": "motivational"
            })
        
        # Location-based if provided
        if req.location:
            suggestions.append({
                "name": generate_location_based_name(req.location, req.distance_km),
                "type": "location-based"
            })
        
        # Time-based if provided
        if req.time_of_day:
            suggestions.append({
                "name": generate_time_based_name(req.time_of_day, req.mood),
                "type": "time-based"
            })
        
        # Achievement-based if user name and distance provided
        if req.user_name and req.distance_km:
            suggestions.append({
                "name": generate_achievement_name(req.user_name, req.distance_km),
                "type": "achievement"
            })
        
        return formatter.success({
            "suggestions": suggestions,
            "count": len(suggestions)
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/names/location-based")
async def generate_location_name(location: str, distance_km: Optional[float] = None):
    """Generate location-based name"""
    try:
        name = generate_location_based_name(location, distance_km)
        return formatter.success({"name": name, "type": "location-based"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/names/achievement")
async def generate_achievement_title(user_name: str, distance_km: float):
    """Generate achievement title"""
    try:
        name = generate_achievement_name(user_name, distance_km)
        return formatter.success({"name": name, "type": "achievement"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8017)
