// PtoDocument.jsx — client-side PDF generation for MX / CN time-off requests.
// Requires jsPDF 2.x loaded via CDN (window.jspdf.jsPDF).
// Uses MONTH_NAMES and iso() globals from data.jsx.

// Map app type IDs to the exact checkbox labels that appear in the template.
// Types with no direct match in the template fall back to "Other".
function _ptaTypeToBox(appType) {
  const m = {
    Appointments: "Appointments",
    Vacation:     "Vacation",
    Bereavement:  "Bereavement",
    WithoutPay:   "Time Off Without Pay",
    Military:     "Military",
    Maternity:    "Maternity/Paternity",
    Other:        "Other",
    PTO:          "Other",
    Sick:         "Other",
    Study:        "Other",
    Wedding:      "Other",
  };
  return m[appType] || "Other";
}

// Find the team lead for a given team code ("MX" or "CN").
// Primary: employee with matching team field and "Team Lead" in role.
// Fallback: role keyword search.
function _ptaFindManager(employees, empTeam) {
  const upper = (empTeam || "").toUpperCase();
  const byTeam = employees.find(e =>
    (e.team || "").toUpperCase() === upper &&
    /team\s*lead/i.test(e.roleRaw || e.role || "")
  );
  if (byTeam) return byTeam;
  if (upper === "MX") {
    return (
      employees.find(e => /mx.*team\s*lead/i.test(e.roleRaw || "")) ||
      employees.find(e => /team\s*lead.*mx/i.test(e.roleRaw || "")) ||
      employees.find(e => /pro.?support\s+mx/i.test(e.roleRaw || ""))
    );
  }
  if (upper === "CN") {
    return employees.find(e =>
      /team\s*lead/i.test(e.roleRaw || "") && !/mx/i.test(e.roleRaw || "")
    );
  }
  return null;
}

function _ptaFmt(d) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

async function generatePtoPdf({ event, employee, employees }) {
  if (!window.jspdf) {
    alert("PDF library is still loading — please try again in a moment.");
    return;
  }
  const { jsPDF } = window.jspdf;

  const empTeam    = (employee.team || "").toUpperCase();
  const manager    = _ptaFindManager(employees, empTeam);
  const mgrName    = manager ? (manager.fullName || manager.name || "") : "";
  const checkedBox = _ptaTypeToBox(event.type);
  const fmtFrom    = _ptaFmt(event.start);
  const fmtTo      = _ptaFmt(event.end);
  const days       = Math.round((event.end - event.start) / 86400000) + 1;
  const empName    = employee.fullName || employee.name || "";

  // Load logo PNG as a data-URL (best-effort; skipped if unavailable)
  let logoUrl = null;
  try {
    const res = await fetch("assets/teamwork_logo.png");
    if (res.ok) {
      const blob = await res.blob();
      logoUrl = await new Promise(ok => {
        const rd = new FileReader();
        rd.onloadend = () => ok(rd.result);
        rd.readAsDataURL(blob);
      });
    }
  } catch (_) { /* logo unavailable — skip */ }

  // ── Build PDF ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const PW  = doc.internal.pageSize.getWidth();   // 215.9 mm
  const ML  = 20, MR = PW - 20, CW = MR - ML;    // left/right margins, content width
  let y = 15;

  // Helpers
  const bold  = (sz = 10) => { doc.setFont("helvetica", "bold");   doc.setFontSize(sz); doc.setTextColor(30, 30, 30); };
  const norm  = (sz = 10) => { doc.setFont("helvetica", "normal"); doc.setFontSize(sz); doc.setTextColor(40, 40, 40); };
  const lbl   = (sz = 10) => { doc.setFont("helvetica", "normal"); doc.setFontSize(sz); doc.setTextColor(80, 80, 80); };
  const rule  = (yy, x1 = ML, x2 = MR) => {
    doc.setDrawColor(89, 89, 89);
    doc.setLineWidth(0.25);
    doc.line(x1, yy, x2, yy);
  };
  const drawCheckbox = (x, yy, checked) => {
    const S = 3.2;
    doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.35);
    doc.rect(x, yy - S, S, S);
    if (checked) {
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.55);
      // Draw a small checkmark inside the box
      doc.line(x + 0.4,    yy - S / 2,   x + S * 0.38, yy - 0.4);
      doc.line(x + S * 0.38, yy - 0.4,   x + S - 0.3,  yy - S + 0.35);
    }
  };

  // ── Logo ─────────────────────────────────────────────────────────────────
  if (logoUrl) {
    try { doc.addImage(logoUrl, "PNG", ML, y, 52, 10.3); } catch (_) {}
  }
  y += 20;

  // ── Title ─────────────────────────────────────────────────────────────────
  bold(17);
  doc.text("Absence Request", ML, y);
  y += 10;

  // ── Absence Information ───────────────────────────────────────────────────
  bold(12);
  doc.text("Absence Information", ML, y);
  y += 2.5;
  rule(y);
  y += 7;

  const LW  = 40;   // label column width
  const ROW = 7.5;  // row height

  const infoRow = (labelText, value) => {
    lbl();  doc.text(labelText, ML, y);
    rule(y + 0.8, ML + LW, MR);
    norm(); doc.text(value, ML + LW + 1, y);
    y += ROW;
  };

  infoRow("Employee Name:", empName);
  infoRow("Department:",    "Support");
  infoRow("Manager:",       mgrName);
  y += 4;

  // ── Type of Absence ───────────────────────────────────────────────────────
  bold(10);
  doc.text("Type of Absence Requested:", ML, y);
  y += 7;

  const TYPE_ROWS = [
    ["Appointments",  "Vacation",   "Bereavement",        "Time Off Without Pay"],
    ["Military",      "Jury Duty",  "Maternity/Paternity", "Other"],
  ];
  const COL = CW / 4;

  TYPE_ROWS.forEach(row => {
    norm(9);
    row.forEach((typeLabel, ci) => {
      const cx = ML + ci * COL;
      drawCheckbox(cx, y, checkedBox === typeLabel);
      doc.text(typeLabel, cx + 4.8, y);
    });
    y += 7;
  });
  y += 5;

  // ── Dates of Absence ──────────────────────────────────────────────────────
  lbl(10);
  doc.text("Dates of Absence:", ML, y);
  doc.text("From:", ML + 42, y);
  rule(y + 0.8, ML + 52, ML + 105);
  norm(10);
  doc.text(fmtFrom, ML + 53, y);
  lbl(10);
  doc.text("To:", ML + 109, y);
  rule(y + 0.8, ML + 115, MR);
  norm(10);
  doc.text(fmtTo, ML + 116, y);
  y += 9;

  // ── Number of days ────────────────────────────────────────────────────────
  norm(10);
  doc.text(`Number of days taken:  ${days}`, ML, y);
  y += 10;

  // ── Reason for Absence ────────────────────────────────────────────────────
  bold(10);
  doc.text("Reason for Absence:", ML, y);
  y += 6;

  norm(10);
  const noteText = (event.note || "").trim();
  if (noteText) {
    const lines = doc.splitTextToSize(noteText, CW);
    doc.text(lines, ML, y);
    y += lines.length * 5.5 + 2;
    rule(y);
    y += 5;
  } else {
    // Draw three blank lines
    for (let i = 0; i < 3; i++) rule(y + i * 7.5);
    y += 3 * 7.5 + 3;
  }

  // Italic disclaimer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "You must submit requests for absences, other than sick leave, two days prior to the first day you will be absent.",
    ML, y, { maxWidth: CW }
  );
  y += 12;

  // ── Employee Signature ────────────────────────────────────────────────────
  rule(y, ML, ML + 110);
  rule(y, ML + 115, MR);
  y += 4;
  bold(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Employee Signature", ML + 1, y);
  doc.text("Date", ML + 116, y);
  y += 13;

  // ── Manager Approval ──────────────────────────────────────────────────────
  bold(12);
  doc.setTextColor(30, 30, 30);
  doc.text("Manager Approval", ML, y);
  y += 2.5;
  rule(y);
  y += 7;

  norm(10);
  drawCheckbox(ML, y, false);
  doc.text("Approved", ML + 5, y);
  y += 7;
  drawCheckbox(ML, y, false);
  doc.text("Rejected", ML + 5, y);
  y += 10;

  // ── Comments ──────────────────────────────────────────────────────────────
  bold(10);
  doc.text("Comments:", ML, y);
  y += 5;
  for (let i = 0; i < 3; i++) rule(y + i * 7.5);
  y += 3 * 7.5 + 10;

  // ── Manager Signature ─────────────────────────────────────────────────────
  rule(y, ML, ML + 115);
  rule(y, ML + 120, MR);
  y += 4;
  bold(9);
  doc.setTextColor(60, 60, 60);
  doc.text("Manager Signature", ML + 1, y);
  doc.text("Date", ML + 121, y);

  // ── Save ──────────────────────────────────────────────────────────────────
  const slug = empName.replace(/\s+/g, "_");
  doc.save(`PTO_Request_${slug}_${iso(event.start)}.pdf`);
}

Object.assign(window, { generatePtoPdf });
