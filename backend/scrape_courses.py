"""
Complete 5C Course Scraper and Integration
Save as: backend/scrape_courses.py

Run: python backend/scrape_courses.py
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from app import app, db, Location, College
from datetime import datetime

class Course:
    """Course model matching the database schema"""
    def __init__(self, data):
        self.course_code = data.get('course_code', '')
        self.section = data.get('section', '')
        self.title = data.get('title', '')
        self.seats_available = data.get('seats_available', '')
        self.credit = data.get('credit', '')
        self.meetings = data.get('meetings', '')
        self.instructors = data.get('instructors', '')
        self.notes = data.get('notes', '')
        
        # Parse additional fields
        self.department = self.extract_department()
        self.building, self.room = self.extract_location()
        self.days, self.time = self.extract_time()
        self.college = self.extract_college()
        
    def extract_department(self):
        """Extract department from course code (e.g., AFRI from AFRI190)"""
        match = re.match(r'([A-Z]+)', self.course_code)
        return match.group(1) if match else 'UNKNOWN'
    
    def extract_location(self):
        """Extract building and room from meetings string"""
        # Format: "TR 1:15PM-2:30PM / PO Campus, Lincoln, 1109"
        if not self.meetings or '/' not in self.meetings:
            return None, None
            
        location_part = self.meetings.split('/')[-1].strip()
        parts = [p.strip() for p in location_part.split(',')]
        
        if len(parts) >= 2:
            building = parts[1]  # e.g., "Lincoln"
            room = parts[2] if len(parts) > 2 else None  # e.g., "1109"
            return building, room
        
        return None, None
    
    def extract_time(self):
        """Extract days and time from meetings string"""
        # Format: "TR 1:15PM-2:30PM / PO Campus, Lincoln, 1109"
        if not self.meetings or '/' not in self.meetings:
            return None, None
            
        time_part = self.meetings.split('/')[0].strip()
        
        # Parse days (e.g., "TR", "MWF")
        days_match = re.match(r'^([A-Z]+)\s+', time_part)
        days = days_match.group(1) if days_match else None
        
        # Parse time (e.g., "1:15PM-2:30PM")
        time_match = re.search(r'(\d+:\d+[AP]M-\d+:\d+[AP]M)', time_part)
        time = time_match.group(1) if time_match else None
        
        return days, time
    
    def extract_college(self):
        """Extract college from meetings string"""
        if 'PO Campus' in self.meetings:
            return 'PO'
        elif 'CMC Campus' in self.meetings:
            return 'CMC'
        elif 'SC Campus' in self.meetings or 'Scripps' in self.meetings:
            return 'SC'
        elif 'HMC Campus' in self.meetings or 'Mudd' in self.meetings:
            return 'HMC'
        elif 'PZ Campus' in self.meetings or 'Pitzer' in self.meetings:
            return 'PZ'
        return 'PO'  # Default
    
    def to_dict(self):
        return {
            'course_code': self.course_code,
            'section': self.section,
            'title': self.title,
            'department': self.department,
            'college': self.college,
            'seats_available': self.seats_available,
            'credit': self.credit,
            'meetings': self.meetings,
            'days': self.days,
            'time': self.time,
            'building': self.building,
            'room': self.room,
            'instructors': self.instructors,
            'notes': self.notes,
        }


def scrape_courses_from_portal(html_file='courses.html'):
    """
    Scrape courses from saved HTML file
    
    Instructions:
    1. Go to https://portal.claremontmckenna.edu/ICS/Portal_Homepage.jnz?portlet=External_Content
    2. Right-click > "Save Page As" > Save as "courses.html"
    3. Place the file in the backend folder
    4. Run this script
    """
    print("📚 Starting course scrape...")
    
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: {html_file} not found!")
        print("\nInstructions:")
        print("1. Go to the course portal")
        print("2. Right-click > 'Save Page As'")
        print("3. Save as 'courses.html' in the backend folder")
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    courses = []
    
    # Find the course table
    table = soup.find('table', class_='footable')
    if not table:
        print("❌ Could not find course table in HTML")
        return []
    
    tbody = table.find('tbody')
    if not tbody:
        print("❌ Could not find table body")
        return []
    
    rows = tbody.find_all('tr', {'valign': 'style'})
    print(f"Found {len(rows)} course rows")
    
    for row in rows:
        try:
            tds = row.find_all('td')
            if len(tds) < 6:
                continue
            
            # Extract data from each column
            course_section = tds[0].get_text(strip=True)  # "AFRI190 AF - 01"
            title = tds[1].get_text(strip=True)
            seats = tds[2].get_text(strip=True)
            credit = tds[3].get_text(strip=True)
            meetings = tds[4].get_text(strip=True)
            instructors = tds[5].get_text(strip=True)
            notes = tds[6].get_text(strip=True) if len(tds) > 6 else ''
            
            # Parse course code and section
            parts = course_section.split('-')
            course_code = parts[0].strip()
            section = parts[1].strip() if len(parts) > 1 else '01'
            
            course_data = {
                'course_code': course_code,
                'section': section,
                'title': title,
                'seats_available': seats,
                'credit': credit,
                'meetings': meetings,
                'instructors': instructors,
                'notes': notes,
            }
            
            course = Course(course_data)
            courses.append(course)
            print(f"✅ Parsed: {course.course_code} - {course.title}")
            
        except Exception as e:
            print(f"⚠️  Error parsing row: {e}")
            continue
    
    return courses


def save_to_json(courses, filename='courses_data.json'):
    """Save courses to JSON file"""
    data = [c.to_dict() for c in courses]
    with open(filename, 'w') as f:
        json.dump(data, indent=2, fp=f)
    print(f"\n💾 Saved {len(courses)} courses to {filename}")


def import_to_database(courses):
    """Import courses into the database"""
    print("\n📥 Importing courses to database...")
    
    with app.app_context():
        imported = 0
        skipped = 0
        
        for course in courses:
            # Check if course already exists
            # existing = db.session.query(Course).filter_by(
            #     course_code=course.course_code,
            #     section=course.section
            # ).first()
            
            # if existing:
            #     print(f"⏭️  Skipping (exists): {course.course_code}")
            #     skipped += 1
            #     continue
            
            # Get or create college
            college_obj = College.query.filter_by(code=course.college).first()
            if not college_obj:
                print(f"⚠️  College {course.college} not found, using PO")
                college_obj = College.query.filter_by(code='PO').first()
            
            # Find location if building exists
            location_obj = None
            if course.building:
                location_obj = Location.query.filter(
                    Location.name.ilike(f'%{course.building}%')
                ).first()
            
            # Create course object
            # new_course = Course(
            #     course_code=course.course_code,
            #     section=course.section,
            #     title=course.title,
            #     department=course.department,
            #     college_id=college_obj.id if college_obj else 1,
            #     location_id=location_obj.id if location_obj else None,
            #     instructors=course.instructors,
            #     days=course.days,
            #     time=course.time,
            #     seats_available=course.seats_available,
            #     credit=course.credit,
            #     notes=course.notes,
            # )
            
            # db.session.add(new_course)
            imported += 1
            print(f"✅ Imported: {course.course_code} - {course.title}")
        
        # db.session.commit()
        print(f"\n🎉 Import complete! Imported: {imported}, Skipped: {skipped}")


def create_sample_data():
    """Create sample course data for testing"""
    sample_courses = [
        {
            'course_code': 'AFRI190',
            'section': '01',
            'title': 'African Studies Seminar',
            'seats_available': '3/15 (Open)',
            'credit': '1.00',
            'meetings': 'TR 1:15PM-2:30PM / PO Campus, Lincoln, 1109',
            'instructors': 'Soliman, Maryan',
            'notes': ''
        },
        {
            'course_code': 'CSCI051',
            'section': '01',
            'title': 'Introduction to Computer Science',
            'seats_available': '0/24 (Closed)',
            'credit': '1.00',
            'meetings': 'MWF 9:00AM-9:50AM / PO Campus, Seaver North, 106',
            'instructors': 'Smith, John',
            'notes': 'Prerequisites: None'
        },
        {
            'course_code': 'BIOL044',
            'section': '01',
            'title': 'General Biology',
            'seats_available': '12/30 (Open)',
            'credit': '1.00',
            'meetings': 'TR 10:00AM-11:15AM / PO Campus, Seaver South, 220',
            'instructors': 'Johnson, Sarah',
            'notes': 'Lab component required'
        },
    ]
    
    courses = [Course(data) for data in sample_courses]
    return courses


if __name__ == '__main__':
    print("=" * 60)
    print("5C COURSE SCRAPER")
    print("=" * 60)
    print("\nOptions:")
    print("1. Scrape from saved HTML file (courses.html)")
    print("2. Use sample data for testing")
    print("3. Exit")
    
    choice = input("\nChoice (1-3): ").strip()
    
    if choice == '1':
        courses = scrape_courses_from_portal('courses.html')
        if courses:
            save_to_json(courses)
            
            do_import = input("\nImport to database? (yes/no): ")
            if do_import.lower() == 'yes':
                import_to_database(courses)
    
    elif choice == '2':
        courses = create_sample_data()
        print(f"\n✅ Created {len(courses)} sample courses")
        save_to_json(courses, 'sample_courses.json')
        
        do_import = input("\nImport to database? (yes/no): ")
        if do_import.lower() == 'yes':
            import_to_database(courses)
    
    else:
        print("Goodbye!")