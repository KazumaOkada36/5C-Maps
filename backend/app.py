from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///5c_maps.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class College(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'code': self.code}

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    category = db.Column(db.String(50))
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    college = db.relationship('College', backref='locations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'college': self.college.name if self.college else 'Unknown'
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)  # career, clubs, fun
    date_time = db.Column(db.String(100), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    description = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    location = db.relationship('Location', backref='events')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'event_type': self.event_type,
            'date_time': self.date_time,
            'location': self.location.to_dict() if self.location else None,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }

@app.route('/')
def health():
    return {"status": "running"}

@app.route('/api/v1/colleges')
def get_colleges():
    return jsonify([c.to_dict() for c in College.query.all()])

@app.route('/api/v1/locations')
def get_locations():
    return jsonify([l.to_dict() for l in Location.query.all()])

@app.route('/api/v1/events')
def get_events():
    return jsonify([e.to_dict() for e in Event.query.all()])

@app.route('/api/v1/events', methods=['POST'])
def create_event():
    data = request.json
    event = Event(
        title=data['title'],
        event_type=data['event_type'],
        date_time=data['date_time'],
        location_id=data.get('location_id'),
        description=data.get('description')
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201

@app.route('/api/v1/courses')
def get_courses():
    return jsonify([])

def init_db():
    db.create_all()
    
    # Force reset - delete this section after first run if you want
    if College.query.count() > 0:
        print("Database exists - CLEARING OLD DATA")
        Event.query.delete()
        Location.query.delete()
        College.query.delete()
        db.session.commit()
    
    print("Creating new database...")
    
    colleges = [
        College(name="Pomona College", code="PO"),
        College(name="Claremont McKenna College", code="CMC"),
        College(name="Scripps College", code="SC"),
        College(name="Harvey Mudd College", code="HMC"),
        College(name="Pitzer College", code="PZ")
    ]
    
    for c in colleges:
        db.session.add(c)
    db.session.commit()
    
    # Expanded locations - all dining halls, gyms, and many more academic buildings
    locations = [
        # All 7 Dining Halls
        Location(name="Frank Dining Hall", latitude=34.0975, longitude=-117.7080, category="dining", college_id=1),
        Location(name="Frary Dining Hall", latitude=34.0970, longitude=-117.7075, category="dining", college_id=1),
        Location(name="Collins Dining Hall", latitude=34.1018148, longitude=-117.709251, category="dining", college_id=2),
        Location(name="Malott Commons", latitude=34.1018, longitude=-117.7055, category="dining", college_id=3),
        Location(name="Hoch-Shanahan Dining Commons", latitude=34.1055982, longitude=-117.7091323, category="dining", college_id=4),
        Location(name="McConnell Dining Hall", latitude=34.102886, longitude=-117.7059549, category="dining", college_id=5),
        Location(name="The Coop", latitude=34.0965, longitude=-117.7082, category="dining", college_id=1),
        
        # Gyms and Recreation
        Location(name="Rains Center", latitude=34.0960, longitude=-117.7065, category="recreation", college_id=1),
        Location(name="Ducey Gymnasium", latitude=34.0955, longitude=-117.7100, category="recreation", college_id=2),
        Location(name="Voelkel Gym", latitude=34.1022, longitude=-117.7050, category="recreation", college_id=3),
        
        # Pomona Academic Buildings
        Location(name="Seaver North", latitude=34.0980, longitude=-117.7070, category="academic", college_id=1),
        Location(name="Seaver South", latitude=34.0978, longitude=-117.7068, category="academic", college_id=1),
        Location(name="Carnegie Hall", latitude=34.0968, longitude=-117.7077, category="academic", college_id=1),
        Location(name="Mason Hall", latitude=34.0972, longitude=-117.7073, category="academic", college_id=1),
        Location(name="Millikan Laboratory", latitude=34.0976, longitude=-117.7072, category="academic", college_id=1),
        Location(name="Crookshank Hall", latitude=34.0974, longitude=-117.7076, category="academic", college_id=1),
        
        # CMC Academic Buildings
        Location(name="Bauer Center", latitude=34.0945, longitude=-117.7092, category="academic", college_id=2),
        Location(name="Kravis Center", latitude=34.0948, longitude=-117.7090, category="academic", college_id=2),
        Location(name="Roberts Hall", latitude=34.0943, longitude=-117.7095, category="academic", college_id=2),
        Location(name="Bauer North", latitude=34.0947, longitude=-117.7093, category="academic", college_id=2),
        Location(name="Adams Hall", latitude=34.0949, longitude=-117.7087, category="academic", college_id=2),
        
        # Scripps Academic Buildings
        Location(name="Balch Hall", latitude=34.1015, longitude=-117.7057, category="academic", college_id=3),
        Location(name="Steele Hall", latitude=34.1017, longitude=-117.7060, category="academic", college_id=3),
        Location(name="Humanities Building", latitude=34.1020, longitude=-117.7058, category="academic", college_id=3),
        Location(name="Sallie Tiernan Field House", latitude=34.1019, longitude=-117.7052, category="academic", college_id=3),
        
        # Harvey Mudd Academic Buildings  
        Location(name="Parsons Engineering", latitude=34.1065, longitude=-117.7092, category="academic", college_id=4),
        Location(name="Jacobs Science Center", latitude=34.1060, longitude=-117.7095, category="academic", college_id=4),
        Location(name="Sprague Building", latitude=34.1062, longitude=-117.7090, category="academic", college_id=4),
        Location(name="Beckman Hall", latitude=34.1064, longitude=-117.7088, category="academic", college_id=4),
        
        # Pitzer Academic Buildings
        Location(name="Fletcher Hall", latitude=34.1020, longitude=-117.7110, category="academic", college_id=5),
        Location(name="Broad Center", latitude=34.1025, longitude=-117.7112, category="academic", college_id=5),
        Location(name="McConnell Center", latitude=34.1022, longitude=-117.7115, category="academic", college_id=5),
        Location(name="Scott Hall", latitude=34.1027, longitude=-117.7108, category="academic", college_id=5),
        
        # Event/Performance Spaces
        Location(name="Bridges Auditorium", latitude=34.0969, longitude=-117.7073, category="events", college_id=1),
        Location(name="Garrison Theater", latitude=34.0967, longitude=-117.7074, category="events", college_id=1),
        Location(name="Athenaeum", latitude=34.0945, longitude=-117.7089, category="events", college_id=2),
    ]
    
    for l in locations:
        db.session.add(l)
    db.session.commit()
    
    # Sample events
    events = [
        Event(title="Bain Consulting Guest Speaker", event_type="career", date_time="Oct 15, 2024 at 6:00 PM", location_id=3, description="Learn about consulting careers"),
        Event(title="Goldman Sachs Info Session", event_type="career", date_time="Oct 20, 2024 at 7:00 PM", location_id=21, description="Investment banking opportunities"),
        Event(title="Club Fair", event_type="clubs", date_time="Oct 10, 2024 at 4:00 PM", location_id=35, description="Meet all campus clubs"),
        Event(title="Robotics Club Demo", event_type="clubs", date_time="Oct 18, 2024 at 5:30 PM", location_id=28, description="See our latest robots"),
        Event(title="Beach Party", event_type="fun", date_time="Oct 25, 2024 at 2:00 PM", location_id=10, description="End of semester celebration"),
        Event(title="Movie Night", event_type="fun", date_time="Oct 12, 2024 at 8:00 PM", location_id=35, description="Screening popular films"),
    ]
    
    for e in events:
        db.session.add(e)
    db.session.commit()
    
    print(f"Created {len(locations)} locations and {len(events)} events")

def test_db():
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"Current directory: {os.getcwd()}")
    db.create_all()
    print("Tables created!")
    print(f"Colleges: {College.query.count()}")
    print(f"Locations: {Location.query.count()}")

if __name__ == '__main__':
    with app.app_context():
        test_db()
        init_db()
    app.run(debug=True, port=8080)