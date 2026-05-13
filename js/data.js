/* ============================================================
   data.js — localStorage-backed data layer for SRMS
   ------------------------------------------------------------
   Tables (keys in localStorage):
     srms.students   [{ id, name, rollNo, class, section, dob, email, password }]
     srms.subjects   [{ id, code, name, maxMarks }]
     srms.exams      [{ id, name, year }]
     srms.marks      [{ id, studentId, subjectId, examId, marks }]
     srms.admin      { username, password }
     srms.seeded     boolean
   ============================================================ */
(function (global) {
  const KEYS = {
    students: 'srms.students',
    subjects: 'srms.subjects',
    exams: 'srms.exams',
    marks: 'srms.marks',
    admin: 'srms.admin',
    seeded: 'srms.seeded',
    session: 'srms.session'
  };

  // ---------- low-level helpers ----------
  const read = (k, fallback) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('read error', k, e);
      return fallback;
    }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 9);

  // ---------- seeding ----------
  function seedIfEmpty() {
    if (read(KEYS.seeded, false)) return;

    write(KEYS.admin, { username: 'admin', password: 'admin123' });

    const subjects = [
      { id: uid('sub'), code: 'ENG', name: 'English',     maxMarks: 100 },
      { id: uid('sub'), code: 'MAT', name: 'Mathematics', maxMarks: 100 },
      { id: uid('sub'), code: 'SCI', name: 'Science',     maxMarks: 100 },
      { id: uid('sub'), code: 'SOC', name: 'Social Studies', maxMarks: 100 },
      { id: uid('sub'), code: 'CMP', name: 'Computer',    maxMarks: 100 }
    ];
    write(KEYS.subjects, subjects);

    const exams = [
      { id: uid('exm'), name: 'Mid-Term',  year: 2026 },
      { id: uid('exm'), name: 'Final',     year: 2026 }
    ];
    write(KEYS.exams, exams);

    const students = [
      { id: uid('stu'), rollNo: 'S1001', name: 'Aarav Sharma',  class: '10', section: 'A', dob: '2010-06-12', email: 'aarav@example.com',  password: 'student123' },
      { id: uid('stu'), rollNo: 'S1002', name: 'Priya Singh',   class: '10', section: 'A', dob: '2010-03-22', email: 'priya@example.com',  password: 'student123' },
      { id: uid('stu'), rollNo: 'S1003', name: 'Rohan Verma',   class: '10', section: 'A', dob: '2010-09-05', email: 'rohan@example.com',  password: 'student123' },
      { id: uid('stu'), rollNo: 'S1004', name: 'Isha Patel',    class: '10', section: 'B', dob: '2010-11-18', email: 'isha@example.com',   password: 'student123' },
      { id: uid('stu'), rollNo: 'S1005', name: 'Karan Mehta',   class: '10', section: 'B', dob: '2010-01-30', email: 'karan@example.com',  password: 'student123' },
      { id: uid('stu'), rollNo: 'S1006', name: 'Neha Gupta',    class: '10', section: 'B', dob: '2010-07-14', email: 'neha@example.com',   password: 'student123' }
    ];
    write(KEYS.students, students);

    // deterministic-ish marks for demo
    const seedMarks = [
      [88, 92, 84, 79, 95],
      [76, 84, 90, 82, 88],
      [65, 58, 72, 68, 74],
      [92, 88, 95, 90, 86],
      [45, 52, 48, 55, 60],
      [80, 75, 78, 82, 84]
    ];
    const marks = [];
    students.forEach((stu, i) => {
      subjects.forEach((sub, j) => {
        exams.forEach((exm, k) => {
          // small variance between exams
          const base = seedMarks[i][j];
          const delta = k === 0 ? 0 : Math.round((Math.sin((i + j) * 1.7) * 6));
          let m = Math.max(0, Math.min(sub.maxMarks, base + delta));
          marks.push({
            id: uid('mrk'),
            studentId: stu.id,
            subjectId: sub.id,
            examId: exm.id,
            marks: m
          });
        });
      });
    });
    write(KEYS.marks, marks);

    write(KEYS.seeded, true);
  }

  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    seedIfEmpty();
  }

  // ---------- public API ----------
  const SRMS = {
    KEYS,
    seedIfEmpty,
    resetAll,

    // admin auth
    getAdmin: () => read(KEYS.admin, { username: 'admin', password: 'admin123' }),
    updateAdminPassword(newPw) {
      const a = SRMS.getAdmin();
      a.password = newPw;
      write(KEYS.admin, a);
    },

    // session
    setSession(role, identifier) {
      write(KEYS.session, { role, identifier, ts: Date.now() });
    },
    getSession: () => read(KEYS.session, null),
    clearSession: () => localStorage.removeItem(KEYS.session),

    // students
    listStudents: () => read(KEYS.students, []),
    getStudent: (id) => SRMS.listStudents().find(s => s.id === id),
    getStudentByRoll: (rollNo) => SRMS.listStudents().find(s => s.rollNo.toLowerCase() === String(rollNo).toLowerCase()),
    addStudent(s) {
      const list = SRMS.listStudents();
      if (list.some(x => x.rollNo.toLowerCase() === s.rollNo.toLowerCase())) {
        throw new Error('Roll No already exists');
      }
      const record = { id: uid('stu'), password: 'student123', ...s };
      list.push(record);
      write(KEYS.students, list);
      return record;
    },
    updateStudent(id, patch) {
      const list = SRMS.listStudents();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Student not found');
      if (patch.rollNo && list.some(x => x.id !== id && x.rollNo.toLowerCase() === patch.rollNo.toLowerCase())) {
        throw new Error('Roll No already exists');
      }
      list[idx] = { ...list[idx], ...patch };
      write(KEYS.students, list);
      return list[idx];
    },
    deleteStudent(id) {
      write(KEYS.students, SRMS.listStudents().filter(s => s.id !== id));
      write(KEYS.marks, SRMS.listMarks().filter(m => m.studentId !== id));
    },

    // subjects
    listSubjects: () => read(KEYS.subjects, []),
    getSubject: (id) => SRMS.listSubjects().find(s => s.id === id),
    addSubject(sub) {
      const list = SRMS.listSubjects();
      if (list.some(x => x.code.toLowerCase() === sub.code.toLowerCase())) {
        throw new Error('Subject code already exists');
      }
      const record = { id: uid('sub'), maxMarks: 100, ...sub };
      list.push(record);
      write(KEYS.subjects, list);
      return record;
    },
    updateSubject(id, patch) {
      const list = SRMS.listSubjects();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Subject not found');
      if (patch.code && list.some(x => x.id !== id && x.code.toLowerCase() === patch.code.toLowerCase())) {
        throw new Error('Subject code already exists');
      }
      list[idx] = { ...list[idx], ...patch };
      write(KEYS.subjects, list);
      return list[idx];
    },
    deleteSubject(id) {
      write(KEYS.subjects, SRMS.listSubjects().filter(s => s.id !== id));
      write(KEYS.marks, SRMS.listMarks().filter(m => m.subjectId !== id));
    },

    // exams
    listExams: () => read(KEYS.exams, []),
    getExam: (id) => SRMS.listExams().find(e => e.id === id),
    addExam(e) {
      const list = SRMS.listExams();
      const record = { id: uid('exm'), year: new Date().getFullYear(), ...e };
      list.push(record);
      write(KEYS.exams, list);
      return record;
    },
    deleteExam(id) {
      write(KEYS.exams, SRMS.listExams().filter(e => e.id !== id));
      write(KEYS.marks, SRMS.listMarks().filter(m => m.examId !== id));
    },

    // marks
    listMarks: () => read(KEYS.marks, []),
    upsertMark({ studentId, subjectId, examId, marks }) {
      const list = SRMS.listMarks();
      const idx = list.findIndex(m =>
        m.studentId === studentId &&
        m.subjectId === subjectId &&
        m.examId === examId
      );
      if (idx >= 0) {
        list[idx].marks = marks;
      } else {
        list.push({ id: uid('mrk'), studentId, subjectId, examId, marks });
      }
      write(KEYS.marks, list);
    },
    getMark(studentId, subjectId, examId) {
      return SRMS.listMarks().find(m =>
        m.studentId === studentId &&
        m.subjectId === subjectId &&
        m.examId === examId
      );
    },
    deleteMark(studentId, subjectId, examId) {
      write(KEYS.marks, SRMS.listMarks().filter(m =>
        !(m.studentId === studentId && m.subjectId === subjectId && m.examId === examId)
      ));
    },

    // ---------- derived helpers ----------
    /**
     * Compute a report card for a student in an exam.
     * Returns { rows:[{subject, marks, max, grade}], total, max, percent, overallGrade, status }
     */
    computeReport(studentId, examId) {
      const subjects = SRMS.listSubjects();
      const marks = SRMS.listMarks();
      const rows = subjects.map(sub => {
        const m = marks.find(x => x.studentId === studentId && x.subjectId === sub.id && x.examId === examId);
        const mk = m ? m.marks : null;
        return {
          subjectId: sub.id,
          subject: sub.name,
          code: sub.code,
          marks: mk,
          max: sub.maxMarks,
          grade: mk == null ? '—' : SRMS.gradeFor((mk / sub.maxMarks) * 100)
        };
      });
      const recorded = rows.filter(r => r.marks != null);
      const total = recorded.reduce((s, r) => s + r.marks, 0);
      const max = recorded.reduce((s, r) => s + r.max, 0);
      const percent = max > 0 ? (total / max) * 100 : 0;
      const overallGrade = recorded.length ? SRMS.gradeFor(percent) : '—';
      const status = recorded.every(r => (r.marks / r.max) * 100 >= 35) && recorded.length > 0 ? 'PASS' : (recorded.length ? 'FAIL' : 'N/A');
      return { rows, total, max, percent, overallGrade, status };
    },

    gradeFor(pct) {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B';
      if (pct >= 60) return 'C';
      if (pct >= 50) return 'D';
      if (pct >= 35) return 'E';
      return 'F';
    },

    /** Class-wide aggregates for charts. */
    classStats(examId) {
      const students = SRMS.listStudents();
      const subjects = SRMS.listSubjects();
      const perStudent = students.map(s => {
        const r = SRMS.computeReport(s.id, examId);
        return { student: s, percent: r.percent, status: r.status, total: r.total, max: r.max };
      });
      const passing = perStudent.filter(p => p.status === 'PASS').length;
      const failing = perStudent.filter(p => p.status === 'FAIL').length;
      const na = perStudent.length - passing - failing;
      const subjectAvg = subjects.map(sub => {
        const ms = SRMS.listMarks().filter(m => m.subjectId === sub.id && m.examId === examId);
        const avg = ms.length ? (ms.reduce((s, m) => s + m.marks, 0) / ms.length) : 0;
        return { subject: sub.name, code: sub.code, avg, max: sub.maxMarks };
      });
      const topPerformers = [...perStudent]
        .filter(p => p.max > 0)
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5);
      return { perStudent, passing, failing, na, subjectAvg, topPerformers };
    }
  };

  global.SRMS = SRMS;
  // Always ensure demo data exists
  SRMS.seedIfEmpty();
})(window);
