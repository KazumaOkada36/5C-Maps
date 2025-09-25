from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///5c_maps.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key'

# Initialize database
db = SQLAlchemy(app)

# Define models directly in app.py to avoid circular imports
class College(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'created_at': self.created_at.isoformat()
        }

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    course_number = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    semester = db.Column(db.String(20))
    instructor = db.Column(db.String(100))
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    college = db.relationship('College', backref=db.backref('courses', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'course_number': self.course_number,
            'description': self.description,
            'semester': self.semester,
            'instructor': self.instructor,
            'college': self.college.name,
            'created_at': self.created_at.isoformat()
        }

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    category = db.Column(db.String(50))
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    college = db.relationship('College', backref=db.backref('locations', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'college': self.college.name,
            'created_at': self.created_at.isoformat()
        }

# API Routes
@app.route('/')
def health_check():
    return {"status": "5C Maps Backend Running", "version": "1.0.0"}

@app.route('/api/health')
def api_health():
    return {"api_status": "healthy", "database": "connected"}

@app.route('/api/v1/colleges', methods=['GET'])
def get_colleges():
    colleges = College.query.all()
    return jsonify([college.to_dict() for college in colleges])

@app.route('/api/v1/courses', methods=['GET'])
def get_courses():
    college_code = request.args.get('college')
    
    query = Course.query
    if college_code:
        query = query.join(College).filter(College.code.ilike(f'%{college_code}%'))
    
    courses = query.limit(50).all()
    return jsonify([course.to_dict() for course in courses])

@app.route('/api/v1/locations', methods=['GET'])
def get_locations():
    college_code = request.args.get('college')
    
    query = Location.query
    if college_code:
        query = query.join(College).filter(College.code.ilike(f'%{college_code}%'))
    
    locations = query.all()
    return jsonify([location.to_dict() for location in locations])

# Create tables and add sample data
with app.app_context():
    db.create_all()
    
    # Add sample data if tables are empty
    if College.query.count() == 0:
        colleges = [
            College(name="Pomona College", code="PO"),
            College(name="Claremont McKenna College", code="CMC"),
            College(name="Scripps College", code="SC"),
            College(name="Harvey Mudd College", code="HMC"),
            College(name="Pitzer College", code="PZ")
        ]
        
        for college in colleges:
            db.session.add(college)
        db.session.commit()
        
        # Add sample locations
        locations = [
            Location(name="Frank Dining Hall", latitude=34.0975, longitude=-117.7080, category="dining", college_id=1),
            Location(name="Seaver North", latitude=34.0980, longitude=-117.7070, category="academic", college_id=1),
            Location(name="Collins Dining Hall", latitude=34.0950, longitude=-117.7095, category="dining", college_id=2)
        ]
        
        for location in locations:
            db.session.add(location)
        db.session.commit()
        
        print("Sample data added!")

if __name__ == '__main__':
    app.run(debug=True, port=8080)