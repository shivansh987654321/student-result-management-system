/* ============================================================
   data.js — API-backed data layer for SRMS
   ------------------------------------------------------------
   Talks to the Spring Boot REST API under /api and keeps an
   in-memory cache so the rest of the UI can stay synchronous.

   Lifecycle:
     1. A page calls  await SRMS.init()  once (after login).
        This loads the cache from the server.
     2. Read methods (listStudents, getStudent, ...) return from
        the cache synchronously.
     3. Write methods update the cache immediately AND persist to
        the server in the background. Failures are reported via a
        'srms:error' window event (pages can listen and toast).

   The session (who is logged in) is kept in localStorage; all
   real data now lives in the server's SQLite database.
   ============================================================ */
(function (global) {
  const API = '/api';
  const SESSION_KEY = 'srms.session';

  // in-memory cache, populated by init()
  const cache = {
    students: [],
    subjects: [],
    exams: [],
    marks: []
  };

  // ---------- low-level helpers ----------
  const uid = (prefix) => prefix + '_' + Math.random().toString(36).slice(2, 9);

  async function api(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(API + path, opts);
    if (!res.ok) {
      let msg = 'Request failed (' + res.status + ')';
      try {
        const data = await res.json();
        if (data && (data.message || data.error)) msg = data.message || data.error;
      } catch (_) { /* non-JSON error body */ }
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // Fire-and-forget a write; surface failures so cache/DB drift is visible.
  function persist(promise) {
    return promise.catch((err) => {
      console.error('SRMS persist error:', err);
      global.dispatchEvent(new CustomEvent('srms:error', { detail: err.message || String(err) }));
    });
  }

  // ---------- public API ----------
  const SRMS = {
    // ----- bootstrap -----
    /** Load the cache from the server. Scopes the load to the logged-in role. */
    async init() {
      const session = SRMS.getSession();
      const [subjects, exams] = await Promise.all([
        api('GET', '/subjects'),
        api('GET', '/exams')
      ]);
      cache.subjects = subjects || [];
      cache.exams = exams || [];

      if (session && session.role === 'student') {
        const id = session.identifier;
        const [me, myMarks] = await Promise.all([
          api('GET', '/students/' + encodeURIComponent(id)).catch(() => null),
          api('GET', '/marks?studentId=' + encodeURIComponent(id))
        ]);
        cache.students = me ? [me] : [];
        cache.marks = myMarks || [];
      } else {
        const [students, marks] = await Promise.all([
          api('GET', '/students'),
          api('GET', '/marks')
        ]);
        cache.students = students || [];
        cache.marks = marks || [];
      }
    },

    // ----- auth / session -----
    /** Validate credentials against the server. Resolves to the session descriptor. */
    login(role, username, password) {
      return api('POST', '/auth/login', { role, username, password });
    },
    setSession(role, identifier) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ role, identifier, ts: Date.now() }));
    },
    getSession() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },
    clearSession: () => localStorage.removeItem(SESSION_KEY),

    updateAdminPassword(newPw) {
      return persist(api('PUT', '/admin/password', { password: newPw }));
    },

    /** Wipe all data on the server, restore the demo seed, then reload the cache. */
    async resetAll() {
      await api('POST', '/admin/reset');
      await SRMS.init();
    },

    // ----- students -----
    listStudents: () => cache.students,
    getStudent: (id) => cache.students.find(s => s.id === id),
    getStudentByRoll: (rollNo) =>
      cache.students.find(s => s.rollNo.toLowerCase() === String(rollNo).toLowerCase()),
    addStudent(s) {
      if (cache.students.some(x => x.rollNo.toLowerCase() === s.rollNo.toLowerCase())) {
        throw new Error('Roll No already exists');
      }
      const record = { id: uid('stu'), password: 'student123', ...s };
      cache.students.push(record);
      persist(api('POST', '/students', record));
      return record;
    },
    updateStudent(id, patch) {
      const idx = cache.students.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Student not found');
      if (patch.rollNo && cache.students.some(x => x.id !== id && x.rollNo.toLowerCase() === patch.rollNo.toLowerCase())) {
        throw new Error('Roll No already exists');
      }
      cache.students[idx] = { ...cache.students[idx], ...patch };
      persist(api('PUT', '/students/' + encodeURIComponent(id), cache.students[idx]));
      return cache.students[idx];
    },
    deleteStudent(id) {
      cache.students = cache.students.filter(s => s.id !== id);
      cache.marks = cache.marks.filter(m => m.studentId !== id);
      persist(api('DELETE', '/students/' + encodeURIComponent(id)));
    },

    // ----- subjects -----
    listSubjects: () => cache.subjects,
    getSubject: (id) => cache.subjects.find(s => s.id === id),
    addSubject(sub) {
      if (cache.subjects.some(x => x.code.toLowerCase() === sub.code.toLowerCase())) {
        throw new Error('Subject code already exists');
      }
      const record = { id: uid('sub'), maxMarks: 100, ...sub };
      cache.subjects.push(record);
      persist(api('POST', '/subjects', record));
      return record;
    },
    updateSubject(id, patch) {
      const idx = cache.subjects.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Subject not found');
      if (patch.code && cache.subjects.some(x => x.id !== id && x.code.toLowerCase() === patch.code.toLowerCase())) {
        throw new Error('Subject code already exists');
      }
      cache.subjects[idx] = { ...cache.subjects[idx], ...patch };
      persist(api('PUT', '/subjects/' + encodeURIComponent(id), cache.subjects[idx]));
      return cache.subjects[idx];
    },
    deleteSubject(id) {
      cache.subjects = cache.subjects.filter(s => s.id !== id);
      cache.marks = cache.marks.filter(m => m.subjectId !== id);
      persist(api('DELETE', '/subjects/' + encodeURIComponent(id)));
    },

    // ----- exams -----
    listExams: () => cache.exams,
    getExam: (id) => cache.exams.find(e => e.id === id),
    addExam(e) {
      const record = { id: uid('exm'), year: new Date().getFullYear(), ...e };
      cache.exams.push(record);
      persist(api('POST', '/exams', record));
      return record;
    },
    deleteExam(id) {
      cache.exams = cache.exams.filter(e => e.id !== id);
      cache.marks = cache.marks.filter(m => m.examId !== id);
      persist(api('DELETE', '/exams/' + encodeURIComponent(id)));
    },

    // ----- marks -----
    listMarks: () => cache.marks,
    upsertMark({ studentId, subjectId, examId, marks }) {
      const idx = cache.marks.findIndex(m =>
        m.studentId === studentId && m.subjectId === subjectId && m.examId === examId);
      if (idx >= 0) {
        cache.marks[idx].marks = marks;
      } else {
        cache.marks.push({ id: uid('mrk'), studentId, subjectId, examId, marks });
      }
      persist(api('POST', '/marks', { studentId, subjectId, examId, marks }));
    },
    getMark(studentId, subjectId, examId) {
      return cache.marks.find(m =>
        m.studentId === studentId && m.subjectId === subjectId && m.examId === examId);
    },
    deleteMark(studentId, subjectId, examId) {
      cache.marks = cache.marks.filter(m =>
        !(m.studentId === studentId && m.subjectId === subjectId && m.examId === examId));
      persist(api('DELETE',
        '/marks?studentId=' + encodeURIComponent(studentId) +
        '&subjectId=' + encodeURIComponent(subjectId) +
        '&examId=' + encodeURIComponent(examId)));
    },

    // ---------- derived helpers (pure, operate on the cache) ----------
    /**
     * Compute a report card for a student in an exam.
     * Returns { rows:[{subject, marks, max, grade}], total, max, percent, overallGrade, status }
     */
    computeReport(studentId, examId) {
      const subjects = cache.subjects;
      const marks = cache.marks;
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
      const students = cache.students;
      const subjects = cache.subjects;
      const perStudent = students.map(s => {
        const r = SRMS.computeReport(s.id, examId);
        return { student: s, percent: r.percent, status: r.status, total: r.total, max: r.max };
      });
      const passing = perStudent.filter(p => p.status === 'PASS').length;
      const failing = perStudent.filter(p => p.status === 'FAIL').length;
      const na = perStudent.length - passing - failing;
      const subjectAvg = subjects.map(sub => {
        const ms = cache.marks.filter(m => m.subjectId === sub.id && m.examId === examId);
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
})(window);
