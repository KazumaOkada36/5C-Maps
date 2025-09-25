import requests
from bs4 import BeautifulSoup
import time
import logging
from abc import ABC, abstractmethod

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    """Base class for all scrapers with common functionality"""
    
    def __init__(self, college_name, college_code, base_url):
        self.college_name = college_name
        self.college_code = college_code
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (5C Maps Bot) Academic Research'
        })
        
    def make_request(self, url, method='GET', data=None, headers=None, timeout=10):
        """Make HTTP request with error handling and rate limiting"""
        try:
            # Rate limiting - be respectful
            time.sleep(1)
            
            if method == 'GET':
                response = self.session.get(url, timeout=timeout, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, data=data, timeout=timeout, headers=headers)
            
            response.raise_for_status()
            return response
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {str(e)}")
            return None
    
    def parse_html(self, html_content):
        """Parse HTML content with BeautifulSoup"""
        return BeautifulSoup(html_content, 'html.parser')
    
    def clean_text(self, text):
        """Clean and normalize text content"""
        if not text:
            return ""
        return " ".join(text.strip().split())
    
    def extract_course_number(self, course_string):
        """Extract course number from course string like 'CSCI 101'"""
        parts = course_string.split()
        if len(parts) >= 2:
            return parts[1]  # Return '101' from 'CSCI 101'
        return course_string
    
    def parse_time_slot(self, time_string):
        """Parse time slot string into structured data"""
        # Example: "MWF 9:00-10:15" -> {"days": "MWF", "start": "9:00", "end": "10:15"}
        try:
            if not time_string:
                return None
                
            parts = time_string.strip().split()
            if len(parts) >= 2:
                days = parts[0]
                time_part = parts[1]
                
                if '-' in time_part:
                    start_time, end_time = time_part.split('-')
                    return {
                        "days": days,
                        "start_time": start_time.strip(),
                        "end_time": end_time.strip()
                    }
            
            return {"raw": time_string}
            
        except Exception as e:
            logger.warning(f"Failed to parse time slot '{time_string}': {str(e)}")
            return {"raw": time_string}
    
    def validate_course_data(self, course_data):
        """Validate required course data fields"""
        required_fields = ['title', 'course_number', 'department_code']
        
        for field in required_fields:
            if not course_data.get(field):
                logger.warning(f"Missing required field '{field}' in course data")
                return False
        
        return True
    
    def save_to_database(self, courses_data, locations_data=None):
        """Save scraped data to database"""
        from model.models import College, Department, Course, Location, db
        
        try:
            # Find or create college
            college = College.query.filter_by(code=self.college_code).first()
            if not college:
                college = College(name=self.college_name, code=self.college_code)
                db.session.add(college)
                db.session.commit()
            
            courses_saved = 0
            
            # Save courses
            for course_data in courses_data:
                if not self.validate_course_data(course_data):
                    continue
                
                # Find or create department
                department = Department.query.filter_by(
                    code=course_data['department_code'],
                    college_id=college.id
                ).first()
                
                if not department:
                    department = Department(
                        name=course_data.get('department_name', course_data['department_code']),
                        code=course_data['department_code'],
                        college_id=college.id
                    )
                    db.session.add(department)
                    db.session.commit()
                
                # Check if course already exists
                existing_course = Course.query.filter_by(
                    course_number=course_data['course_number'],
                    department_id=department.id,
                    semester=course_data.get('semester', 'Current')
                ).first()
                
                if existing_course:
                    # Update existing course
                    existing_course.title = course_data['title']
                    existing_course.description = course_data.get('description')
                    existing_course.instructor = course_data.get('instructor')
                    existing_course.credits = course_data.get('credits', 1)
                    
                    if course_data.get('time_slots'):
                        existing_course.set_time_slots(course_data['time_slots'])
                    
                else:
                    # Create new course
                    new_course = Course(
                        title=course_data['title'],
                        course_number=course_data['course_number'],
                        description=course_data.get('description'),
                        credits=course_data.get('credits', 1),
                        semester=course_data.get('semester', 'Current'),
                        instructor=course_data.get('instructor'),
                        department_id=department.id,
                        college_id=college.id,
                        enrollment_limit=course_data.get('enrollment_limit')
                    )
                    
                    if course_data.get('time_slots'):
                        new_course.set_time_slots(course_data['time_slots'])
                    
                    db.session.add(new_course)
                
                courses_saved += 1
            
            db.session.commit()
            logger.info(f"Successfully saved {courses_saved} courses for {self.college_name}")
            
        except Exception as e:
            logger.error(f"Database save failed: {str(e)}")
            db.session.rollback()
            raise
    
    @abstractmethod
    def scrape_locations(self):
        """Abstract method - each college scraper must implement this"""
        pass
    
    def run_full_scrape(self):
        """Run complete scraping process"""
        logger.info(f"Starting scrape for {self.college_name}")
        
        try:
            # Scrape courses
            courses_data = self.scrape_courses()
            logger.info(f"Scraped {len(courses_data)} courses")
            
            # Scrape locations (optional)
            locations_data = []
            try:
                locations_data = self.scrape_locations()
                logger.info(f"Scraped {len(locations_data)} locations")
            except NotImplementedError:
                logger.info("Location scraping not implemented for this college")
            
            # Save to database
            self.save_to_database(courses_data, locations_data)
            
            logger.info(f"Completed scrape for {self.college_name}")
            return True
            
        except Exception as e:
            logger.error(f"Scrape failed for {self.college_name}: {str(e)}")
            return False
    def scrape_courses(self):
        """Abstract method - each college scraper must implement this"""
        pass
    
    @abstractmetho
    def scrape_locations(self):
    """Abstract method - each college scraper must implement this"""
    pass