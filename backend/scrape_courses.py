"""
CMC Course Scraper - Custom for your HTML structure
Save as: backend/scrape_courses.py
Run: python backend/scrape_courses.py
"""

import re
from bs4 import BeautifulSoup
import json
from datetime import datetime

class Course:
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
        """Extract department from course code (e.g., AFRI from AFRI010A)"""
        match = re.match(r'([A-Z]+)', self.course_code)
        return match.group(1) if match else 'UNKNOWN'
    
    def extract_location(self):
        """Extract building and room from meetings string"""
        # Format: "MW 11:00AM-12:15PM / PO Campus, Lincoln, 1135"
        if not self.meetings or '/' not in self.meetings:
            return None, None
            
        location_part = self.meetings.split('/')[-1].strip()
        # Remove &nbsp; and clean up
        location_part = location_part.replace('&nbsp;', ' ').strip()
        
        parts = [p.strip() for p in location_part.split(',')]
        
        if len(parts) >= 2:
            building = parts[1]  # e.g., "Lincoln"
            room = parts[2] if len(parts) > 2 else None  # e.g., "1135"
            return building, room
        
        return None, None
    
    def extract_time(self):
        """Extract days and time from meetings string"""
        # Format: "MW 11:00AM-12:15PM / PO Campus, Lincoln, 1135"
        if not self.meetings:
            return None, None
        
        # Clean up &nbsp;
        meetings_clean = self.meetings.replace('&nbsp;', ' ').strip()
        
        if '/' not in meetings_clean:
            return None, None
            
        time_part = meetings_clean.split('/')[0].strip()
        
        # Parse days (e.g., "MW", "TR", "MWF")
        days_match = re.match(r'^([A-Z]+)\s+', time_part)
        days = days_match.group(1) if days_match else None
        
        # Parse time (e.g., "11:00AM-12:15PM")
        time_match = re.search(r'(\d+:\d+[AP]M-\d+:\d+[AP]M)', time_part)
        time = time_match.group(1) if time_match else None
        
        return days, time
    
    def extract_college(self):
        """Extract college from meetings string"""
        if not self.meetings:
            return 'PO'
            
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


def scrape_courses_from_html(html_file='courses.html'):
    """Scrape courses from your saved HTML file"""
    print("📚 Starting course scrape from", html_file)
    
    try:
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: {html_file} not found in backend folder!")
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    courses = []
    
    # Find the course table
    table = soup.find('table', class_='footable')
    if not table:
        print("❌ Could not find course table")
        return []
    
    tbody = table.find('tbody')
    if not tbody:
        print("❌ Could not find table body")
        return []
    
    # Note: HTML has typo "valig" instead of "valign"
    rows = tbody.find_all('tr')
    print(f"📋 Found {len(rows)} course rows")
    
    for row in rows:
        try:
            tds = row.find_all('td')
            if len(tds) < 6:
                continue
            
            # Extract data from each column based on your HTML structure
            course_section = tds[0].get_text(strip=True)  # "AFRI010A AF - 01"
            title = tds[1].get_text(strip=True)
            seats = tds[2].get_text(strip=True) if len(tds) > 2 else ''
            credit = tds[3].get_text(strip=True) if len(tds) > 3 else ''
            meetings = tds[4].get_text(strip=True) if len(tds) > 4 else ''
            instructors = tds[5].get_text(strip=True) if len(tds) > 5 else ''
            notes = tds[6].get_text(strip=True) if len(tds) > 6 else ''
            
            # Parse course code and section from "AFRI010A AF - 01"
            parts = course_section.split(' - ')
            course_code = parts[0].strip() if parts else course_section
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
            print(f"✅ Parsed: {course.course_code}-{course.section} - {course.title}")
            
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
    
    # Import here to avoid circular imports
    from app import app, db, Course as DBCourse, College, Location, Department
    
    with app.app_context():
        imported = 0
        skipped = 0
        updated = 0
        
        for course in courses:
            # Check if course already exists
            existing = DBCourse.query.filter_by(
                course_code=course.course_code,
                section=course.section,
                semester='Fall 2024'
            ).first()
            
            if existing:
                print(f"⏭️  Already exists: {course.course_code}-{course.section}")
                skipped += 1
                continue
            
            # Get college
            college_obj = College.query.filter_by(code=course.college).first()
            if not college_obj:
                college_obj = College.query.filter_by(code='PO').first()
            
            # Find location if building exists
            location_obj = None
            if course.building:
                location_obj = Location.query.filter(
                    Location.name.ilike(f'%{course.building}%')
                ).first()
            
            # Create course object
            new_course = DBCourse(
                course_code=course.course_code,
                section=course.section,
                title=course.title,
                department_code=course.department,
                college_id=college_obj.id if college_obj else 1,
                location_id=location_obj.id if location_obj else None,
                instructors=course.instructors,
                days=course.days,
                time=course.time,
                seats_available=course.seats_available,
                credit=course.credit,
                notes=course.notes,
                semester='Fall 2024'
            )
            
            db.session.add(new_course)
            imported += 1
            
            if imported % 50 == 0:
                print(f"📦 Imported {imported} courses so far...")
        
        db.session.commit()
        print(f"\n🎉 Import complete!")
        print(f"   ✅ Imported: {imported}")
        print(f"   ⏭️  Skipped: {skipped}")


if __name__ == '__main__':
    print("=" * 60)
    print("CMC COURSE SCRAPER")
    print("=" * 60)
    
    # Scrape courses from HTML file
    courses = scrape_courses_from_html('courses.html')
    
    if not courses:
        print("\n❌ No courses found! Check your HTML file.")
    else:
        print(f"\n✅ Successfully scraped {len(courses)} courses!")
        
        # Save to JSON
        save_to_json(courses)
        
        # Ask to import
        do_import = input("\n❓ Import courses to database? (yes/no): ").strip().lower()
        if do_import == 'yes':
            import_to_database(courses)
            print("\n🚀 Done! Restart your app to see the courses.")
        else:
            print("\n💾 Courses saved to courses_data.json")
            print("   Run this script again and type 'yes' to import later")