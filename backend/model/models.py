from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

# Create db instance
db = SQLAlchemy()

class College(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    courses = db.relationship('Course', backref='college', lazy=True)
    locations = db.relationship('Location', backref='college', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'created_at': self.created_at.isoformat()
        }

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'), nullable=False)
    
    courses = db.relationship('Course', backref='department', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'college_id': self.college_id
        }

class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    course_number = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    credits = db.Column(db.Integer, default=1)
    semester = db.Column(db.String(20))
    instructor = db.Column(db.String(100))
    
    department_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    
    time_slots = db.Column(db.Text)
    enrollment_limit = db.Column(db.Integer)
    enrollment_current = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_time_slots(self):
        if self.time_slots:
            return json.loads(self.time_slots)
        return []
    
    def set_time_slots(self, slots):
        self.time_slots = json.dumps(slots)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'course_number': self.course_number,
            'description': self.description,
            'credits': self.credits,
            'semester': self.semester,
            'instructor': self.instructor,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    building_code = db.Column(db.String(20))
    room_number = db.Column(db.String(20))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    address = db.Column(db.String(200))
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    hours_info = db.Column(db.Text)
    contact_info = db.Column(db.Text)
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'), nullable=False)
    
    courses = db.relationship('Course', backref='location', lazy=True)
    events = db.relationship('Event', backref='location', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'created_at': self.created_at.isoformat()
        }

class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50))
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime)
    organizer = db.Column(db.String(100))
    contact_email = db.Column(db.String(100))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    college_id = db.Column(db.Integer, db.ForeignKey('college.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'event_type': self.event_type,
            'start_datetime': self.start_datetime.isoformat(),
            'created_at': self.created_at.isoformat()
        }