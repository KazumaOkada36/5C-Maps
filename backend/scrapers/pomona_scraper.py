from .base_scraper import BaseScraper
import re
import json

class PomonaScraper(BaseScraper):
    """Scraper for Pomona College course data"""
    
    def __init__(self):
        super().__init__(
            college_name="Pomona College",
            college_code="PO", 
            base_url="https://catalog.pomona.edu"
        )
        # You might need login credentials for Portal
        self.portal_url = "https://portal.pomona.edu"
    
    def scrape_courses(self):
        """Scrape course data from Pomona College sources"""
        courses = []
        
        try:
            # Method 1: Try to scrape from public course catalog
            courses.extend(self._scrape_catalog())
            
            # Method 2: Try to scrape from Portal (requires auth)
            # courses.extend(self._scrape_portal())
            
        except Exception as e:
            self.logger.error(f"Failed to scrape Pomona courses: {str(e)}")
        
        return courses
    
    def _scrape_catalog(self):
        """Scrape from public course catalog"""
        courses = []
        
        # This is a template - you'd need to adapt to actual Pomona catalog structure
        catalog_url = f"{self.base_url}/courses"
        
        response = self.make_request(catalog_url)
        if not response:
            return courses
        
        soup = self.parse_html(response.text)
        
        # Example parsing - adapt to actual HTML structure
        course_elements = soup.find_all('div', class_='course-item')
        
        for course_elem in course_elements:
            try:
                course_data = self._parse_course_element(course_elem)
                if course_data:
                    courses.append(course_data)
            except Exception as e:
                self.logger.warning(f"Failed to parse course element: {str(e)}")
                continue
        
        return courses
    
    def _parse_course_element(self, course_elem):
        """Parse individual course element"""
        try:
            # Example parsing - adapt to actual structure
            title_elem = course_elem.find('h3', class_='course-title')
            if not title_elem:
                return None
            
            title = self.clean_text(title_elem.get_text())
            
            # Extract course number from title like "CSCI 101: Intro to CS"
            course_match = re.search(r'([A-Z]{2,4})\s*(\d+[A-Z]*)', title)
            if not course_match:
                return None
            
            dept_code = course_match.group(1)
            course_number = course_match.group(2)
            
            # Extract description
            desc_elem = course_elem.find('div', class_='course-description')
            description = self.clean_text(desc_elem.get_text()) if desc_elem else ""
            
            # Extract instructor
            instructor_elem = course_elem.find('span', class_='instructor')
            instructor = self.clean_text(instructor_elem.get_text()) if instructor_elem else ""
            
            # Extract time/location info
            time_elem = course_elem.find('span', class_='time')
            time_text = self.clean_text(time_elem.get_text()) if time_elem else ""
            
            time_slots = []
            if time_text:
                time_slot = self.parse_time_slot(time_text)
                if time_slot:
                    time_slots.append(time_slot)
            
            # Extract credits
            credits_elem = course_elem.find('span', class_='credits')
            credits = 1  # default
            if credits_elem:
                credits_text = credits_elem.get_text()
                credits_match = re.search(r'(\d+)', credits_text)
                if credits_match:
                    credits = int(credits_match.group(1))
            
            return {
                'title': title,
                'course_number': course_number,
                'department_code': dept_code,
                'department_name': self._get_department_name(dept_code),
                'description': description,
                'instructor': instructor,
                'credits': credits,
                'semester': 'Fall 2024',  # You'd extract this from the page
                'time_slots': time_slots
            }
            
        except Exception as e:
            self.logger.error(f"Error parsing course element: {str(e)}")
            return None
    
    def _get_department_name(self, dept_code):
        """Convert department code to full name"""
        dept_mapping = {
            'CSCI': 'Computer Science',
            'MATH': 'Mathematics',
            'BIOL': 'Biology',
            'CHEM': 'Chemistry',
            'PHYS': 'Physics',
            'ECON': 'Economics',
            'ENGL': 'English',
            'HIST': 'History',
            'PSYC': 'Psychology',
            'POLI': 'Politics',
            # Add more as needed
        }
        return dept_mapping.get(dept_code, dept_code)
    
    def scrape_locations(self):
        """Scrape location data for Pomona College"""
        locations = []
        
        # Hardcoded locations for now - you could scrape from campus map
        pomona_locations = [
            {
                'name': 'Seaver North',
                'building_code': 'SN',
                'category': 'academic',
                'latitude': 34.0980,
                'longitude': -117.7070,
                'address': '645 N College Ave, Claremont, CA 91711',
                'description': 'Science building with biology and chemistry labs'
            },
            {
                'name': 'Edmunds Union',
                'building_code': 'EU',
                'category': 'dining',
                'latitude': 34.0975,
                'longitude': -117.7075,
                'address': 'Pomona College, Claremont, CA 91711',
                'description': 'Student union building with dining facilities'
            },
            {
                'name': 'Bridges Auditorium',
                'building_code': 'BA',
                'category': 'academic',
                'latitude': 34.0969,
                'longitude': -117.7073,
                'address': 'Pomona College, Claremont, CA 91711',
                'description': 'Main auditorium for performances and lectures'
            },
            {
                'name': 'Frank Dining Hall',
                'building_code': 'FDH',
                'category': 'dining',
                'latitude': 34.0975,
                'longitude': -117.7080,
                'address': 'Pomona College, Claremont, CA 91711',
                'description': 'Main dining hall',
                'hours': {
                    'monday': {'open': '7:00', 'close': '21:00'},
                    'tuesday': {'open': '7:00', 'close': '21:00'},
                    'wednesday': {'open': '7:00', 'close': '21:00'},
                    'thursday': {'open': '7:00', 'close': '21:00'},
                    'friday': {'open': '7:00', 'close': '21:00'},
                    'saturday': {'open': '8:00', 'close': '20:00'},
                    'sunday': {'open': '8:00', 'close': '20:00'}
                }
            }
        ]
        
        return pomona_locations

# Usage example
if __name__ == "__main__":
    scraper = PomonaScraper()
    success = scraper.run_full_scrape()
    print(f"Scraping {'succeeded' if success else 'failed'}")