// src/pages/admin/AdminCertificates.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/**
 * AdminCertificates
 *
 * - Uses the provided raw HTML certificate template (keeps background + fonts).
 * - Injects placeholders into the template safely (escaped).
 * - Renders a live iframe preview inside the modal (user-visible).
 * - Renders the same populated HTML into a hidden DOM node (captureNode) for html2canvas.
 * - Ensures Google fonts are loaded into the main document (so html2canvas renders typography closer to preview).
 * - Captures canvas -> generates PDF -> uploads PDF + QR to backend endpoint /api/certificates.
 * - Shows Preview and Download buttons when backend returns cloudinary URL.
 *
 * Note: backend endpoints expected:
 *  - GET  /api/jobs/applications/all
 *  - GET  /api/certificates/application/:applicationId
 *  - POST /api/certificates  (multipart/form-data) -> returns { certificate_url, qr_url, certificate_id }
 *
 * Adjust API_BASE if needed.
 */

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

  const captureRef = useRef(null); // hidden populated HTML node for capture
  const iframeRef = useRef(null); // iframe for visible preview (srcDoc)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // -------------------------
  // Helper: escape insertion values to avoid accidental HTML injection
  // -------------------------
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // -------------------------
  // Certificate raw HTML template (exact template you provided).
  // Placeholders: {{Intern_Name}}, {{Role}}, {{Start_Date}}, {{End_Date}}, {{Issue_Date}}, {{QR_CODE_URL}}
  // -------------------------
  const RAW_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA Tester — Certificate (4:3)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg:#f3f4f6;
      --panel-bg:rgba(255,255,255,0.85);
      --accent:#0f172a;
      --muted:#4b5563;
      --padding:clamp(18px, 2.5vw, 40px);
      --radius:18px;
      --max-width:1200px;
    }
    *{box-sizing:border-box}
    html,body{height:100%;margin:0;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial}
    body{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px}
    .certificate {
      width: min(100%, var(--max-width));
      aspect-ratio: 4 / 3;
      position:relative;
      border-radius:16px;
      overflow:hidden;
      box-shadow: 0 20px 50px rgba(2,6,23,0.25);
      background-color: #fff;
      display:flex;
      align-items:stretch;
    }
    .certificate__bg{
      position:absolute;inset:0;
      background-repeat:no-repeat;
      background-position:center;
      background-size:cover;
    }
    .certificate__panel{
      position:relative;z-index:2;display:flex;flex-direction:column;flex:1;padding:var(--padding);
      background: transparent;
      gap:16px;
    }
    header.certificate__header{display:flex;align-items:center;justify-content:center;gap:20px}
    .brand{display:flex;align-items:center;gap:14px}
    .brand__logo{width:350px;height:auto;object-fit:contain;border-radius:8px}
    .brand__title{font-family:'Playfair Display', serif;font-weight:700;color:var(--accent);letter-spacing:1px}
    .brand__title small{display:block;font-weight:600;font-size:12px;color:var(--muted);letter-spacing:0}
    main.certificate__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 40px}
    .eyebrow{font-size:13px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)}
    .headline{font-family:'Playfair Display', serif;font-size:clamp(24px, 3.2vw, 40px);margin:8px 0;color:var(--accent)}
    .role{font-size:clamp(18px, 2.2vw, 28px);font-weight:600;color:var(--accent)}
    .recipient{display:inline-block;margin:18px 0;padding:8px 22px;font-size:clamp(22px, 3.4vw, 38px);font-weight:800;border-bottom:3px solid rgba(0,0,0,0.08);font-family:'Playfair Display', serif}
    .description{max-width:78%;color:var(--muted);line-height:1.5;font-size:clamp(14px,1.6vw,18px)}
    .meta{display:flex;gap:28px;margin-top:18px;flex-wrap:wrap;justify-content:center}
    .meta__item{font-size:14px;color:var(--muted)}
    .meta__label{display:block;font-weight:600;color:var(--accent);font-size:13px}
    footer.certificate__footer{display:flex;align-items:flex-end;justify-content:space-between;padding-top:6px}
    .sign{display:flex;flex-direction:column;gap:6px}
    .sign__img{width:190px;height:auto;object-fit:contain}
    .sign__title{font-weight:700}
    .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}
    .qr{width:110px;height:110px;border:6px solid #fff;padding:6px;border-radius:6px;background:#fff;box-shadow:0 6px 18px rgba(2,6,23,0.08)}
    .verify{font-size:12px;color:var(--muted)}
    @media print{
      body{background:#fff}
      .certificate{box-shadow:none;border-radius:0}
      .certificate__panel{padding:20mm}
      .qr{border:2px solid #000}
    }
    @media (max-width:640px){
      .certificate__panel{padding:12px}
      .brand__logo{width:100px}
      .recipient{font-size:22px}
    }
    @media (prefers-contrast: more){
      .certificate__panel{background:var(--panel-bg)}
      .eyebrow,.description,.meta__item{color:#222}
    }
  </style>
</head>
<body>
  <article class="certificate" role="document" aria-label="Certificate of Completion">
    <div class="certificate__bg" style="background-image:url('{{BG_URL}}')" aria-hidden="true"></div>
    <section class="certificate__panel">
      <header class="certificate__header" aria-hidden="false">
        <div class="brand">
          <img class="brand__logo" src="{{LOGO_URL}}" alt="Dripzoid logo" />
        </div>
      </header>
      <main class="certificate__body">
        <div class="eyebrow">Internship Completion Certificate</div>
        <h2 class="headline"><span class="role">{{Role}}</span> Internship</h2>
        <div class="recipient" role="text" aria-label="Recipient name">{{Intern_Name}}</div>
        <p class="description">This certifies that the above named individual has successfully completed the <strong>{{Role}}</strong> internship program, demonstrating strong commitment to software testing, bug reporting, and quality assurance practices.</p>
        <div class="meta" aria-hidden="false">
          <div class="meta__item"><span class="meta__label">Start Date</span>{{Start_Date}}</div>
          <div class="meta__item"><span class="meta__label">End Date</span>{{End_Date}}</div>
          <div class="meta__item"><span class="meta__label">Issue Date</span>{{Issue_Date}}</div>
        </div>
      </main>
      <footer class="certificate__footer" aria-hidden="false">
        <div class="sign">
          <img class="sign__img" src="{{SIGN_URL}}" alt="Signature of Co-Founder" />
          <div>
            <div class="sign__title">K. Yuvateja Sainadh</div>
            <div class="sign__role">Co-Founder &amp; Developer</div>
          </div>
        </div>
        <div class="qr-wrap">
          <div class="qr" role="img" aria-label="QR code for verification">
            <img src="{{QR_CODE_URL}}" alt="QR code" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:4px"/>
          </div>
          <div class="verify">Scan to verify certificate</div>
        </div>
      </footer>
    </section>
  </article>
</body>
</html>`;

  // -------------------------
  // Ensure Google fonts linked in template are loaded into the top-level document
  // so html2canvas can access them. (Adds <link> to head if missing)
  // -------------------------
  function ensureTemplateFontsLoaded() {
    // URL used in RAW_TEMPLATE
    const fontHref =
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:wght@400;700&display=swap";
    const existing = Array.from(document.getElementsByTagName("link")).find(
      (l) => l.href && l.href.indexOf("fonts.googleapis.com") !== -1 && l.href.indexOf("Inter") !== -1
    );
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontHref;
      document.head.appendChild(link);
    }
    // return a promise that resolves once fonts are ready
    return document.fonts ? document.fonts.ready : Promise.resolve();
  }

  // -------------------------
  // Build populated HTML (string) from RAW_TEMPLATE + provided values
  // -------------------------
  function buildPopulatedHtml(values = {}) {
    // default assets (your Cloudinary images used in template)
    const defaults = {
      LOGO_URL:
        "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png",
      BG_URL:
        "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png",
      SIGN_URL:
        "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png",
    };

    const filled = RAW_TEMPLATE.replace(/{{Intern_Name}}/g, escapeHtml(values.internName || ""))
      .replace(/{{Role}}/g, escapeHtml(values.role || ""))
      .replace(/{{Start_Date}}/g, escapeHtml(values.startDate || "-"))
      .replace(/{{End_Date}}/g, escapeHtml(values.endDate || "-"))
      .replace(/{{Issue_Date}}/g, escapeHtml(values.issueDate || "-"))
      .replace(/{{LOGO_URL}}/g, escapeHtml(values.logo || defaults.LOGO_URL))
      .replace(/{{BG_URL}}/g, escapeHtml(values.bg || defaults.BG_URL))
      .replace(/{{SIGN_URL}}/g, escapeHtml(values.sign || defaults.SIGN_URL))
      // QR code: allow previewQr to be a data URL or a remote URL
      .replace(/{{QR_CODE_URL}}/g, escapeHtml(values.qr || ""));
    return filled;
  }

  // -------------------------
  // Fetch applications
  // -------------------------
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
      setApps([]);
    } finally {
      setLoading(false);
    }
  }

  // on mount
  useEffect(() => {
    fetchApplications();
  }, []);

  // When user opens generator, fetch existing certificate (if any) and prefill
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

    // fetch certificate for application (if exists)
    try {
      const res = await fetch(`${API_BASE}/api/certificates/application/${app.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGeneratedCert({
          url: json.certificate_url,
          qr: json.qr_url,
          id: json.certificate_id || json.certificate_id,
        });
        if (json.qr_url) {
          setPreviewQr(json.qr_url);
        }
      }
    } catch (err) {
      // not fatal
      console.warn("Could not fetch certificate for app:", err);
    }
  }

  // -------------------------
  // Generate, capture, PDF, upload flow
  // -------------------------
  async function handleGenerateCertificate() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    setGenerating(true);
    try {
      // 1) certificate id
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      // 2) prepare verify url + QR dataurl
      const verifyUrl = `${window.location.origin.replace(window.location.pathname, "")}/api/certificates/verify/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      setPreviewQr(qrDataUrl);

      // 3) ensure fonts loaded so html2canvas renders correctly
      await ensureTemplateFontsLoaded();
      // small wait to allow preview QR to be injected into DOM
      await new Promise((r) => setTimeout(r, 160));

      // 4) populate capture DOM with fully populated HTML
      const html = buildPopulatedHtml({
        internName: form.internName,
        role: form.role,
        startDate: form.startDate,
        endDate: form.endDate,
        issueDate: form.issueDate,
        qr: qrDataUrl,
      });

      // set innerHTML into captureRef node
      if (!captureRef.current) throw new Error("Capture node missing");
      captureRef.current.innerHTML = html;

      // 5) Wait for fonts to be ready and images to load inside the capture node
      await document.fonts.ready;

      // Wait for images inside captureRef to load (background + logo + signature + qr)
      await waitForImagesToLoad(captureRef.current, 3000);

      // 6) capture via html2canvas
      const node = captureRef.current.querySelector("article.certificate") || captureRef.current;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // 7) generate PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `${certId}.pdf`, { type: "application/pdf" });

      // 8) prepare qr file
      const qrFile = dataURLtoFile(qrDataUrl, `${certId}-qr.png`);

      // 9) upload to backend
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
          Authorization: `Bearer ${token}`, // let browser set Content-Type for FormData
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Upload failed:", data);
        throw new Error(data.message || "Failed to create certificate");
      }

      // 10) store returned Cloudinary URLs
      setGeneratedCert({
        url: data.certificate_url,
        qr: data.qr_url,
        id: data.certificate_id || certId,
      });

      // update application status (optional)
      try {
        await fetch(`${API_BASE}/api/jobs/applications/${selected.id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "Approved" }),
        });
      } catch (e) {
        console.warn("Failed to update application status after cert generation", e);
      }

      // refresh apps list
      await fetchApplications();
      alert("Certificate generated & uploaded successfully.");
    } catch (err) {
      console.error("Certificate generation error:", err);
      alert("Certificate generation failed: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  }

  // wait for images inside an element to load (or timeout)
  function waitForImagesToLoad(container, timeout = 3000) {
    const imgs = Array.from(container.querySelectorAll("img"));
    if (imgs.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let loaded = 0;
      let done = false;
      const onLoad = () => {
        loaded++;
        if (!done && loaded >= imgs.length) {
          done = true;
          resolve();
        }
      };
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          onLoad();
        } else {
          img.addEventListener("load", onLoad);
          img.addEventListener("error", onLoad);
        }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          resolve();
        }
      }, timeout);
    });
  }

  // -------------------------
  // Helper: dataURL -> File (same as earlier)
  // -------------------------
  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // -------------------------
  // Download file from URL
  // -------------------------
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

  if (loading) return <div className="p-10">Loading applications...</div>;

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Certificate Dashboard</h1>

      {/* Applications table */}
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
                    <a href={`${API_BASE}${app.resume_url}`} target="_blank" rel="noreferrer" className="text-blue-500 underline">
                      View
                    </a>
                  )}
                </td>
                <td className="space-x-2">
                  <button onClick={() => openGenerator(app)} className="px-3 py-1 rounded bg-black text-white text-xs">
                    Generate
                  </button>
                  <button onClick={async () => { await fetch(`${API_BASE}/api/jobs/applications/${app.id}/status`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: "Rejected" }) }); await fetchApplications(); }} className="px-3 py-1 rounded border text-xs">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-5xl p-6 space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold">Generate Certificate — {selected.name}</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setSelected(null);
                      setGeneratedCert(null);
                      setPreviewQr(null);
                    }}
                    className="px-3 py-1 border rounded"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-lg px-4 py-2" placeholder="Intern Name" value={form.internName} onChange={(e) => setForm({ ...form, internName: e.target.value })} />
                    <input className="border rounded-lg px-4 py-2" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="date" className="border rounded-lg px-4 py-2" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                    <input type="date" className="border rounded-lg px-4 py-2" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                    <input type="date" className="border rounded-lg px-4 py-2" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                  </div>

                  <div className="border rounded-xl p-4">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Live preview (interactive):</div>
                    <div style={{ height: 300, overflow: "hidden", borderRadius: 8, marginTop: 8 }}>
                      {/* iframe shows exact HTML (srcDoc) so admin sees final layout including fonts & bg */}
                      <iframe
                        ref={iframeRef}
                        title="cert-preview"
                        style={{ width: "100%", height: "100%", border: "none", transform: "scale(0.7)", transformOrigin: "top left" }}
                        srcDoc={buildPopulatedHtml({
                          internName: form.internName,
                          role: form.role,
                          startDate: form.startDate,
                          endDate: form.endDate,
                          issueDate: form.issueDate,
                          qr: previewQr || "",
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!generatedCert && (
                      <button onClick={handleGenerateCertificate} disabled={generating} className="px-6 py-2 bg-black text-white rounded-lg">
                        {generating ? "Generating..." : "Generate & Upload"}
                      </button>
                    )}

                    {generatedCert && (
                      <>
                        <a href={generatedCert.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                          Open Stored Certificate
                        </a>

                        <button onClick={() => downloadUrlAsFile(generatedCert.url, `${generatedCert.id || "certificate"}.pdf`)} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                          Download PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Right column: details & status */}
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-neutral-600">Application</div>
                    <div className="mt-2 font-medium">{selected.name}</div>
                    <div className="text-xs text-neutral-500">{selected.email}</div>
                    <div className="text-xs text-neutral-500">Job: {selected.job_id}</div>
                    <div className="mt-3">
                      <div className="text-sm">Status: <strong>{selected.status}</strong></div>
                      {generatedCert?.url && <div className="text-xs mt-2">Certificate: <a href={generatedCert.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open</a></div>}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-neutral-600 mb-2">Actions</div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => { updateStatus(selected.id, "Approved"); }} className="px-3 py-2 rounded border text-sm">Mark Approved</button>
                      <button onClick={() => { updateStatus(selected.id, "Rejected"); }} className="px-3 py-2 rounded border text-sm">Mark Rejected</button>
                      <button onClick={() => { setPreviewQr(null); setGeneratedCert(null); }} className="px-3 py-2 rounded border text-sm">Reset Preview</button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-neutral-600">Notes</div>
                    <div className="text-xs text-neutral-500 mt-2">
                      - The visible preview uses an <code>iframe</code> and shows the final HTML with background and fonts.<br/>
                      - The capture used for PDF is the hidden populated DOM (exact HTML inserted) to ensure html2canvas picks up styles/background.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden capture node (not visible). html2canvas captures this exact HTML. */}
          <div style={{ position: "fixed", left: -99999, top: -99999, width: 1600, height: 1200, overflow: "hidden", zIndex: -9999 }}>
            <div ref={captureRef} />
          </div>
        </>
      )}
    </main>
  );
}
