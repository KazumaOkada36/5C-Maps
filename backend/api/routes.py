from flask import Blueprint, request, jsonify
from models.models import College, Department, Course, Location, Event, db
from datetime import datetime

api = Blueprint('api', __name__)

# Colleges endpoints
@api.route('/colleges', methods=['GET'])
def get_colleges():
    """Get all colleges"""
    colleges = College.query.all()
    return jsonify([college.to_dict() for college in colleges])

@api.route('/colleges', methods=['POST'])
def create_college():
    """Create a new college"""
    data = request.json
    college = College(
        name=data['name'],
        code=data['code']
    )
    db.session.add(college)
    db.session.commit()
    return jsonify(college.to_dict()), 201

# Courses endpoints  
@api.route('/courses', methods=['GET'])
def get_courses():
    """Get courses with optional filtering"""
    # Query parameters
    college_code = request.args.get('college')  # po, cmc, sc, hmc, pz
    department_code = request.args.get('department')  # csci, biol, etc
    semester = request.args.get('semester')  # Fall 2024
    search = request.args.get('search')  # search in title
    since = request.args.get('since')  # timestamp for updates
    
    # Build query
    query = Course.query
    
    if college_code:
        query = query.join(College).filter(College.code.ilike(f'%{college_code}%'))
    
    if department_code:
        query = query.join(Department).filter(Department.code.ilike(f'%{department_code}%'))
    
    if semester:
        query = query.filter(Course.semester == semester)
    
    if search:
        query = query.filter(Course.title.ilike(f'%{search}%'))
    
    if since:
        try:
            since_date = datetime.fromisoformat(since)
            query = query.filter(Course.updated_at > since_date)
        except ValueError:
            return jsonify({'error': 'Invalid since timestamp'}), 400
    
    # Execute query
    courses = query.limit(100).all()  # Limit to prevent huge responses
    
    return jsonify({
        'courses': [course.to_dict() for course in courses],
        'total': len(courses),
        'timestamp': datetime.utcnow().isoformat(),
        'filters_applied': {
            'college': college_code,
            'department': department_code,
            'semester': semester,
            'search': search
        }
    })

@api.route('/courses', methods=['POST'])
def create_course():
    """Create a new course"""
    data = request.json
    
    # Find or create department
    department = Department.query.filter_by(
        code=data['department_code'],
        college_id=data['college_id']
    ).first()
    
    if not department:
        return jsonify({'error': 'Department not found'}), 404
    
    course = Course(
        title=data['title'],
        course_number=data['course_number'],
        description=data.get('description'),
        credits=data.get('credits', 1),
        semester=data['semester'],
        instructor=data.get('instructor'),
        department_id=department.id,
        college_id=data['college_id'],
        location_id=data.get('location_id'),
        enrollment_limit=data.get('enrollment_limit')
    )
    
    # Set time slots if provided
    if data.get('time_slots'):
        course.set_time_slots(data['time_slots'])
    
    db.session.add(course)
    db.session.commit()
    return jsonify(course.to_dict()), 201

# Locations endpoints
@api.route('/locations', methods=['GET'])
def get_locations():
    """Get locations with optional filtering"""
    college_code = request.args.get('college')
    category = request.args.get('category')  # academic, dining, recreation, residence
    
    query = Location.query
    
    if college_code:
        query = query.join(College).filter(College.code.ilike(f'%{college_code}%'))
    
    if category:
        query = query.filter(Location.category == category)
    
    locations = query.all()
    
    return jsonify({
        'locations': [location.to_dict() for location in locations],
        'total': len(locations),
        'categories': ['academic', 'dining', 'recreation', 'residence', 'other']
    })

@api.route('/locations', methods=['POST'])
def create_location():
    """Create a new location"""
    data = request.json
    
    location = Location(
        name=data['name'],
        building_code=data.get('building_code'),
        room_number=data.get('room_number'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        address=data.get('address'),
        description=data.get('description'),
        category=data.get('category', 'other'),
        college_id=data['college_id']
    )
    
    # Set hours and contact info if provided
    if data.get('hours'):
        location.set_hours_info(data['hours'])
    if data.get('contact'):
        location.set_contact_info(data['contact'])
    
    db.session.add(location)
    db.session.commit()
    return jsonify(location.to_dict()), 201

# Events endpoints
@api.route('/events', methods=['GET'])
def get_events():
    """Get events with optional filtering"""
    college_code = request.args.get('college')
    event_type = request.args.get('type')  # academic, social, sports, dining
    start_date = request.args.get('start_date')  # YYYY-MM-DD
    end_date = request.args.get('end_date')    # YYYY-MM-DD
    
    query = Event.query.filter(Event.is_active == True)
    
    if college_code:
        query = query.join(College).filter(College.code.ilike(f'%{college_code}%'))
    
    if event_type:
        query = query.filter(Event.event_type == event_type)
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(Event.start_datetime >= start_dt)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format'}), 400
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(Event.start_datetime <= end_dt)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format'}), 400
    
    events = query.order_by(Event.start_datetime).limit(50).all()
    
    return jsonify({
        'events': [event.to_dict() for event in events],
        'total': len(events),
        'event_types': ['academic', 'social', 'sports', 'dining', 'other']
    })

@api.route('/events', methods=['POST'])
def create_event():
    """Create a new event"""
    data = request.json
    
    try:
        start_dt = datetime.fromisoformat(data['start_datetime'])
        end_dt = datetime.fromisoformat(data['end_datetime']) if data.get('end_datetime') else None
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    event = Event(
        title=data['title'],
        description=data.get('description'),
        event_type=data.get('event_type', 'other'),
        start_datetime=start_dt,
        end_datetime=end_dt,
        organizer=data.get('organizer'),
        contact_email=data.get('contact_email'),
        registration_link=data.get('registration_link'),
        max_attendees=data.get('max_attendees'),
        location_id=data.get('location_id'),
        college_id=data['college_id']
    )
    
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201

# Search endpoint (unified search across courses, locations, events)
@api.route('/search', methods=['GET'])
def search():
    """Unified search across all content"""
    query_text = request.args.get('q', '')
    college_code = request.args.get('college')
    content_type = request.args.get('type', 'all')  # courses, locations, events, all
    
    results = {}
    
    if not query_text:
        return jsonify({'error': 'Query parameter q is required'}), 400
    
    # Base college filter
    college_filter = None
    if college_code:
        college = College.query.filter_by(code=college_code).first()
        if college:
            college_filter = college.id
    
    # Search courses
    if content_type in ['courses', 'all']:
        course_query = Course.query.filter(Course.title.ilike(f'%{query_text}%'))
        if college_filter:
            course_query = course_query.filter(Course.college_id == college_filter)
        results['courses'] = [course.to_dict() for course in course_query.limit(20).all()]
    
    # Search locations
    if content_type in ['locations', 'all']:
        location_query = Location.query.filter(Location.name.ilike(f'%{query_text}%'))
        if college_filter:
            location_query = location_query.filter(Location.college_id == college_filter)
        results['locations'] = [location.to_dict() for location in location_query.limit(20).all()]
    
    # Search events
    if content_type in ['events', 'all']:
        event_query = Event.query.filter(
            Event.title.ilike(f'%{query_text}%'),
            Event.is_active == True
        )
        if college_filter:
            event_query = event_query.filter(Event.college_id == college_filter)
        results['events'] = [event.to_dict() for event in event_query.limit(20).all()]
    
    return jsonify({
        'query': query_text,
        'college_filter': college_code,
        'results': results,
        'total_results': sum(len(v) if isinstance(v, list) else 0 for v in results.values())
    })

# Stats endpoint
@api.route('/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    stats = {
        'colleges': College.query.count(),
        'courses': Course.query.count(),
        'locations': Location.query.count(),
        'events': Event.query.filter(Event.is_active == True).count(),
        'departments': Department.query.count(),
        'last_updated': datetime.utcnow().isoformat()
    }
    
    # Stats by college
    colleges = College.query.all()
    college_stats = {}
    for college in colleges:
        college_stats[college.code] = {
            'courses': Course.query.filter_by(college_id=college.id).count(),
            'locations': Location.query.filter_by(college_id=college.id).count(),
            'events': Event.query.filter_by(college_id=college.id, is_active=True).count()
        }
    
    stats['by_college'] = college_stats
    
    return jsonify(stats)

@api.route('/api/debug')
def debug_data():
    colleges = College.query.all()
    locations = Location.query.all()
    
    return jsonify({
        'colleges_count': len(colleges),
        'locations_count': len(locations),
        'colleges': [{'id': c.id, 'name': c.name, 'code': c.code} for c in colleges],
        'locations': [{'id': l.id, 'name': l.name, 'college_id': l.college_id} for l in locations]
    })