from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import hashlib
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from threading import Thread

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///5c_maps.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration
app.config['SMTP_SERVER'] = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
app.config['SMTP_PORT'] = int(os.environ.get('SMTP_PORT', 587))
app.config['SMTP_USERNAME'] = os.environ.get('SMTP_USERNAME', '')
app.config['SMTP_PASSWORD'] = os.environ.get('SMTP_PASSWORD', '')
app.config['FROM_EMAIL'] = os.environ.get('FROM_EMAIL', 'noreply@chizu.app')

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

class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='reset_tokens')

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
    description = db.Column(db.String(500))
    fun_facts = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    college = db.relationship('College', backref='locations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'college': self.college.name if self.college else 'Unknown',
            'description': self.description,
            'fun_facts': self.fun_facts
        }

class LocationPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    content = db.Column(db.String(500), nullable=False)
    post_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_by = db.Column(db.String(100), default='Anonymous')
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    location = db.relationship('Location', backref='posts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'content': self.content,
            'post_type': self.post_type,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
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

def send_email(to_email, subject, html_content):
    """Send an email using SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = app.config['FROM_EMAIL']
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(app.config['SMTP_SERVER'], app.config['SMTP_PORT']) as server:
            server.starttls()
            server.login(app.config['SMTP_USERNAME'], app.config['SMTP_PASSWORD'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def send_welcome_email(user, password):
    """Send welcome email with account credentials"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }}
            .credential-item {{ margin: 10px 0; }}
            .label {{ font-weight: bold; color: #667eea; }}
            .value {{ background: #e9ecef; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; font-family: monospace; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🗾 Welcome to Chizu!</h1>
            </div>
            <div class="content">
                <h2>Hello {user.name}! 👋</h2>
                <p>Your Chizu account has been successfully created.</p>
                
                <div class="credentials">
                    <h3>Your Account Credentials:</h3>
                    <div class="credential-item">
                        <span class="label">Username:</span>
                        <span class="value">{user.username}</span>
                    </div>
                    <div class="credential-item">
                        <span class="label">Password:</span>
                        <span class="value">{password}</span>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user.email, "Welcome to Chizu - Your Account Details", html_content)

def send_password_reset_email(user, reset_token):
    """Send password reset email with token"""
    reset_link = f"https://5-c-maps.vercel.app/?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body>
        <h1>🔐 Password Reset Request</h1>
        <p>Hello {user.name}!</p>
        <p><strong>Your Username:</strong> {user.username}</p>
        <p><a href="{reset_link}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour.</p>
    </body>
    </html>
    """
    
    return send_email(user.email, "Reset Your Chizu Password", html_content)

@app.route('/')
def health():
    return jsonify({"status": "running", "app": "Chizu"})

@app.route('/api/v1/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        password = data['password']
        
        new_user = User(
            username=data['username'],
            password_hash=hash_password(password),
            name=data['name'],
            email=data['email'],
            college=data.get('college', ''),
            role='student'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Send welcome email in background thread
        def send_email_background():
            try:
                with app.app_context():
                    send_welcome_email(new_user, password)
                    print(f"✅ Welcome email sent to {new_user.email}")
            except Exception as e:
                print(f"❌ Failed to send welcome email: {e}")
        
        thread = Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'message': 'Account created successfully! Check your email for credentials.',
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    try:
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
    except Exception as e:
        print(f"❌ Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/v1/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'message': 'If an account with that email exists, a password reset link has been sent.'}), 200
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        
        db.session.add(reset_token)
        db.session.commit()
        
        # Send reset email in background thread
        def send_email_background():
            try:
                with app.app_context():
                    send_password_reset_email(user, token)
                    print(f"✅ Reset email sent to {user.email}")
            except Exception as e:
                print(f"❌ Failed to send reset email: {e}")
        
        thread = Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'message': 'If an account with that email exists, a password reset link has been sent.'
        }), 200
    except Exception as e:
        print(f"❌ Forgot password error: {e}")
        return jsonify({'error': 'Request failed'}), 500

@app.route('/api/v1/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
        
        if not reset_token:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        if reset_token.expires_at < datetime.utcnow():
            return jsonify({'error': 'Reset token has expired'}), 400
        
        user = reset_token.user
        user.password_hash = hash_password(new_password)
        reset_token.used = True
        
        db.session.commit()
        
        return jsonify({'message': 'Password successfully reset'}), 200
    except Exception as e:
        print(f"❌ Reset password error: {e}")
        return jsonify({'error': 'Reset failed'}), 500

@app.route('/api/v1/auth/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    try:
        reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
        
        if not reset_token:
            return jsonify({'valid': False, 'error': 'Invalid token'}), 400
        
        if reset_token.expires_at < datetime.utcnow():
            return jsonify({'valid': False, 'error': 'Token expired'}), 400
        
        return jsonify({
            'valid': True,
            'username': reset_token.user.username,
            'email': reset_token.user.email
        }), 200
    except Exception as e:
        print(f"❌ Verify token error: {e}")
        return jsonify({'error': 'Verification failed'}), 500

@app.route('/api/v1/colleges')
def get_colleges():
    try:
        return jsonify([c.to_dict() for c in College.query.all()])
    except Exception as e:
        print(f"❌ Get colleges error: {e}")
        return jsonify({'error': 'Failed to fetch colleges'}), 500

@app.route('/api/v1/locations')
def get_locations():
    try:
        locations = Location.query.all()
        return jsonify([l.to_dict() for l in locations])
    except Exception as e:
        print(f"❌ Get locations error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch locations'}), 500

@app.route('/api/v1/locations/<int:location_id>', methods=['GET'])
def get_location_details(location_id):
    try:
        location = Location.query.get_or_404(location_id)
        
        now = datetime.utcnow()
        posts = LocationPost.query.filter_by(location_id=location_id).all()
        
        active_posts = []
        for post in posts:
            if post.post_type == 'temporary' and post.expires_at and post.expires_at < now:
                post.status = 'expired'
                continue
            
            if post.status == 'approved':
                active_posts.append(post.to_dict())
        
        db.session.commit()
        
        return jsonify({
            'location': location.to_dict(),
            'posts': active_posts
        })
    except Exception as e:
        print(f"❌ Get location details error: {e}")
        return jsonify({'error': 'Failed to fetch location'}), 500

@app.route('/api/v1/locations/<int:location_id>/posts', methods=['POST'])
def create_location_post():
    try:
        data = request.json
        location_id = data.get('location_id')
        content = data.get('content')
        post_type = data.get('post_type', 'temporary')
        
        if not content:
            return jsonify({'error': 'Content is required'}), 400
        
        new_post = LocationPost(
            location_id=location_id,
            content=content,
            post_type=post_type,
            created_by='Anonymous'
        )
        
        if post_type == 'temporary':
            new_post.status = 'approved'
            new_post.expires_at = datetime.utcnow() + timedelta(hours=3)
        else:
            new_post.status = 'pending'
        
        db.session.add(new_post)
        db.session.commit()
        
        return jsonify(new_post.to_dict()), 201
    except Exception as e:
        print(f"❌ Create post error: {e}")
        return jsonify({'error': 'Failed to create post'}), 500

@app.route('/api/v1/posts/pending', methods=['GET'])
def get_pending_posts():
    try:
        pending = LocationPost.query.filter_by(post_type='permanent', status='pending').all()
        return jsonify([p.to_dict() for p in pending])
    except Exception as e:
        print(f"❌ Get pending posts error: {e}")
        return jsonify({'error': 'Failed to fetch posts'}), 500

@app.route('/api/v1/posts/<int:post_id>/approve', methods=['PATCH'])
def approve_post(post_id):
    try:
        post = LocationPost.query.get_or_404(post_id)
        post.status = 'approved'
        db.session.commit()
        return jsonify(post.to_dict())
    except Exception as e:
        print(f"❌ Approve post error: {e}")
        return jsonify({'error': 'Failed to approve post'}), 500

@app.route('/api/v1/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        post = LocationPost.query.get_or_404(post_id)
        db.session.delete(post)
        db.session.commit()
        return jsonify({'message': 'Post deleted'}), 200
    except Exception as e:
        print(f"❌ Delete post error: {e}")
        return jsonify({'error': 'Failed to delete post'}), 500

@app.route('/api/v1/events')
def get_events():
    try:
        events = Event.query.all()
        return jsonify([e.to_dict() for e in events])
    except Exception as e:
        print(f"❌ Get events error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch events'}), 500

@app.route('/api/v1/events', methods=['POST'])
def create_event():
    try:
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
    except Exception as e:
        print(f"❌ Create event error: {e}")
        return jsonify({'error': 'Failed to create event'}), 500

@app.route('/api/v1/starred', methods=['GET'])
def get_starred():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify([])
        
        starred = StarredItem.query.filter_by(user_id=user_id).all()
        return jsonify([s.to_dict() for s in starred])
    except Exception as e:
        print(f"❌ Get starred error: {e}")
        return jsonify({'error': 'Failed to fetch starred items'}), 500

@app.route('/api/v1/starred', methods=['POST'])
def add_starred():
    try:
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
    except Exception as e:
        print(f"❌ Add starred error: {e}")
        return jsonify({'error': 'Failed to star item'}), 500

@app.route('/api/v1/starred/<int:starred_id>', methods=['DELETE'])
def remove_starred(starred_id):
    try:
        starred = StarredItem.query.get_or_404(starred_id)
        db.session.delete(starred)
        db.session.commit()
        return jsonify({'message': 'Unstarred'}), 200
    except Exception as e:
        print(f"❌ Remove starred error: {e}")
        return jsonify({'error': 'Failed to unstar item'}), 500

@app.route('/api/v1/events/<int:event_id>', methods=['PATCH'])
def update_event(event_id):
    try:
        event = Event.query.get_or_404(event_id)
        data = request.json
        
        if 'status' in data:
            event.status = data['status']
        
        db.session.commit()
        return jsonify(event.to_dict())
    except Exception as e:
        print(f"❌ Update event error: {e}")
        return jsonify({'error': 'Failed to update event'}), 500

@app.route('/api/v1/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        event = Event.query.get_or_404(event_id)
        db.session.delete(event)
        db.session.commit()
        return jsonify({'message': 'Event deleted'}), 200
    except Exception as e:
        print(f"❌ Delete event error: {e}")
        return jsonify({'error': 'Failed to delete event'}), 500

@app.route('/api/v1/courses')
def get_courses():
    return jsonify([])

def init_db():
    """Initialize database with sample data"""
    with app.app_context():
        # NUCLEAR OPTION: Drop and recreate ONCE
        import os
        db_path = 'instance/5c_maps.db'
        if os.path.exists(db_path):
            print("🔥 Deleting old database file...")
            os.remove(db_path)
        
        # Create tables
        db.create_all()
        print("✅ Database tables created")
        
        # Check if already initialized
        if College.query.count() > 0:
            print("✅ Database already has data")
            return
        
        print("🔄 Initializing database with sample data...")
        
        # Create admin user
        admin = User(
            username='admin',
            password_hash=hash_password('admin123'),
            name='Admin User',
            email='admin@chizu.app',
            role='admin',
            college='Pomona College'
        )
        db.session.add(admin)
        
        # Create student user
        student = User(
            username='student',
            password_hash=hash_password('student123'),
            name='Demo Student',
            email='student@chizu.app',
            role='student',
            college='Claremont McKenna College'
        )
        db.session.add(student)
        
        # Create colleges
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
        
        # Create locations
        locations = [
            Location(name="Frank Dining Hall", latitude=34.0975, longitude=-117.7080, category="dining", college_id=1, 
                    description="Main dining hall at Pomona College", 
                    fun_facts='["Open 7am-9pm daily", "Has vegan options", "Great breakfast burritos"]'),
            Location(name="Frary Dining Hall", latitude=34.0970, longitude=-117.7075, category="dining", college_id=1,
                    description="Historic dining hall with beautiful architecture", 
                    fun_facts='["Built in 1929", "Features murals by Jose Clemente Orozco", "Known for themed dinners"]'),
            Location(name="Collins Dining Hall", latitude=34.1018148, longitude=-117.709251, category="dining", college_id=2,
                    description="CMC dining hall", 
                    fun_facts='["Modern facility", "Wide variety of food stations"]'),
            Location(name="Malott Commons", latitude=34.1018, longitude=-117.7055, category="dining", college_id=3,
                    description="Scripps dining commons", 
                    fun_facts='["Beautiful garden views", "Fresh salad bar"]'),
            Location(name="Hoch-Shanahan Dining Commons", latitude=34.1055982, longitude=-117.7091323, category="dining", college_id=4,
                    description="Harvey Mudd dining hall", 
                    fun_facts='["Late night snacks available", "Popular study spot"]'),
            Location(name="McConnell Dining Hall", latitude=34.102886, longitude=-117.7059549, category="dining", college_id=5,
                    description="Pitzer dining hall", 
                    fun_facts='["Sustainable food practices", "Vegetarian-friendly"]'),
            Location(name="The Coop", latitude=34.0965, longitude=-117.7082, category="dining", college_id=1,
                    description="Campus store and café", 
                    fun_facts='["Quick snacks and drinks", "Student hangout spot"]'),
            Location(name="Rains Center", latitude=34.0960, longitude=-117.7065, category="recreation", college_id=1,
                    description="Athletic and recreation center at Pomona", 
                    fun_facts='["Two basketball courts", "Indoor swimming pool", "Rock climbing wall", "Full fitness center with cardio and weights"]'),
            Location(name="Ducey Gymnasium", latitude=34.0955, longitude=-117.7100, category="recreation", college_id=2,
                    description="CMC athletic facility", 
                    fun_facts='["Basketball courts", "Weight room", "Group fitness classes"]'),
            Location(name="Voelkel Gym", latitude=34.1022, longitude=-117.7050, category="recreation", college_id=3,
                    description="Scripps athletics center", 
                    fun_facts='["Yoga studio", "Dance studio", "Outdoor pool"]'),
            Location(name="Seaver North", latitude=34.0980, longitude=-117.7070, category="academic", college_id=1,
                    description="Science building at Pomona", 
                    fun_facts='["State-of-the-art science labs", "Research facilities"]'),
            Location(name="Seaver South", latitude=34.0978, longitude=-117.7068, category="academic", college_id=1,
                    description="Academic building", 
                    fun_facts='["Lecture halls", "Study spaces"]'),
            Location(name="Carnegie Hall", latitude=34.0968, longitude=-117.7077, category="academic", college_id=1,
                    description="Humanities building", 
                    fun_facts='["Beautiful historic architecture", "Language labs"]'),
            Location(name="Kravis Center", latitude=34.0948, longitude=-117.7090, category="academic", college_id=2,
                    description="CMC's main academic building", 
                    fun_facts='["Modern classrooms", "Leadership institute"]'),
            Location(name="Parsons Engineering", latitude=34.1065, longitude=-117.7092, category="academic", college_id=4,
                    description="Harvey Mudd engineering building", 
                    fun_facts='["Maker space", "Engineering labs", "Senior design projects"]'),
            Location(name="Bridges Auditorium", latitude=34.0969, longitude=-117.7073, category="events", college_id=1,
                    description="Large performance venue", 
                    fun_facts='["Seats 2,500 people", "Hosts concerts and lectures", "Beautiful acoustics"]'),
        ]
        
        for l in locations:
            db.session.add(l)
        db.session.commit()
        
        # Create sample events
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
        
if __name__ == '__main__':
    # Initialize database only if it doesn't exist or is empty
    init_db()
    
    # Get port from environment or use 8080
    port = int(os.environ.get('PORT', 8080))
    
    # Run the app
    print(f"🚀 Starting Chizu backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)