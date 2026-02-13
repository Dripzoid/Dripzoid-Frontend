```jsx
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

  const [form, setForm] = useState({
    internName: "",
    role: "",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  const previewRef = useRef(null);
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
    setGeneratedCert(null);
    setForm({
      internName: app.name,
      role: app.job_title || "QA Tester Intern",
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

  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  async function handleGenerateCertificate() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    try {
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;
      const verifyUrl = `https://dripzoid.com/verify/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);

      await new Promise((r) => setTimeout(r, 150));

      const node = previewRef.current;
      if (!node) throw new Error("Preview node not ready");

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${certId}.pdf`, {
        type: "application/pdf",
      });

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
      if (!res.ok) {
        console.error("Upload failed:", data);
        return alert(data.message || "Failed to create certificate");
      }

      setGeneratedCert({
        url: data.certificate_url,
        qr: data.qr_url,
      });

      await updateStatus(selected.id, "Approved");
      fetchApplications();
    } catch (err) {
      console.error("Certificate generation error:", err);
      alert("Certificate generation failed: " + err.message);
    }
  }

  if (loading) return <div className="p-10">Loading applications...</div>;

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Certificate Dashboard</h1>

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

              {generatedCert && (
                <div className="p-4 rounded-lg bg-green-100 text-green-800 text-sm">
                  Certificate generated and stored on Cloudinary.
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => {
                    setSelected(null);
                    setGeneratedCert(null);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                {!generatedCert && (
                  <button
                    onClick={handleGenerateCertificate}
                    className="px-6 py-2 bg-black text-white rounded-lg"
                  >
                    Generate Certificate
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

                    <a
                      href={generatedCert.url}
                      download
                      className="px-6 py-2 bg-green-600 text-white rounded-lg"
                    >
                      Download PDF
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hidden Preview Node */}
          <div
            style={{
              position: "fixed",
              left: -9999,
              top: -9999,
              width: "1600px",
              height: "1200px",
              overflow: "hidden",
            }}
          >
            <div ref={previewRef} style={{ width: "1600px", height: "1200px" }}>
              {/* Your certificate template HTML already used here */}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
```
