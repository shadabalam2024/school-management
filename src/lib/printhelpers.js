// ============================================================
// PRINT HELPERS — Fix #5
// Uses live school settings for all print/PDF output
// ============================================================
import { Store } from "./store.js";

export function getSchoolHeader() {
    const s = Store.getSettings();
    return {
        name: s.school_name || "My School",
        address: s.school_address || "",
        phone: s.school_phone || "",
        email: s.school_email || "",
        year: s.academic_year || "",
        currency: s.currency || "₹",
    };
}

export function printFeeReceipt(f, student) {
    const sc = getSchoolHeader();
    const html = `<html><head><title>Receipt ${f.receipt_no}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1a1a2e}
    .box{max-width:440px;margin:0 auto;border:2px solid #1a1a2e;border-radius:8px;overflow:hidden}
    .hdr{background:#1a1a2e;color:#fff;padding:16px 20px;text-align:center}
    .hdr h2{margin:0;font-size:19px}.hdr p{margin:3px 0 0;font-size:11px;opacity:0.7}
    .badge{background:#f3f4f6;padding:8px 20px;text-align:center;font-size:12px;
           font-weight:700;letter-spacing:1px;border-bottom:1px solid #e5e7eb}
    .sec{padding:12px 20px}
    .row{display:flex;justify-content:space-between;padding:4px 0;
         border-bottom:1px solid #f9fafb;font-size:13px}
    .lbl{color:#6b7280}.val{font-weight:600}
    hr{border:none;border-top:1px solid #e5e7eb;margin:0}
    .total{display:flex;justify-content:space-between;padding:12px 20px;
           background:#f0fdf4;font-size:15px;font-weight:700}
    .deduct{display:flex;justify-content:space-between;padding:10px 20px;
            background:#fff5f5;font-size:13px}
    .footer{padding:12px 20px;text-align:center;font-size:10px;color:#9ca3af;
            border-top:1px solid #e5e7eb}
  </style></head><body>
  <div class="box">
    <div class="hdr">
      <h2>${sc.name}</h2>
      <p>${sc.address}${sc.phone ? " · " + sc.phone : ""}${sc.email ? " · " + sc.email : ""}</p>
    </div>
    <div class="badge">FEE RECEIPT</div>
    <div class="sec">
      <div class="row"><span class="lbl">Receipt No</span><span class="val">${f.receipt_no}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${f.payment_date || "—"}</span></div>
      <div class="row"><span class="lbl">Student Name</span><span class="val">${f.student_name}</span></div>
      <div class="row"><span class="lbl">Class</span><span class="val">${f.class}${student ? " " + (student.section || "") : ""}</span></div>
      <div class="row"><span class="lbl">Father's Name</span><span class="val">${student?.father_name || "—"}</span></div>
      <div class="row"><span class="lbl">Fee Month</span><span class="val">${f.month} ${f.year}</span></div>
    </div>
    <hr>
    <div class="sec">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Fee Breakdown</p>
      ${f.tuition_fee > 0 ? `<div class="row"><span class="lbl">Tuition Fee</span><span class="val">${sc.currency}${(f.tuition_fee || 0).toLocaleString("en-IN")}</span></div>` : ""}
      ${f.transport_fee > 0 ? `<div class="row"><span class="lbl">Transport Fee</span><span class="val">${sc.currency}${(f.transport_fee || 0).toLocaleString("en-IN")}</span></div>` : ""}
      ${f.library_fee > 0 ? `<div class="row"><span class="lbl">Library Fee</span><span class="val">${sc.currency}${(f.library_fee || 0).toLocaleString("en-IN")}</span></div>` : ""}
      ${f.sports_fee > 0 ? `<div class="row"><span class="lbl">Sports Fee</span><span class="val">${sc.currency}${(f.sports_fee || 0).toLocaleString("en-IN")}</span></div>` : ""}
      ${f.other_fee > 0 ? `<div class="row"><span class="lbl">Other Fee</span><span class="val">${sc.currency}${(f.other_fee || 0).toLocaleString("en-IN")}</span></div>` : ""}
    </div>
    <div class="deduct">
      <span>Total Amount</span><span style="font-weight:700">${sc.currency}${(f.total_amount || 0).toLocaleString("en-IN")}</span>
    </div>
    <div class="total">
      <span>Paid Amount</span>
      <span style="color:#059669">${sc.currency}${(f.paid_amount || 0).toLocaleString("en-IN")}</span>
    </div>
    <div class="sec">
      <div class="row"><span class="lbl">Payment Mode</span><span class="val">${f.payment_mode || "—"}</span></div>
      <div class="row"><span class="lbl">Status</span>
        <span class="val" style="color:${f.status === "Paid" ? "#059669" : f.status === "Partial" ? "#d97706" : "#dc2626"}">${f.status}</span>
      </div>
    </div>
    <div class="footer">Thank you · Computer generated receipt · ${sc.name} · ${sc.year}</div>
  </div>
  </body></html>`;
    const w = window.open("", "_blank", "width=500,height=680");
    w.document.write(html); w.document.close(); w.print();
}

export function printSalarySlip(sal, staff) {
    const sc = getSchoolHeader();
    const html = `<html><head><title>Salary Slip</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#1a1a2e}
    .box{max-width:520px;margin:0 auto;border:2px solid #1a1a2e;border-radius:8px;overflow:hidden}
    .hdr{background:#1a1a2e;color:#fff;padding:16px 20px;text-align:center}
    .hdr h2{margin:0;font-size:19px}.hdr p{margin:3px 0 0;font-size:11px;opacity:0.7}
    .badge{background:#f3f4f6;padding:8px 20px;text-align:center;font-size:12px;
           font-weight:700;letter-spacing:1px;border-bottom:1px solid #e5e7eb}
    .sec{padding:12px 20px}
    .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f9fafb;font-size:13px}
    .lbl{color:#6b7280}.val{font-weight:600}
    hr{border:none;border-top:1px solid #e5e7eb;margin:0}
    .earn{display:flex;justify-content:space-between;padding:10px 20px;background:#f0fdf4;font-size:13px}
    .deduct{display:flex;justify-content:space-between;padding:10px 20px;background:#fff5f5;font-size:13px}
    .total{display:flex;justify-content:space-between;padding:14px 20px;background:#1a1a2e;color:#fff;font-size:15px;font-weight:700}
    .signs{display:flex;justify-content:space-between;padding:20px}
    .sign{text-align:center;font-size:12px;color:#6b7280}
    .sign-line{border-top:1px solid #1a1a2e;width:120px;margin:0 auto 4px}
    .footer{padding:10px 20px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb}
  </style></head><body>
  <div class="box">
    <div class="hdr"><h2>${sc.name}</h2>
      <p>${sc.address}${sc.phone ? " · " + sc.phone : ""}</p>
    </div>
    <div class="badge">SALARY SLIP — ${(sal.month || "").toUpperCase()} ${sal.year}</div>
    <div class="sec">
      <div class="row"><span class="lbl">Employee Name</span><span class="val">${sal.staff_name}</span></div>
      <div class="row"><span class="lbl">Staff ID</span><span class="val">${sal.staff_id}</span></div>
      <div class="row"><span class="lbl">Designation</span><span class="val">${staff?.designation || "—"}</span></div>
      <div class="row"><span class="lbl">Department</span><span class="val">${staff?.department || "—"}</span></div>
      <div class="row"><span class="lbl">Payment Mode</span><span class="val">${sal.payment_mode || "—"}</span></div>
      <div class="row"><span class="lbl">Payment Date</span><span class="val">${sal.payment_date || "—"}</span></div>
    </div>
    <hr>
    <div class="earn"><span>Basic Salary</span><span style="color:#059669;font-weight:700">${sc.currency}${(sal.basic_salary || 0).toLocaleString("en-IN")}</span></div>
    <div class="earn"><span>Allowances</span><span style="color:#059669;font-weight:700">${sc.currency}${(sal.allowances || 0).toLocaleString("en-IN")}</span></div>
    <div class="deduct"><span>Deductions</span><span style="color:#dc2626;font-weight:700">− ${sc.currency}${(sal.deductions || 0).toLocaleString("en-IN")}</span></div>
    <div class="total"><span>NET SALARY</span><span style="color:#34d399">${sc.currency}${(sal.net_salary || 0).toLocaleString("en-IN")}</span></div>
    <div class="signs">
      <div class="sign"><div class="sign-line"></div>Employee Signature</div>
      <div class="sign"><div class="sign-line"></div>Authorised Signatory</div>
    </div>
    <div class="footer">Computer generated · ${sc.name} · Academic Year ${sc.year}</div>
  </div>
  </body></html>`;
    const w = window.open("", "_blank", "width=580,height=720");
    w.document.write(html); w.document.close(); w.print();
}