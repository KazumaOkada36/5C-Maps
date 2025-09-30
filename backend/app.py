from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
import hashlib

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///5c_maps.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    role = db.Column(db.String(20), default='student')
    college = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'college': self.college
        }

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
    event_type = db.Column(db.String(50), nullable=False)
    date_time = db.Column(db.String(100), nullable=False)
    event_date = db.Column(db.String(20))
    event_time = db.Column(db.String(10))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    description = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    location = db.relationship('Location', backref='events')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'event_type': self.event_type,
            'date_time': self.date_time,
            'event_date': self.event_date,
            'event_time': self.event_time,
            'location': self.location.to_dict() if self.location else None,
            'description': self.description,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat()
        }

class StarredItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_type = db.Column(db.String(20), nullable=False)
    item_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'item_type': self.item_type,
            'item_id': self.item_id
        }

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/')
def health():
    return {"status": "running", "app": "Chizu"}

@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    new_user = User(
        username=data['username'],
        password_hash=hash_password(data['password']),
        name=data['name'],
        email=data['email'],
        college=data.get('college', ''),
        role='student'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'message': 'Account created successfully!',
        'user': new_user.to_dict()
    }), 201

@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and user.password_hash == hash_password(password):
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

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
        date_time=data.get('date_time', ''),
        event_date=data.get('event_date'),
        event_time=data.get('event_time'),
        location_id=data.get('location_id'),
        description=data.get('description'),
        status=data.get('status', 'pending'),
        created_by=data.get('created_by', 'anonymous')
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201

@app.route('/api/v1/starred', methods=['GET'])
def get_starred():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify([])
    
    starred = StarredItem.query.filter_by(user_id=user_id).all()
    return jsonify([s.to_dict() for s in starred])

@app.route('/api/v1/starred', methods=['POST'])
def add_starred():
    data = request.json
    
    existing = StarredItem.query.filter_by(
        user_id=data['user_id'],
        item_type=data['item_type'],
        item_id=data['item_id']
    ).first()
    
    if existing:
        return jsonify({'message': 'Already starred'}), 200
    
    starred = StarredItem(
        user_id=data['user_id'],
        item_type=data['item_type'],
        item_id=data['item_id']
    )
    db.session.add(starred)
    db.session.commit()
    return jsonify(starred.to_dict()), 201

@app.route('/api/v1/starred/<int:starred_id>', methods=['DELETE'])
def remove_starred(starred_id):
    starred = StarredItem.query.get_or_404(starred_id)
    db.session.delete(starred)
    db.session.commit()
    return jsonify({'message': 'Unstarred'}), 200

@app.route('/api/v1/events/<int:event_id>', methods=['PATCH'])
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.json
    
    if 'status' in data:
        event.status = data['status']
    
    db.session.commit()
    return jsonify(event.to_dict())

@app.route('/api/v1/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted'}), 200

@app.route('/api/v1/courses')
def get_courses():
    return jsonify([])

def init_db():
    db.create_all()
    
    if College.query.count() > 0:
        print("Database already initialized")
        return
    
    print("Initializing database...")
    
    admin = User(
        username='admin',
        password_hash=hash_password('admin123'),
        name='Admin User',
        email='admin@chizu.app',
        role='admin',
        college='Pomona College'
    )
    db.session.add(admin)
    
    student = User(
        username='student',
        password_hash=hash_password('student123'),
        name='Demo Student',
        email='student@chizu.app',
        role='student',
        college='Claremont McKenna College'
    )
    db.session.add(student)
    
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
    
    locations = [
        Location(name="Frank Dining Hall", latitude=34.0975, longitude=-117.7080, category="dining", college_id=1),
        Location(name="Frary Dining Hall", latitude=34.0970, longitude=-117.7075, category="dining", college_id=1),
        Location(name="Collins Dining Hall", latitude=34.1018148, longitude=-117.709251, category="dining", college_id=2),
        Location(name="Malott Commons", latitude=34.1018, longitude=-117.7055, category="dining", college_id=3),
        Location(name="Hoch-Shanahan Dining Commons", latitude=34.1055982, longitude=-117.7091323, category="dining", college_id=4),
        Location(name="McConnell Dining Hall", latitude=34.102886, longitude=-117.7059549, category="dining", college_id=5),
        Location(name="The Coop", latitude=34.0965, longitude=-117.7082, category="dining", college_id=1),
        Location(name="Rains Center", latitude=34.0960, longitude=-117.7065, category="recreation", college_id=1),
        Location(name="Ducey Gymnasium", latitude=34.0955, longitude=-117.7100, category="recreation", college_id=2),
        Location(name="Voelkel Gym", latitude=34.1022, longitude=-117.7050, category="recreation", college_id=3),
        Location(name="Seaver North", latitude=34.0980, longitude=-117.7070, category="academic", college_id=1),
        Location(name="Seaver South", latitude=34.0978, longitude=-117.7068, category="academic", college_id=1),
        Location(name="Carnegie Hall", latitude=34.0968, longitude=-117.7077, category="academic", college_id=1),
        Location(name="Kravis Center", latitude=34.0948, longitude=-117.7090, category="academic", college_id=2),
        Location(name="Parsons Engineering", latitude=34.1065, longitude=-117.7092, category="academic", college_id=4),
        Location(name="Bridges Auditorium", latitude=34.0969, longitude=-117.7073, category="events", college_id=1),
    ]
    
    for l in locations:
        db.session.add(l)
    db.session.commit()
    
    events = [
        Event(title="Welcome Week", event_type="fun", 
              date_time="Oct 15, 2024 at 6:00 PM",
              event_date="2024-10-15",
              event_time="6:00 PM",
              location_id=1, description="Welcome new students!", status="approved", created_by="admin"),
        Event(title="Career Fair", event_type="career", 
              date_time="Oct 20, 2024 at 2:00 PM",
              event_date="2024-10-20",
              event_time="2:00 PM",
              location_id=16, description="Meet employers", status="approved", created_by="admin"),
        Event(title="Movie Night", event_type="fun", 
              date_time="Oct 25, 2024 at 8:00 PM",
              event_date="2024-10-25",
              event_time="8:00 PM",
              location_id=16, description="Free popcorn!", status="pending", created_by="student"),
    ]
    
    for e in events:
        db.session.add(e)
    db.session.commit()
    
    print(f"✅ Database initialized with {len(locations)} locations and {len(events)} events")

with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True, port=8080)


'''if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, port=8080)'''
