// src/pages/admin/AdminCertificates.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function AdminCertificates() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    internName: "",
    role: "",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  const previewRef = useRef(null); // hidden DOM node to render the certificate for capture
  const token = localStorage.getItem("token");

  async function fetchApplications() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/jobs/applications/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApps(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  function openGenerator(app) {
    setSelected(app);
    setForm({
      internName: app.name,
      role: app.job_title || "QA Tester Intern", // fallback if job_title available
      startDate: "",
      endDate: "",
      issueDate: new Date().toISOString().slice(0, 10),
    });
  }

  async function updateStatus(id, status) {
    try {
      await fetch(`${API_BASE}/api/jobs/applications/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      await fetchApplications();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  // helper: convert dataURL -> File
  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // Core: generate QR, render preview node to PDF, upload
  async function handleGenerateCertificate() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    try {
      // 1) Create certificate id (simple deterministic example)
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      // 2) generate QR dataURL that points to verification endpoint
      const verifyUrl = `${window.location.origin.replace(
        window.location.pathname,
        ""
      )}/verify/${certId}`; // frontend verify page OR use public API host if needed
      // NOTE: better to use your site domain: https://dripzoid.com/verify/...
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);

      // 3) render the certificate preview HTML into the offscreen node
      // We will create HTML in the hidden DOM (previewRef) using the same template,
      // then capture it with html2canvas and create a PDF.

      // ensure previewRef is populated by rendering (we render it below)
      // wait a tick so DOM updates
      await new Promise((r) => setTimeout(r, 150));

      const node = previewRef.current;
      if (!node) throw new Error("Preview node not ready");

      // temporarily inject dynamic text into node (we already render using form values)
      // 4) render canvas
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      // 5) convert canvas to PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      // draw image to fill page
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${certId}.pdf`, { type: "application/pdf" });

      // 6) Convert QR dataURL to File
      const qrFile = dataURLtoFile(qrDataUrl, `${certId}-qr.png`);

      // 7) Upload to backend: POST /api/certificates (multipart/form-data)
      const body = new FormData();
      body.append("application_id", selected.id);
      body.append("certificate_id", certId);
      body.append("intern_name", form.internName);
      body.append("role", form.role);
      body.append("start_date", form.startDate || "");
      body.append("end_date", form.endDate || "");
      body.append("issue_date", form.issueDate || "");
      body.append("certificate", pdfFile);
      body.append("qr", qrFile);

      const res = await fetch(`${API_BASE}/api/certificates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Upload failed:", data);
        return alert(data.message || "Failed to create certificate");
      }

      // 8) Optionally update application status to Approved
      await updateStatus(selected.id, "Approved");

      alert("Certificate generated & saved successfully!");
      setSelected(null);
      fetchApplications();
    } catch (err) {
      console.error("Certificate generation error:", err);
      alert("Certificate generation failed: " + err.message);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Certificate Dashboard</h1>

      {/* Applications Table */}
      <div className="overflow-x-auto border rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-900">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th>Email</th>
              <th>Job</th>
              <th>Status</th>
              <th>Resume</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-4 font-medium">{app.name}</td>
                <td>{app.email}</td>
                <td>{app.job_id}</td>
                <td>{app.status}</td>
                <td>
                  {app.resume_url && (
                    <a
                      href={`${API_BASE}${app.resume_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 underline"
                    >
                      View
                    </a>
                  )}
                </td>
                <td className="space-x-2">
                  <button
                    onClick={() => openGenerator(app)}
                    className="px-3 py-1 rounded bg-black text-white text-xs"
                  >
                    Generate
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "Rejected")}
                    className="px-3 py-1 rounded border text-xs"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Certificate Modal */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-3xl p-8 space-y-6">
              <h2 className="text-xl font-bold">Generate Certificate</h2>

              <div className="grid grid-cols-2 gap-4">
                <input
                  className="border rounded-lg px-4 py-2"
                  placeholder="Intern Name"
                  value={form.internName}
                  onChange={(e) =>
                    setForm({ ...form, internName: e.target.value })
                  }
                />
                <input
                  className="border rounded-lg px-4 py-2"
                  placeholder="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
                <input
                  type="date"
                  className="border rounded-lg px-4 py-2"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  className="border rounded-lg px-4 py-2"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  className="border rounded-lg px-4 py-2 col-span-2"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm({ ...form, issueDate: e.target.value })
                  }
                />
              </div>

              {/* Live Preview Placeholder */}
              <div className="border rounded-xl p-6 text-center">
                <p className="text-lg font-semibold">Preview: {form.internName}</p>
                <p>{form.role}</p>
                <p>
                  {form.startDate} → {form.endDate}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateCertificate}
                  className="px-6 py-2 bg-black text-white rounded-lg"
                >
                  Generate Certificate
                </button>
              </div>
            </div>
          </div>

          {/* Hidden offscreen node used for html2canvas capture */}
          <div style={{ position: "fixed", left: -9999, top: -9999, width: "1600px", height: "1200px", overflow: "hidden" }}>
            <div ref={previewRef} style={{ width: "1600px", height: "1200px" }}>
              {/* Paste your certificate HTML here but replace placeholders with form values */}
              <div style={{ fontFamily: "Inter, Georgia, serif", padding: 60, boxSizing: "border-box", width: "100%", height: "100%", background: "white" }}>
                <div style={{ textAlign: "center" }}>
                  <img src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png" alt="logo" style={{ width: 400 }} />
                </div>

                <h1 style={{ fontFamily: "Playfair Display, serif", textAlign: "center", marginTop: 20, fontSize: 36 }}>Internship Completion Certificate</h1>

                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <div style={{ display: "inline-block", borderBottom: "3px solid rgba(0,0,0,0.08)", padding: "8px 22px", fontSize: 34, fontWeight: 800, fontFamily: "Playfair Display, serif" }}>
                    {form.internName}
                  </div>

                  <p style={{ marginTop: 20, color: "#4b5563", maxWidth: 900, marginLeft: "auto", marginRight: "auto" }}>
                    This certifies that the above named individual has successfully completed the <strong>{form.role}</strong> internship program, demonstrating strong commitment to software testing, bug reporting, and quality assurance practices.
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 28 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>Start Date</div>
                      <div style={{ color: "#4b5563" }}>{form.startDate}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>End Date</div>
                      <div style={{ color: "#4b5563" }}>{form.endDate}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>Issue Date</div>
                      <div style={{ color: "#4b5563" }}>{form.issueDate}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 60 }}>
                  <div style={{ textAlign: "left" }}>
                    <img src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png" alt="signature" style={{ width: 160 }} />
                    <div style={{ fontWeight: 700 }}>K. Yuvateja Sainadh</div>
                    <div>Co-Founder & Developer</div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 120, height: 120, background: "#fff", padding: 6 }}>
                      <img src={form.issueDate ? `data:image/png;base64,${btoa("QRPLACEHOLDER")}` : ""} alt="qr" style={{ width: "100%", height: "100%" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}>Scan to verify certificate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
