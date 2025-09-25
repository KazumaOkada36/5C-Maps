class College(Model):
    name = CharField()  # Pomona, CMC, Scripps, etc.
    code = CharField()  # PO, CMC, SC, etc.

class Department(Model):
    name = CharField()  # Biology, Computer Science
    college = ForeignKey(College)
    code = CharField()  # BIOL, CSCI

class Course(Model):
    title = CharField()  # "Intro to Biology"
    number = CharField()  # "101"
    department = ForeignKey(Department)
    description = TextField()
    credits = IntegerField()
    
class CourseOffering(Model):
    course = ForeignKey(Course)
    semester = CharField()  # Fall 2024
    instructor = CharField()
    location = CharField()  # Building + room
    time_slots = JSONField()  # [{"days": "MWF", "time": "9:00-10:15"}]
    enrollment_limit = IntegerField()