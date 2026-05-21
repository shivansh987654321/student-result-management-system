/* student.js — student-facing dashboard */
(function () {
  const session = SRMS.getSession();
  if (!session || session.role !== 'student') {
    window.location.replace('index.html');
    return;
  }
  // elements
  const examSelect = document.getElementById('examSelect');
  const welcomeLine = document.getElementById('welcomeLine');
  const studentTitle = document.getElementById('studentTitle');
  const studentSub = document.getElementById('studentSub');
  const sTotal = document.getElementById('s-total');
  const sPercent = document.getElementById('s-percent');
  const sGrade = document.getElementById('s-grade');
  const sStatus = document.getElementById('s-status');
  const reportPreview = document.getElementById('reportPreview');
  const logoutBtn = document.getElementById('logoutBtn');
  const downloadBtn = document.getElementById('downloadPdfBtn');
  const toastEl = document.getElementById('toast');

  let chartInstance = null;
  let student = null; // populated after SRMS.init() loads the cache

  function toast(msg, kind = 'ok') {
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + kind;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  examSelect.addEventListener('change', render);
  logoutBtn.addEventListener('click', () => {
    SRMS.clearSession();
    window.location.assign('index.html');
  });
  downloadBtn.addEventListener('click', () => {
    if (!examSelect.value) { toast('Pick an exam first', 'err'); return; }
    downloadPdf(student.id, examSelect.value);
  });

  function render() {
    const examId = examSelect.value;
    if (!examId) {
      reportPreview.innerHTML = `<p class="empty">No exams have been configured yet.</p>`;
      sTotal.textContent = sPercent.textContent = sGrade.textContent = sStatus.textContent = '—';
      return;
    }
    const rep = SRMS.computeReport(student.id, examId);
    const exm = SRMS.getExam(examId);
    if (!exm) {
      reportPreview.innerHTML = `<p class="empty">Exam data not found.</p>`;
      return;
    }

    sTotal.textContent = `${rep.total} / ${rep.max}`;
    sPercent.textContent = rep.max ? rep.percent.toFixed(2) + '%' : '—';
    sGrade.textContent = rep.overallGrade;
    sStatus.textContent = rep.status;
    sStatus.className = 'stat-value ' +
      (rep.status === 'PASS' ? 'good' : rep.status === 'FAIL' ? 'bad' : '');

    reportPreview.innerHTML = buildReportHtml(student, exm, rep);
    renderChart(rep);
  }

  function buildReportHtml(stu, exm, rep) {
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

  function renderChart(rep) {
    const ctx = document.getElementById('studentChart');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rep.rows.map(r => r.code),
        datasets: [
          {
            label: 'My marks',
            data: rep.rows.map(r => r.marks),
            backgroundColor: '#4f46e5',
            borderRadius: 6
          },
          {
            label: 'Max',
            data: rep.rows.map(r => r.max),
            backgroundColor: '#e2e8f0',
            borderRadius: 6
          }
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
        responsive: true, maintainAspectRatio: false
      }
    });
  }

  function downloadPdf(studentId, examId) {
    const { jsPDF } = window.jspdf;
    const stu = SRMS.getStudent(studentId);
    const exm = SRMS.getExam(examId);
    const rep = SRMS.computeReport(studentId, examId);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Greenwood High School', 40, 35);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(`Report Card — ${exm.name} (${exm.year})`, 40, 55);

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(11);
    const startY = 100;
    doc.setFont('helvetica', 'bold'); doc.text('Roll No:', 40, startY);
    doc.setFont('helvetica', 'normal'); doc.text(String(stu.rollNo), 100, startY);
    doc.setFont('helvetica', 'bold'); doc.text('Name:', 40, startY + 18);
    doc.setFont('helvetica', 'normal'); doc.text(String(stu.name), 100, startY + 18);
    doc.setFont('helvetica', 'bold'); doc.text('Class:', 40, startY + 36);
    doc.setFont('helvetica', 'normal'); doc.text(`${stu.class}-${stu.section}`, 100, startY + 36);

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
      theme: 'grid', styles: { fontSize: 11 }
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

  window.addEventListener('srms:error', (e) => toast(e.detail, 'err'));

  // load data from the server, then populate the page
  SRMS.init().then(() => {
    student = SRMS.getStudent(session.identifier);
    if (!student) {
      SRMS.clearSession();
      window.location.replace('index.html');
      return;
    }

    welcomeLine.textContent = `Welcome, ${student.name} (${student.rollNo})`;
    studentTitle.textContent = `${student.name}'s Report`;
    studentSub.textContent = `Class ${student.class}-${student.section} · Roll No ${student.rollNo}`;

    const exams = SRMS.listExams();
    examSelect.innerHTML = exams.map(e =>
      `<option value="${e.id}">${escapeHtml(e.name)} (${e.year})</option>`
    ).join('');

    render();
  }).catch((err) => {
    reportPreview.innerHTML =
      `<p class="empty">Failed to load data: ${escapeHtml(err.message || err)}</p>`;
  });
})();
