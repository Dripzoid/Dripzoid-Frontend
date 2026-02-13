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

  // store returned Cloudinary URLs after successful generation (or when already generated)
  const [generatedCert, setGeneratedCert] = useState(null);
  const [generating, setGenerating] = useState(false);

  // QR data URL used in preview node before uploading
  const [previewQr, setPreviewQr] = useState(null);

  const [form, setForm] = useState({
    internName: "",
    role: "",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  const previewRef = useRef(null); // hidden DOM node to render the certificate for capture
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function fetchApplications() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/jobs/applications/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  // When opening modal, check if a certificate already exists for this application
  async function openGenerator(app) {
    setSelected(app);
    setGeneratedCert(null);
    setPreviewQr(null);

    setForm({
      internName: app.name,
      role: app.job_title || "QA Tester Intern",
      startDate: "",
      endDate: "",
      issueDate: new Date().toISOString().slice(0, 10),
    });

    // Try to fetch existing certificate for this application
    try {
      const res = await fetch(`${API_BASE}/api/certificates/application/${app.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        // Expect json: { certificate_url, qr_url, certificate_id, ... }
        setGeneratedCert({
          url: json.certificate_url,
          qr: json.qr_url,
          id: json.certificate_id,
        });
        // set preview QR to show in offscreen preview (so Preview will match stored cert)
        if (json.qr_url) setPreviewQr(json.qr_url);
      }
    } catch (err) {
      console.error("Failed to fetch certificate for application:", err);
    }
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

  // helper: fetch a URL and force-download it client-side
  async function downloadUrlAsFile(url, filename = "certificate.pdf") {
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error("Failed to fetch file for download");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file. Try opening Preview and saving manually.");
    }
  }

  // Core: generate QR, render preview node to PDF, upload
  async function handleGenerateCertificate() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    setGenerating(true);
    try {
      // 1) Create certificate id
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      // 2) generate QR dataURL that points to verification endpoint
      const verifyUrl = `https://dripzoid.com/verify/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);

      // set preview QR so the offscreen preview includes the QR when we capture
      setPreviewQr(qrDataUrl);

      // wait for DOM to update with the QR in preview
      await new Promise((r) => setTimeout(r, 150));

      const node = previewRef.current;
      if (!node) throw new Error("Preview node not ready");

      // 3) render canvas (capture the preview node which now contains the QR)
      const canvas = await html2canvas(node, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      // 4) convert canvas to PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${certId}.pdf`, { type: "application/pdf" });

      // 5) Convert QR dataURL to File (we already have data URL)
      const qrFile = dataURLtoFile(qrDataUrl, `${certId}-qr.png`);

      // 6) Upload to backend: POST /api/certificates (multipart/form-data)
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
          Authorization: `Bearer ${token}`, // DO NOT set Content-Type
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Upload failed:", data);
        throw new Error(data.message || "Failed to create certificate");
      }

      // Save returned Cloudinary URLs in state so UI can Preview/Download
      // Expect backend to return: { certificate_url, qr_url, certificate_id }
      setGeneratedCert({
        url: data.certificate_url,
        qr: data.qr_url,
        id: data.certificate_id || certId,
      });

      // Optionally update application status to Approved
      try {
        await updateStatus(selected.id, "Approved");
      } catch (e) {
        console.warn("Status update failed but certificate was created", e);
      }

      // refresh list (status updated)
      await fetchApplications();
    } catch (err) {
      console.error("Certificate generation error:", err);
      alert("Certificate generation failed: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="p-10">Loading applications...</div>;

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Certificate Dashboard</h1>

      {/* Applications Table */}
      <div className="overflow-x-auto border rounded-2xl mb-8">
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
            <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl p-6 space-y-6">
              <h2 className="text-xl font-bold">Generate Certificate</h2>

              <div className="grid grid-cols-2 gap-4">
                <input
                  className="border rounded-lg px-4 py-2"
                  placeholder="Intern Name"
                  value={form.internName}
                  onChange={(e) => setForm({ ...form, internName: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <input
                  type="date"
                  className="border rounded-lg px-4 py-2"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                <input
                  type="date"
                  className="border rounded-lg px-4 py-2 col-span-2"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                />
              </div>

              {/* Live Preview placeholder */}
              <div className="border rounded-xl p-6 text-center">
                <p className="text-lg font-semibold">Preview: {form.internName}</p>
                <p>{form.role}</p>
                <p>{form.startDate} → {form.endDate}</p>
              </div>

              {generatedCert && (
                <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm">
                  Certificate generated and stored at Cloudinary.
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => {
                    setSelected(null);
                    setGeneratedCert(null);
                    setPreviewQr(null);
                    setGenerating(false);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Close
                </button>

                {!generatedCert && (
                  <button
                    onClick={handleGenerateCertificate}
                    className="px-6 py-2 bg-black text-white rounded-lg"
                    disabled={generating}
                  >
                    {generating ? "Generating..." : "Generate Certificate"}
                  </button>
                )}

                {generatedCert && (
                  <>
                    <a
                      href={generatedCert.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Preview Certificate
                    </a>

                    <button
                      onClick={() => downloadUrlAsFile(generatedCert.url, `${generatedCert.id || "certificate"}.pdf`)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg"
                    >
                      Download PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hidden offscreen node used for html2canvas capture */}
          <div style={{ position: "fixed", left: -9999, top: -9999, width: "1600px", height: "1200px", overflow: "hidden" }}>
            <div ref={previewRef} style={{ width: "1600px", height: "1200px" }}>
              {/* Put the full template HTML/CSS here (converted to JSX). */}
              <div>
                {/* Inline <style> to ensure html2canvas picks up layout exactly */}
                <style>{`
                  :root{
                    --bg:#f3f4f6;
                    --panel-bg:rgba(255,255,255,0.85);
                    --accent:#0f172a;
                    --muted:#4b5563;
                    --padding:40px;
                  }
                  *{box-sizing:border-box}
                  body,html{margin:0;padding:0}
                  .certificate {
                    width: 1600px;
                    height: 1200px;
                    position:relative;
                    border-radius:0;
                    overflow:hidden;
                    background-color:#fff;
                    display:flex;
                    align-items:stretch;
                    font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
                  }
                  .certificate__bg{
                    position:absolute;inset:0;
                    background-repeat:no-repeat;
                    background-position:center;
                    background-size:cover;
                    z-index:1;
                  }
                  .certificate__panel{
                    position:relative;z-index:2;display:flex;flex-direction:column;flex:1;padding:var(--padding);
                    background: transparent;
                    gap:16px;
                  }
                  .certificate__header{display:flex;align-items:center;justify-content:center;gap:20px}
                  .brand__logo{width:350px;height:auto;object-fit:contain;border-radius:8px}
                  .certificate__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 40px}
                  .eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)}
                  .headline{font-family:'Playfair Display', serif;font-size:36px;margin:8px 0;color:var(--accent)}
                  .recipient{display:inline-block;margin:18px 0;padding:8px 22px;font-size:34px;font-weight:800;border-bottom:3px solid rgba(0,0,0,0.08);font-family:'Playfair Display', serif}
                  .description{max-width:78%;color:var(--muted);line-height:1.5;font-size:18px}
                  .meta{display:flex;gap:28px;margin-top:18px;flex-wrap:wrap;justify-content:center}
                  .meta__item{font-size:14px;color:var(--muted)}
                  .meta__label{display:block;font-weight:600;color:var(--accent);font-size:13px}
                  .certificate__footer{display:flex;align-items:flex-end;justify-content:space-between;padding-top:6px}
                  .sign__img{width:190px;height:auto;object-fit:contain}
                  .qr{width:110px;height:110px;border:6px solid #fff;padding:6px;border-radius:6px;background:#fff;box-shadow:0 6px 18px rgba(2,6,23,0.08)}
                `}</style>

                <article className="certificate" role="document" aria-label="Internship Completion Certificate">
                  {/* background */}
                  <div
                    className="certificate__bg"
                    style={{
                      backgroundImage:
                        "url('https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png')",
                    }}
                    aria-hidden="true"
                  />

                  <section className="certificate__panel">
                    <header className="certificate__header" aria-hidden="false">
                      <div className="brand">
                        <img
                          className="brand__logo"
                          src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png"
                          alt="Dripzoid logo"
                        />
                      </div>
                    </header>

                    <main className="certificate__body">
                      <div className="eyebrow">Internship Completion Certificate</div>
                      <h2 className="headline">
                        <span className="role">{form.role}</span> Internship
                      </h2>

                      <div className="recipient" role="text" aria-label="Recipient name">
                        {form.internName}
                      </div>

                      <p className="description">
                        This certifies that the above named individual has successfully completed the{" "}
                        <strong>{form.role}</strong> internship program, demonstrating strong commitment to software testing, bug reporting, and quality assurance practices.
                      </p>

                      <div className="meta" aria-hidden="false">
                        <div className="meta__item">
                          <span className="meta__label">Start Date</span>
                          {form.startDate || "-"}
                        </div>
                        <div className="meta__item">
                          <span className="meta__label">End Date</span>
                          {form.endDate || "-"}
                        </div>
                        <div className="meta__item">
                          <span className="meta__label">Issue Date</span>
                          {form.issueDate || "-"}
                        </div>
                      </div>
                    </main>

                    <footer className="certificate__footer" aria-hidden="false">
                      <div className="sign">
                        <img
                          className="sign__img"
                          src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png"
                          alt="Signature of Co-Founder"
                        />
                        <div style={{ fontWeight: 700 }}>K. Yuvateja Sainadh</div>
                        <div>Co-Founder &amp; Developer</div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div className="qr" role="img" aria-label="QR code for verification">
                          {previewQr ? (
                            <img src={previewQr} alt="qr" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", borderRadius: 4 }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb" }}>QR</div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#4b5563" }}>Scan to verify certificate</div>
                      </div>
                    </footer>
                  </section>
                </article>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
