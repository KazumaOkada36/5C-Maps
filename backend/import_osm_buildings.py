import requests
import json
from app import app, db, Location, College

# Overpass API query for 5C buildings
overpass_url = "https://overpass-api.de/api/interpreter"
overpass_query = """
[out:json];
(
  node["name"]["building"](34.093,-117.714,34.107,-117.704);
  way["name"]["building"](34.093,-117.714,34.107,-117.704);
);
out center;
"""

print("🔍 Fetching buildings from OpenStreetMap...")
response = requests.post(overpass_url, data={'data': overpass_query})
data = response.json()

print(f"✅ Found {len(data['elements'])} buildings")

# Map college names
college_keywords = {
    'Pomona': 'Pomona College',
    'CMC': 'Claremont McKenna College',
    'Claremont McKenna': 'Claremont McKenna College',
    'Scripps': 'Scripps College',
    'Mudd': 'Harvey Mudd College',
    'Harvey Mudd': 'Harvey Mudd College',
    'Pitzer': 'Pitzer College'
}

# Categorize by keywords
def categorize_building(name, tags):
    name_lower = name.lower()
    
    if any(word in name_lower for word in ['dining', 'cafe', 'restaurant', 'food', 'commons', 'frary', 'frank', 'collins', 'malott', 'hoch', 'mcconnell']):
        return 'dining'
    elif any(word in name_lower for word in ['gym', 'rains', 'pool', 'athletic', 'recreation', 'ducey', 'voelkel', 'fitness']):
        return 'recreation'
    elif any(word in name_lower for word in ['hall', 'center', 'building', 'lab', 'library', 'auditorium', 'beckman', 'seaver', 'carnegie', 'kravis', 'parsons', 'bridges']):
        return 'academic'
    else:
        return 'other'

def guess_college(name, tags):
    for keyword, college_name in college_keywords.items():
        if keyword.lower() in name.lower():
            return college_name
    # Default to Pomona if unknown
    return 'Pomona College'

# Process buildings
buildings = []
seen_names = set()

for element in data['elements']:
    if 'tags' not in element or 'name' not in element['tags']:
        continue
    
    name = element['tags']['name']
    
    # Skip duplicates
    if name in seen_names:
        continue
    seen_names.add(name)
    
    # Skip basement levels and parking
    if 'basement' in name.lower() or 'parking' in name.lower():
        continue
    
    tags = element['tags']
    
    # Get coordinates
    if element['type'] == 'node':
        lat = element['lat']
        lon = element['lon']
    elif 'center' in element:
        lat = element['center']['lat']
        lon = element['center']['lon']
    else:
        continue
    
    # Skip if coordinates are invalid
    if not (34.093 <= lat <= 34.107 and -117.714 <= lon <= -117.704):
        continue
    
    category = categorize_building(name, tags)
    college_name = guess_college(name, tags)
    
    buildings.append({
        'name': name,
        'lat': lat,
        'lon': lon,
        'category': category,
        'college': college_name,
        'tags': tags
    })

# Sort by college and name
buildings.sort(key=lambda x: (x['college'], x['name']))

print(f"\n📦 Processed {len(buildings)} valid buildings")

# Show preview grouped by category
categories = {}
for building in buildings:
    cat = building['category']
    if cat not in categories:
        categories[cat] = []
    categories[cat].append(building)

print("\n📋 Preview of buildings to import:")
for category, items in categories.items():
    print(f"\n  {category.upper()} ({len(items)}):")
    for building in items[:5]:
        print(f"    • {building['name']} - {building['college']}")
    if len(items) > 5:
        print(f"    ... and {len(items) - 5} more")

# Ask for confirmation
print(f"\n💾 Total: {len(buildings)} buildings")
confirm = input("\n❓ Import these buildings to database? (yes/no): ")

if confirm.lower() == 'yes':
    with app.app_context():
        imported = 0
        skipped = 0
        
        for building in buildings:
            # Check if already exists
            existing = Location.query.filter_by(name=building['name']).first()
            if existing:
                print(f"⏭️  Skipping (already exists): {building['name']}")
                skipped += 1
                continue
            
            # Get college ID
            college = College.query.filter_by(name=building['college']).first()
            college_id = college.id if college else 1
            
            # Create new location
            new_location = Location(
                name=building['name'],
                latitude=building['lat'],
                longitude=building['lon'],
                category=building['category'],
                college_id=college_id,
                description=f"Building at {building['college']}",
                fun_facts='[]'
            )
            
            db.session.add(new_location)
            imported += 1
            name = building['name']
            cat = building['category']
            print(f"✅ Imported: {name} ({cat})")
        
        db.session.commit()
        print(f"\n🎉 Import complete! Imported {imported}, Skipped {skipped}")
else:
    print("❌ Import cancelled")