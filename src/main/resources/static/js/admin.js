/* admin.js — admin dashboard logic */
(function () {
  // ---------- guard ----------
  const session = SRMS.getSession();
  if (!session || session.role !== 'admin') {
    window.location.replace('index.html');
    return;
  }

  // ---------- elements ----------
  const navItems = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const logoutBtn = document.getElementById('logoutBtn');
  const resetBtn = document.getElementById('resetDataBtn');
  const toastEl = document.getElementById('toast');

  // dashboard
  const dashExamSelect = document.getElementById('dashExamSelect');
  const statStudents = document.getElementById('stat-students');
  const statSubjects = document.getElementById('stat-subjects');
  const statAvg = document.getElementById('stat-avg');
  const statPass = document.getElementById('stat-pass');

  // students
  const studentsTbody = document.querySelector('#studentsTable tbody');
  const studentSearch = document.getElementById('studentSearch');
  const addStudentBtn = document.getElementById('addStudentBtn');

  // subjects
  const subjectsTbody = document.querySelector('#subjectsTable tbody');
  const addSubjectBtn = document.getElementById('addSubjectBtn');

  // exams
  const examsTbody = document.querySelector('#examsTable tbody');
  const addExamBtn = document.getElementById('addExamBtn');

  // marks
  const marksExamSelect = document.getElementById('marksExamSelect');
  const marksTable = document.getElementById('marksTable');
  const saveMarksBtn = document.getElementById('saveMarksBtn');

  // reports
  const reportStudentSelect = document.getElementById('reportStudentSelect');
  const reportExamSelect = document.getElementById('reportExamSelect');
  const reportPreview = document.getElementById('reportPreview');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

  // modal
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');

  let modalSubmitHandler = null;

  // chart instances (we destroy & re-create on re-render)
  const charts = { subject: null, passFail: null, top: null };

  // ============================================================
  // utility
  // ============================================================
  function toast(msg, kind = 'ok') {
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + kind;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.hidden = true; }, 2400);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function openModal({ title, bodyHtml, submitText = 'Save', onSubmit }) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalSubmitBtn.textContent = submitText;
    modalSubmitHandler = onSubmit;
    modal.hidden = false;
    // focus the first input
    const first = modalBody.querySelector('input, select, textarea');
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    modalSubmitHandler = null;
    modalBody.innerHTML = '';
  }
  modalCancelBtn.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modalSubmitBtn.addEventListener('click', () => {
    if (modalSubmitHandler) modalSubmitHandler();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
  modalBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && modalSubmitHandler) {
      e.preventDefault();
      modalSubmitHandler();
    }
  });

  // ============================================================
  // top bar
  // ============================================================
  logoutBtn.addEventListener('click', () => {
    SRMS.clearSession();
    window.location.assign('index.html');
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset all data to the demo defaults? This cannot be undone.')) return;
    try {
      await SRMS.resetAll();
      renderAll();
      toast('Demo data restored');
    } catch (err) {
      toast('Reset failed: ' + (err.message || err), 'err');
    }
  });

  // ============================================================
  // tab navigation
  // ============================================================
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      navItems.forEach(n => n.classList.toggle('active', n === item));
      panes.forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
      // re-render the tab that's now visible (cheap)
      renderTab(tab);
    });
  });

  // ============================================================
  // DASHBOARD
  // ============================================================
  function renderDashboard() {
    const exams = SRMS.listExams();
    fillSelect(dashExamSelect, exams.map(e => ({ value: e.id, label: `${e.name} (${e.year})` })));
    if (!exams.length) {
      statStudents.textContent = SRMS.listStudents().length;
      statSubjects.textContent = SRMS.listSubjects().length;
      statAvg.textContent = '—';
      statPass.textContent = '—';
      destroyCharts();
      return;
    }
    const examId = dashExamSelect.value || exams[0].id;
    dashExamSelect.value = examId;
    const stats = SRMS.classStats(examId);
    const students = SRMS.listStudents();
    const subjects = SRMS.listSubjects();

    statStudents.textContent = students.length;
    statSubjects.textContent = subjects.length;
    const recorded = stats.perStudent.filter(p => p.max > 0);
    const avg = recorded.length
      ? recorded.reduce((s, p) => s + p.percent, 0) / recorded.length
      : 0;
    statAvg.textContent = recorded.length ? avg.toFixed(1) + '%' : '—';
    const denom = stats.passing + stats.failing;
    statPass.textContent = denom ? Math.round((stats.passing / denom) * 100) + '%' : '—';

    renderSubjectAvgChart(stats.subjectAvg);
    renderPassFailChart(stats.passing, stats.failing, stats.na);
    renderTopChart(stats.topPerformers);
  }
  dashExamSelect.addEventListener('change', renderDashboard);

  function destroyCharts() {
    Object.keys(charts).forEach(k => {
      if (charts[k]) { charts[k].destroy(); charts[k] = null; }
    });
  }

  function renderSubjectAvgChart(rows) {
    const ctx = document.getElementById('subjectAvgChart');
    if (charts.subject) charts.subject.destroy();
    charts.subject = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.code),
        datasets: [{
          label: 'Average marks',
          data: rows.map(r => Number(r.avg.toFixed(2))),
          backgroundColor: '#4f46e5',
          borderRadius: 6
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, suggestedMax: 100 } },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  function renderPassFailChart(pass, fail, na) {
    const ctx = document.getElementById('passFailChart');
    if (charts.passFail) charts.passFail.destroy();
    charts.passFail = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pass', 'Fail', 'No Data'],
        datasets: [{
          data: [pass, fail, na],
          backgroundColor: ['#10b981', '#ef4444', '#cbd5e1']
        }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false }
    });
  }

  function renderTopChart(top) {
    const ctx = document.getElementById('topChart');
    if (charts.top) charts.top.destroy();
    charts.top = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(p => p.student.name),
        datasets: [{
          label: 'Percentage',
          data: top.map(p => Number(p.percent.toFixed(2))),
          backgroundColor: '#0ea5e9',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 100 } },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  // ============================================================
  // STUDENTS
  // ============================================================
  function renderStudents() {
    const term = (studentSearch.value || '').trim().toLowerCase();
    const list = SRMS.listStudents().filter(s =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      s.rollNo.toLowerCase().includes(term)
    );
    if (!list.length) {
      studentsTbody.innerHTML = `<tr><td colspan="7" class="empty">No students found.</td></tr>`;
      return;
    }
    studentsTbody.innerHTML = list.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.rollNo)}</strong></td>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.class)}</td>
        <td>${escapeHtml(s.section)}</td>
        <td>${escapeHtml(s.dob || '')}</td>
        <td>${escapeHtml(s.email || '')}</td>
        <td class="td-actions">
          <button class="link-btn" data-act="edit" data-id="${s.id}">Edit</button>
          <button class="link-btn danger" data-act="del" data-id="${s.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }
  studentSearch.addEventListener('input', renderStudents);

  studentsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') openStudentForm(SRMS.getStudent(id));
    if (btn.dataset.act === 'del') {
      const stu = SRMS.getStudent(id);
      if (!confirm(`Delete ${stu.name} (${stu.rollNo}) and all their marks?`)) return;
      SRMS.deleteStudent(id);
      renderAll();
      toast('Student deleted');
    }
  });

  addStudentBtn.addEventListener('click', () => openStudentForm(null));

  function openStudentForm(student) {
    const isEdit = !!student;
    const s = student || { rollNo: '', name: '', class: '10', section: 'A', dob: '', email: '', password: 'student123' };
    openModal({
      title: isEdit ? 'Edit Student' : 'Add Student',
      bodyHtml: `
        <div class="form-grid">
          <label>Roll No <input id="f-roll" value="${escapeHtml(s.rollNo)}" required /></label>
          <label>Full Name <input id="f-name" value="${escapeHtml(s.name)}" required /></label>
          <label>Class <input id="f-class" value="${escapeHtml(s.class)}" /></label>
          <label>Section <input id="f-section" value="${escapeHtml(s.section)}" /></label>
          <label>Date of Birth <input id="f-dob" type="date" value="${escapeHtml(s.dob)}" /></label>
          <label>Email <input id="f-email" type="email" value="${escapeHtml(s.email)}" /></label>
          <label class="span-2">Login password <input id="f-pw" value="${escapeHtml(s.password || 'student123')}" /></label>
        </div>
      `,
      submitText: isEdit ? 'Save changes' : 'Create student',
      onSubmit: () => {
        const payload = {
          rollNo: document.getElementById('f-roll').value.trim(),
          name: document.getElementById('f-name').value.trim(),
          class: document.getElementById('f-class').value.trim(),
          section: document.getElementById('f-section').value.trim(),
          dob: document.getElementById('f-dob').value,
          email: document.getElementById('f-email').value.trim(),
          password: document.getElementById('f-pw').value
        };
        if (!payload.rollNo || !payload.name) { toast('Roll No and Name are required', 'err'); return; }
        try {
          if (isEdit) SRMS.updateStudent(student.id, payload);
          else SRMS.addStudent(payload);
          closeModal();
          renderAll();
          toast(isEdit ? 'Student updated' : 'Student added');
        } catch (err) {
          toast(err.message, 'err');
        }
      }
    });
  }

  // ============================================================
  // SUBJECTS
  // ============================================================
  function renderSubjects() {
    const list = SRMS.listSubjects();
    if (!list.length) {
      subjectsTbody.innerHTML = `<tr><td colspan="4" class="empty">No subjects defined.</td></tr>`;
      return;
    }
    subjectsTbody.innerHTML = list.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.code)}</strong></td>
        <td>${escapeHtml(s.name)}</td>
        <td>${s.maxMarks}</td>
        <td class="td-actions">
          <button class="link-btn" data-act="edit" data-id="${s.id}">Edit</button>
          <button class="link-btn danger" data-act="del" data-id="${s.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  subjectsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') openSubjectForm(SRMS.getSubject(id));
    if (btn.dataset.act === 'del') {
      const sub = SRMS.getSubject(id);
      if (!confirm(`Delete subject "${sub.name}"? All marks for this subject will also be removed.`)) return;
      SRMS.deleteSubject(id);
      renderAll();
      toast('Subject deleted');
    }
  });

  addSubjectBtn.addEventListener('click', () => openSubjectForm(null));

  function openSubjectForm(subject) {
    const isEdit = !!subject;
    const s = subject || { code: '', name: '', maxMarks: 100 };
    openModal({
      title: isEdit ? 'Edit Subject' : 'Add Subject',
      bodyHtml: `
        <div class="form-grid">
          <label>Code <input id="f-code" value="${escapeHtml(s.code)}" required /></label>
          <label>Max Marks <input id="f-max" type="number" min="1" value="${s.maxMarks}" /></label>
          <label class="span-2">Subject Name <input id="f-sname" value="${escapeHtml(s.name)}" required /></label>
        </div>
      `,
      submitText: isEdit ? 'Save changes' : 'Create subject',
      onSubmit: () => {
        const payload = {
          code: document.getElementById('f-code').value.trim().toUpperCase(),
          name: document.getElementById('f-sname').value.trim(),
          maxMarks: Math.max(1, parseInt(document.getElementById('f-max').value, 10) || 100)
        };
        if (!payload.code || !payload.name) { toast('Code and Name are required', 'err'); return; }
        try {
          if (isEdit) SRMS.updateSubject(subject.id, payload);
          else SRMS.addSubject(payload);
          closeModal();
          renderAll();
          toast(isEdit ? 'Subject updated' : 'Subject added');
        } catch (err) { toast(err.message, 'err'); }
      }
    });
  }

  // ============================================================
  // EXAMS
  // ============================================================
  function renderExams() {
    const list = SRMS.listExams();
    if (!list.length) {
      examsTbody.innerHTML = `<tr><td colspan="3" class="empty">No exams configured.</td></tr>`;
      return;
    }
    examsTbody.innerHTML = list.map(e => `
      <tr>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.year}</td>
        <td class="td-actions">
          <button class="link-btn danger" data-act="del" data-id="${e.id}">Delete</button>
        </td>
      </tr>
    `).join('');
  }
  examsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.act === 'del') {
      const exm = SRMS.getExam(btn.dataset.id);
      if (!confirm(`Delete exam "${exm.name}"? All associated marks will be removed.`)) return;
      SRMS.deleteExam(btn.dataset.id);
      renderAll();
      toast('Exam deleted');
    }
  });
  addExamBtn.addEventListener('click', () => {
    openModal({
      title: 'Add Exam',
      bodyHtml: `
        <div class="form-grid">
          <label class="span-2">Name <input id="f-ename" placeholder="e.g. Mid-Term" required /></label>
          <label>Year <input id="f-eyear" type="number" value="${new Date().getFullYear()}" /></label>
        </div>
      `,
      submitText: 'Create exam',
      onSubmit: () => {
        const name = document.getElementById('f-ename').value.trim();
        const year = parseInt(document.getElementById('f-eyear').value, 10) || new Date().getFullYear();
        if (!name) { toast('Exam name required', 'err'); return; }
        SRMS.addExam({ name, year });
        closeModal();
        renderAll();
        toast('Exam added');
      }
    });
  });

  // ============================================================
  // MARKS ENTRY
  // ============================================================
  function renderMarksEntry() {
    const exams = SRMS.listExams();
    const students = SRMS.listStudents();
    const subjects = SRMS.listSubjects();
    fillSelect(marksExamSelect, exams.map(e => ({ value: e.id, label: `${e.name} (${e.year})` })));

    if (!exams.length || !students.length || !subjects.length) {
      marksTable.querySelector('thead').innerHTML = '';
      marksTable.querySelector('tbody').innerHTML =
        `<tr><td class="empty">Please add at least one student, subject and exam.</td></tr>`;
      return;
    }
    const examId = marksExamSelect.value || exams[0].id;
    marksExamSelect.value = examId;

    const thead = marksTable.querySelector('thead');
    const tbody = marksTable.querySelector('tbody');

    thead.innerHTML = `
      <tr>
        <th class="sticky-col">Roll No</th>
        <th class="sticky-col">Name</th>
        ${subjects.map(s => `<th title="${escapeHtml(s.name)}">${escapeHtml(s.code)}<div class="th-sub">/${s.maxMarks}</div></th>`).join('')}
      </tr>
    `;

    tbody.innerHTML = students.map(stu => `
      <tr>
        <td class="sticky-col"><strong>${escapeHtml(stu.rollNo)}</strong></td>
        <td class="sticky-col">${escapeHtml(stu.name)}</td>
        ${subjects.map(sub => {
          const m = SRMS.getMark(stu.id, sub.id, examId);
          return `<td>
            <input type="number" class="mark-input" min="0" max="${sub.maxMarks}"
              data-student="${stu.id}" data-subject="${sub.id}"
              value="${m ? m.marks : ''}" />
          </td>`;
        }).join('')}
      </tr>
    `).join('');
  }
  marksExamSelect.addEventListener('change', renderMarksEntry);

  saveMarksBtn.addEventListener('click', () => {
    const examId = marksExamSelect.value;
    if (!examId) { toast('Select an exam first', 'err'); return; }
    const inputs = marksTable.querySelectorAll('input.mark-input');
    let ok = 0, bad = 0;
    inputs.forEach(inp => {
      const v = inp.value.trim();
      inp.classList.remove('invalid');
      if (v === '') {
        SRMS.deleteMark(inp.dataset.student, inp.dataset.subject, examId);
        return;
      }
      const num = parseFloat(v);
      const max = parseFloat(inp.max);
      if (Number.isNaN(num) || num < 0 || num > max) { bad++; inp.classList.add('invalid'); return; }
      SRMS.upsertMark({
        studentId: inp.dataset.student,
        subjectId: inp.dataset.subject,
        examId,
        marks: num
      });
      ok++;
    });
    if (bad) toast(`Saved ${ok}, ${bad} invalid entr${bad === 1 ? 'y' : 'ies'}`, 'err');
    else toast(`Saved ${ok} mark entr${ok === 1 ? 'y' : 'ies'}`);
  });

  // ============================================================
  // REPORTS
  // ============================================================
  function renderReports() {
    const students = SRMS.listStudents();
    const exams = SRMS.listExams();
    fillSelect(reportStudentSelect, students.map(s => ({ value: s.id, label: `${s.rollNo} — ${s.name}` })));
    fillSelect(reportExamSelect, exams.map(e => ({ value: e.id, label: `${e.name} (${e.year})` })));
    drawReportPreview();
  }
  reportStudentSelect.addEventListener('change', drawReportPreview);
  reportExamSelect.addEventListener('change', drawReportPreview);
  downloadPdfBtn.addEventListener('click', downloadReportPdf);

  function drawReportPreview() {
    const stuId = reportStudentSelect.value;
    const exmId = reportExamSelect.value;
    if (!stuId || !exmId) {
      reportPreview.innerHTML = `<p class="empty">Select a student and exam to preview the report card.</p>`;
      return;
    }
    reportPreview.innerHTML = buildReportHtml(stuId, exmId);
  }

  function buildReportHtml(studentId, examId) {
    const stu = SRMS.getStudent(studentId);
    const exm = SRMS.getExam(examId);
    const rep = SRMS.computeReport(studentId, examId);
    if (!stu || !exm) return `<p class="empty">Missing student or exam.</p>`;

    return `
      <div class="rc-head">
        <div>
          <h2 class="rc-school">Greenwood High School</h2>
          <p class="rc-sub">Report Card · ${escapeHtml(exm.name)} (${exm.year})</p>
        </div>
        <div class="rc-meta">
          <div><strong>Roll No:</strong> ${escapeHtml(stu.rollNo)}</div>
          <div><strong>Name:</strong> ${escapeHtml(stu.name)}</div>
          <div><strong>Class:</strong> ${escapeHtml(stu.class)}-${escapeHtml(stu.section)}</div>
        </div>
      </div>

      <table class="data-table rc-table">
        <thead>
          <tr><th>Subject</th><th>Marks</th><th>Max</th><th>%</th><th>Grade</th></tr>
        </thead>
        <tbody>
          ${rep.rows.map(r => `
            <tr>
              <td>${escapeHtml(r.subject)}</td>
              <td>${r.marks == null ? '—' : r.marks}</td>
              <td>${r.max}</td>
              <td>${r.marks == null ? '—' : ((r.marks / r.max) * 100).toFixed(1) + '%'}</td>
              <td><span class="grade-pill grade-${r.grade.replace('+','plus')}">${r.grade}</span></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${rep.total}</strong></td>
            <td><strong>${rep.max}</strong></td>
            <td><strong>${rep.percent.toFixed(2)}%</strong></td>
            <td><strong>${rep.overallGrade}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div class="rc-footer">
        <div class="rc-status ${rep.status === 'N/A' ? 'na' : rep.status.toLowerCase()}">Result: ${rep.status}</div>
        <div class="rc-sign">________________<br/><span>Class Teacher</span></div>
      </div>
    `;
  }

  function downloadReportPdf() {
    const stuId = reportStudentSelect.value;
    const exmId = reportExamSelect.value;
    if (!stuId || !exmId) { toast('Select a student and exam first', 'err'); return; }
    generatePdf(stuId, exmId);
  }

  // exposed so student page can reuse
  function generatePdf(studentId, examId) {
    const { jsPDF } = window.jspdf;
    const stu = SRMS.getStudent(studentId);
    const exm = SRMS.getExam(examId);
    const rep = SRMS.computeReport(studentId, examId);
    if (!stu || !exm) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Greenwood High School', 40, 35);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(`Report Card — ${exm.name} (${exm.year})`, 40, 55);

    // student info
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(11);
    const startY = 100;
    doc.setFont('helvetica', 'bold'); doc.text('Roll No:', 40, startY);
    doc.setFont('helvetica', 'normal'); doc.text(String(stu.rollNo), 100, startY);
    doc.setFont('helvetica', 'bold'); doc.text('Name:', 40, startY + 18);
    doc.setFont('helvetica', 'normal'); doc.text(String(stu.name), 100, startY + 18);
    doc.setFont('helvetica', 'bold'); doc.text('Class:', 40, startY + 36);
    doc.setFont('helvetica', 'normal'); doc.text(`${stu.class}-${stu.section}`, 100, startY + 36);

    if (stu.dob) {
      doc.setFont('helvetica', 'bold'); doc.text('DOB:', 320, startY);
      doc.setFont('helvetica', 'normal'); doc.text(String(stu.dob), 360, startY);
    }
    if (stu.email) {
      doc.setFont('helvetica', 'bold'); doc.text('Email:', 320, startY + 18);
      doc.setFont('helvetica', 'normal'); doc.text(String(stu.email), 360, startY + 18);
    }

    // table
    doc.autoTable({
      startY: startY + 70,
      head: [['Subject', 'Marks', 'Max', 'Percentage', 'Grade']],
      body: rep.rows.map(r => [
        r.subject,
        r.marks == null ? '—' : r.marks,
        r.max,
        r.marks == null ? '—' : ((r.marks / r.max) * 100).toFixed(1) + '%',
        r.grade
      ]),
      foot: [[
        'Total', String(rep.total), String(rep.max),
        rep.percent.toFixed(2) + '%', rep.overallGrade
      ]],
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
      theme: 'grid',
      styles: { fontSize: 11 }
    });

    const afterY = doc.lastAutoTable.finalY + 30;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    if (rep.status === 'PASS') doc.setTextColor(16, 185, 129);
    else if (rep.status === 'FAIL') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(100, 116, 139);
    doc.text('Result: ' + rep.status, 40, afterY);

    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('_________________________', pageW - 180, afterY + 30);
    doc.text('Class Teacher', pageW - 140, afterY + 45);

    doc.save(`ReportCard_${stu.rollNo}_${exm.name.replace(/\s+/g, '')}.pdf`);
  }

  // ============================================================
  // helpers
  // ============================================================
  function fillSelect(sel, options) {
    const prev = sel.value;
    sel.innerHTML = options.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('');
    if (options.some(o => o.value === prev)) sel.value = prev;
  }

  function renderTab(tab) {
    switch (tab) {
      case 'dashboard': renderDashboard(); break;
      case 'students': renderStudents(); break;
      case 'subjects': renderSubjects(); break;
      case 'exams': renderExams(); break;
      case 'marks': renderMarksEntry(); break;
      case 'reports': renderReports(); break;
    }
  }
  function renderAll() {
    renderDashboard();
    renderStudents();
    renderSubjects();
    renderExams();
    renderMarksEntry();
    renderReports();
  }

  // surface background write failures (cache updated, server save failed)
  window.addEventListener('srms:error', (e) => toast(e.detail, 'err'));

  // first paint — load data from the server, then render
  SRMS.init()
    .then(() => renderAll())
    .catch((err) => toast('Failed to load data: ' + (err.message || err), 'err'));

  // expose for debugging
  window.__SRMS_ADMIN = { renderAll, generatePdf };
})();
