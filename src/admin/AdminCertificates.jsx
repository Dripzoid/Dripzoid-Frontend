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

  const [generatedCert, setGeneratedCert] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [previewQr, setPreviewQr] = useState(null);

  const [form, setForm] = useState({
    internName: "",
    role: "",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  const previewRef = useRef(null);
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

    try {
      const res = await fetch(`${API_BASE}/api/certificates/application/${app.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGeneratedCert({
          url: json.certificate_url,
          qr: json.qr_url,
          id: json.certificate_id,
        });
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

  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

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

  async function handleGenerateCertificate() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    setGenerating(true);
    try {
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      const verifyUrl = `https://dripzoid.com/verify/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      setPreviewQr(qrDataUrl);

      await new Promise((r) => setTimeout(r, 150));

      const node = previewRef.current;
      if (!node) throw new Error("Preview node not ready");

      const canvas = await html2canvas(node, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/jpeg",0.7);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${certId}.pdf`, { type: "application/pdf" });

      const qrFile = dataURLtoFile(qrDataUrl, `${certId}-qr.png`);

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
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create certificate");

      setGeneratedCert({
        url: data.certificate_url,
        qr: data.qr_url,
        id: data.certificate_id || certId,
      });

      await updateStatus(selected.id, "Approved");
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

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-center">Generate Certificate</h2>

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

          {/* Hidden capture node */}
          <div style={{ position: "fixed", left: -9999, top: -9999, width: "1600px", height: "1200px", overflow: "hidden" }}>
            <div ref={previewRef} style={{ width: "1600px", height: "1200px" }}>
              <style>{`
                *{box-sizing:border-box;margin:0;padding:0}
                .certificate{position:relative;width:1600px;height:1200px;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial}
                .bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
                .panel{position:relative;z-index:2;height:100%;padding:40px;display:flex;flex-direction:column}
                .header{display:flex;justify-content:center}
                .logo{width:350px;height:auto;object-fit:contain;margin:auto}
                .body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px 80px}
                .eyebrow{font-size:14px;letter-spacing:2px;color:#4b5563;text-transform:uppercase}
                .headline{font-family:'Playfair Display',serif;font-size:40px;margin:10px 0;color:#0f172a}
                .recipient{font-family:'Playfair Display',serif;font-size:42px;font-weight:800;margin:18px 0;border-bottom:3px solid rgba(0,0,0,0.08);padding:8px 24px}
                .description{max-width:70%;font-size:20px;color:#4b5563;line-height:1.6}
                .meta{display:flex;gap:40px;margin-top:24px}
                .meta div{font-size:16px;color:#4b5563}
                .meta strong{display:block;color:#0f172a}
                .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto}
                .sign img{width:200px}
                .qr{width:120px;height:120px;border:6px solid #fff;background:#fff;padding:6px}
              `}</style>

              <article className="certificate">
                <img
                  className="bg-img"
                  src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png"
                  alt="background"
                />

                <div className="panel">
                  <div className="header">
                    <img
                      className="logo"
                      src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png"
                      alt="Dripzoid logo"
                    />
                  </div>

                  <div className="body">
                    <div className="eyebrow">Internship Completion Certificate</div>
                    <div className="headline">{form.role} Internship</div>
                    <div className="recipient">{form.internName}</div>
                    <p className="description">
                      This certifies that the above named individual has successfully completed the <strong>{form.role}</strong> internship program, demonstrating strong commitment to software testing, bug reporting, and quality assurance practices.
                    </p>
                    <div className="meta">
                      <div><strong>Start Date</strong>{form.startDate || "-"}</div>
                      <div><strong>End Date</strong>{form.endDate || "-"}</div>
                      <div><strong>Issue Date</strong>{form.issueDate || "-"}</div>
                    </div>
                  </div>

                  <div className="footer">
                    <div className="sign">
                      <img src="https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png" alt="signature" />
                      <div style={{ fontWeight: 700 }}>K. Yuvateja Sainadh</div>
                      <div>Co-Founder & Developer</div>
                    </div>

                    <div>
                      <div className="qr">
                        {previewQr && <img src={previewQr} alt="qr" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                      </div>
                      <div style={{ fontSize: 14, color: "#4b5563", textAlign: "center", marginTop: 6 }}>
                        Scan to verify certificate
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
