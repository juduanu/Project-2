const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB = 'unidb';

async function query1_enrollmentsByDepartment() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  const results = await db.collection('students').aggregate([
    {
      $group: {
        _id: '$major_department.name',
        studentCount: { $sum: 1 },
        totalEnrollments: { $sum: { $size: '$enrollments' } },
        avgEnrollmentsPerStudent: { $avg: { $size: '$enrollments' } }
      }
    },
    { $sort: { studentCount: -1 } },
    {
      $project: {
        department: '$_id',
        studentCount: 1,
        totalEnrollments: 1,
        avgEnrollmentsPerStudent: { $round: ['$avgEnrollmentsPerStudent', 2] },
        _id: 0
      }
    }
  ]).toArray();

  console.log('\n=== QUERY 1: Student & Enrollment Count by Department (Aggregation) ===');
  console.table(results);
  await client.close();
}

async function query2_complexSearch() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  const results = await db.collection('students').find({
    $or: [
      {
        $and: [
          { 'major_department.name': 'Computer Science' },
          { 'enrollments.grade': { $in: ['A', 'A+', 'A-'] } }
        ]
      },
      {
        $and: [
          { 'enrollments.semester': 'Fall 2025' },
          {
            $expr: {
              $gte: [
                {
                  $size: {
                    $filter: {
                      input: '$enrollments',
                      as: 'e',
                      cond: { $eq: ['$$e.semester', 'Fall 2025'] }
                    }
                  }
                },
                3
              ]
            }
          }
        ]
      }
    ]
  }, { projection: { name: 1, 'major_department.name': 1, enrollments: 1, _id: 0 } }).toArray();

  console.log('\n=== QUERY 2: Complex Search — CS students with A grade OR 3+ Fall sections ===');
  results.forEach(s => {
    console.log(`\n${s.name} (${s.major_department.name})`);
    s.enrollments.forEach(e => console.log(`  ${e.course_code} | ${e.semester} | Grade: ${e.grade}`));
  });
  await client.close();
}

async function query3_countSectionsByProfessor() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  const results = await db.collection('professors').aggregate([
    { $unwind: '$sections_taught' },
    {
      $group: {
        _id: { professor: '$name', semester: '$sections_taught.semester' },
        sectionCount: { $sum: 1 },
        courses: { $push: '$sections_taught.course_code' }
      }
    },
    { $sort: { '_id.professor': 1, '_id.semester': 1 } },
    {
      $project: {
        professor: '$_id.professor',
        semester: '$_id.semester',
        sectionCount: 1,
        courses: 1,
        _id: 0
      }
    }
  ]).toArray();

  console.log('\n=== QUERY 3: Sections Taught per Professor per Semester ===');
  console.table(results.map(r => ({
    professor: r.professor,
    semester: r.semester,
    sections: r.sectionCount,
    courses: r.courses.join(', ')
  })));
  await client.close();
}

async function query4_updateGrade(studentId, courseCode, sectionId, newGrade) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  // Get current grade first
  const student = await db.collection('students').findOne(
    { student_id: studentId, 'enrollments.course_code': courseCode, 'enrollments.section_id': sectionId },
    { projection: { name: 1, 'enrollments.$': 1 } }
  );

  if (!student) {
    console.log(`\nNo enrollment found for student ${studentId} in ${courseCode} section ${sectionId}`);
    await client.close();
    return;
  }

  const oldGrade = student.enrollments[0].grade;

  const result = await db.collection('students').updateOne(
    {
      student_id: studentId,
      'enrollments.course_code': courseCode,
      'enrollments.section_id': sectionId
    },
    { $set: { 'enrollments.$.grade': newGrade } }
  );

  console.log('\n=== QUERY 4: Update Grade Based on Query Parameter ===');
  console.log(`Student: ${student.name}`);
  console.log(`Course: ${courseCode} | Section: ${sectionId}`);
  console.log(`Grade: ${oldGrade} → ${newGrade}`);
  console.log(`Modified: ${result.modifiedCount} document(s)`);
  await client.close();
}

async function query5_studentGPA() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  const results = await db.collection('students').aggregate([
    {
      $project: {
        name: 1,
        major: '$major_department.name',
        totalCourses: { $size: '$enrollments' },
        gpa: {
          $avg: {
            $map: {
              input: '$enrollments',
              as: 'e',
              in: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$$e.grade', 'A+'] }, then: 4.0 },
                    { case: { $eq: ['$$e.grade', 'A']  }, then: 4.0 },
                    { case: { $eq: ['$$e.grade', 'A-'] }, then: 3.7 },
                    { case: { $eq: ['$$e.grade', 'B+'] }, then: 3.3 },
                    { case: { $eq: ['$$e.grade', 'B']  }, then: 3.0 },
                    { case: { $eq: ['$$e.grade', 'B-'] }, then: 2.7 },
                    { case: { $eq: ['$$e.grade', 'C+'] }, then: 2.3 },
                    { case: { $eq: ['$$e.grade', 'C']  }, then: 2.0 }
                  ],
                  default: 0.0
                }
              }
            }
          }
        }
      }
    },
    { $sort: { gpa: -1 } },
    { $project: { name: 1, major: 1, totalCourses: 1, gpa: { $round: ['$gpa', 2] }, _id: 0 } }
  ]).toArray();

  console.log('\n=== QUERY 5: Student GPA Leaderboard (Aggregation with $map + $switch) ===');
  console.table(results);
  await client.close();
}

(async () => {
  try {
    await query1_enrollmentsByDepartment();
    await query2_complexSearch();
    await query3_countSectionsByProfessor();
    await query4_updateGrade(501, 'CS101', 1001, 'A+');
    await query5_studentGPA();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
