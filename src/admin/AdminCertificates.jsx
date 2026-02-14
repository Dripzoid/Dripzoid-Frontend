// src/pages/admin/AdminCertificates.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Eye, Download, X, RotateCcw } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/**
 * AdminCertificates
 *
 * - Uses the provided raw HTML certificate template (keeps background + fonts).
 * - Injects placeholders into the template safely (escaped).
 * - Renders a live iframe preview inside the modal (user-visible).
 * - Renders the same populated HTML into a hidden DOM node (captureNode) for html2canvas.
 * - Generates a client-side PDF and exposes Preview (open in new tab) & Download — no backend upload.
 * - Tailwind-based black & white theme in modal controls. Lucide icons used for buttons.
 *
 * Notes:
 * - html2canvas can be picky with remote images and fonts — ensure your Cloudinary images allow CORS.
 * - If fonts don't match exactly when rendered to canvas, consider self-hosting fonts or embedding them into the template.
 */

export default function AdminCertificates() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // Instead of remote upload, we store generated PDF blob + url in state
  const [generatedCert, setGeneratedCert] = useState(null);
  const [generating, setGenerating] = useState(false);

  // QR preview (data URL) used in HTML preview & capture
  const [previewQr, setPreviewQr] = useState(null);

  const [form, setForm] = useState({
    internName: "",
    role: "QA Tester Intern",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  const captureRef = useRef(null); // hidden populated HTML node for capture
  const iframeRef = useRef(null); // visible preview iframe
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    fetchApplications();
  }, []);

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

  // basic HTML-escape helper to avoid accidental injection
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Raw template (exact HTML you provided). Placeholders replaced by buildPopulatedHtml().
  const RAW_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA Tester — Certificate (4:3)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg:#ffffff;
      --accent:#0f172a;
      --muted:#4b5563;
      --padding:40px;
      --max-width:1600px;
      --max-height:1200px;
    }
    *{box-sizing:border-box}
    html,body{height:100%;margin:0;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial}
    body{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:0}
    /* Make certificate fill its parent canvas while capping to a sensible max */
    .certificate {
      width: 100%;
      height: 100%;
      max-width: var(--max-width);
      max-height: var(--max-height);
      aspect-ratio: 4 / 3;
      position:relative;
      border-radius:0;
      overflow:hidden;
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
      position:relative;z-index:2;display:flex;flex-direction:column;flex:1;
      /* use responsive padding so content scales with available canvas */
      padding: clamp(20px, 3.5vw, var(--padding));
      background: transparent;
      gap:16px;
    }
    header.certificate__header{display:flex;align-items:center;justify-content:center;gap:20px}
    /* center the logo and make it scale down on smaller canvases */
    .brand__logo{width:min(42%, 420px);max-width:420px;height:auto;object-fit:contain;border-radius:8px;margin:0 auto;display:block}
    main.certificate__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 40px}
    .eyebrow{font-size:clamp(11px,1.1vw,13px);text-transform:uppercase;letter-spacing:2px;color:var(--muted)}
    .headline{font-family:'Playfair Display', serif;font-size:clamp(28px,3.4vw,40px);margin:8px 0;color:var(--accent)}
    .recipient{display:inline-block;margin:18px 0;padding:clamp(6px,0.9vw,8px) clamp(12px,1.8vw,22px);font-size:clamp(22px,3.2vw,34px);font-weight:800;border-bottom:3px solid rgba(0,0,0,0.08);font-family:'Playfair Display', serif}
    .description{max-width:78%;color:var(--muted);line-height:1.5;font-size:clamp(14px,1.4vw,18px)}
    .meta{display:flex;gap:clamp(12px,2.3vw,28px);margin-top:18px;flex-wrap:wrap;justify-content:center}
    .meta__item{font-size:clamp(12px,1.1vw,14px);color:var(--muted)}
    .meta__label{display:block;font-weight:600;color:var(--accent);font-size:clamp(11px,0.9vw,13px)}
    footer.certificate__footer{display:flex;align-items:flex-end;justify-content:space-between;padding-top:6px}
    .sign__img{width:min(22%, 190px);height:auto;object-fit:contain}
    .qr{width:min(10%,110px);height:min(10%,110px);border:6px solid #fff;padding:6px;border-radius:6px;background:#fff;box-shadow:0 6px 18px rgba(2,6,23,0.08)}
    /* ensure print looks correct */
    @media print{
      body{background:#fff}
      .certificate{box-shadow:none;border-radius:0}
      .certificate__panel{padding:20mm}
      .qr{border:2px solid #000}
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


  // defaults (cloudinary urls you already use)
  const DEFAULTS = {
    LOGO_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png",
    BG_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png",
    SIGN_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png",
  };

  function formatDateToDDMMMYYYY(dateStr) {
  if (!dateStr) return "-";
  // try to parse ISO or common formats
  const d = new Date(dateStr);
  if (isNaN(d)) {
    // If it's not a valid Date, try replacing slashes (e.g. dd/mm/yyyy) or return as-is escaped
    return escapeHtml(dateStr);
  }
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  const m = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${m}-${yyyy}`;
}

function buildPopulatedHtml(values = {}) {
  // defaults for your assets
  const defaults = {
    LOGO_URL: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png",
    BG_URL: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png",
    SIGN_URL: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png",
  };

  // format dates to DD-MMM-YYYY
  const start = formatDateToDDMMMYYYY(values.startDate || "");
  const end = formatDateToDDMMMYYYY(values.endDate || "");
  const issue = formatDateToDDMMMYYYY(values.issueDate || "");

  const filled = RAW_TEMPLATE
    .replace(/{{Intern_Name}}/g, escapeHtml(values.internName || ""))
    .replace(/{{Role}}/g, escapeHtml(values.role || ""))
    .replace(/{{Start_Date}}/g, escapeHtml(start))
    .replace(/{{End_Date}}/g, escapeHtml(end))
    .replace(/{{Issue_Date}}/g, escapeHtml(issue))
    .replace(/{{LOGO_URL}}/g, escapeHtml(values.logo || defaults.LOGO_URL))
    .replace(/{{BG_URL}}/g, escapeHtml(values.bg || defaults.BG_URL))
    .replace(/{{SIGN_URL}}/g, escapeHtml(values.sign || defaults.SIGN_URL))
    .replace(/{{QR_CODE_URL}}/g, escapeHtml(values.qr || ""));
  return filled;
}


  // small helper: wait for images inside element to complete (or timeout)
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
          img.addEventListener("load", onLoad, { once: true });
          img.addEventListener("error", onLoad, { once: true });
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

  // dataURL -> File
  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // Generate PDF client-side, do NOT upload anywhere.
  async function handleGenerateCertificateLocal() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    setGenerating(true);
    setGeneratedCert(null);

    try {
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      // QR points to your public verification page (you can adjust)
      const verifyUrl = `${window.location.origin}/api/certificates/public/view/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      setPreviewQr(qrDataUrl);

      // build populated HTML (same HTML used for visible iframe & capture)
      const html = buildPopulatedHtml({
        internName: form.internName,
        role: form.role,
        startDate: form.startDate,
        endDate: form.endDate,
        issueDate: form.issueDate,
        qr: qrDataUrl,
      });

      // inject into hidden capture node
      if (!captureRef.current) throw new Error("Capture node missing");
      captureRef.current.innerHTML = html;

      // ensure fonts loaded
      if (document.fonts) await document.fonts.ready;

      // wait for images inside capture to load
      await waitForImagesToLoad(captureRef.current, 4000);

      const node = captureRef.current.querySelector("article.certificate") || captureRef.current;

      // capture with html2canvas
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      const pdfBlob = pdf.output("blob");

      // blob URL for preview
      const blobUrl = URL.createObjectURL(pdfBlob);

      // save to state (client-side only)
      setGeneratedCert({
        id: certId,
        blob: pdfBlob,
        url: blobUrl,
        qrDataUrl,
        htmlString: html,
      });

      // optionally mark application approved locally (you can call backend later)
      // await updateStatus(selected.id, "Approved"); // we are not calling backend per your request

      // update iframe preview to show the final HTML (so admin can inspect)
      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }

      // done
      alert("Certificate generated locally. Use Preview / Download buttons.");
    } catch (err) {
      console.error("Local certificate generation error:", err);
      alert("Certificate generation failed: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  }

  function handleOpenPreview() {
    if (!generatedCert?.url) return alert("No generated certificate to preview");
    window.open(generatedCert.url, "_blank");
  }

  function handleDownloadGeneratedPdf() {
    if (!generatedCert?.blob) return alert("No generated certificate to download");
    const a = document.createElement("a");
    const url = generatedCert.url;
    a.href = url;
    a.download = `${generatedCert.id || "certificate"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // small helper to reset generated certificate
  function resetGenerated() {
    if (generatedCert?.url) {
      try {
        URL.revokeObjectURL(generatedCert.url);
      } catch (e) {}
    }
    setGeneratedCert(null);
    setPreviewQr(null);
  }

  if (loading) return <div className="p-10">Loading applications...</div>;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 p-8">
      <h1 className="text-3xl font-extrabold mb-8">Certificate Dashboard</h1>

      <div className="overflow-x-auto border rounded-2xl mb-8 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
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
                      className="text-indigo-600 underline"
                    >
                      View
                    </a>
                  )}
                </td>
                <td className="space-x-2">
                  <button
                    onClick={() => {
                      setSelected(app);
                      setGeneratedCert(null);
                      setPreviewQr(null);
                      setForm((f) => ({ ...f, internName: app.name, role: app.job_title || f.role }));
                      // set iframe preview quickly
                      if (iframeRef.current) {
                        iframeRef.current.srcdoc = buildPopulatedHtml({
                          internName: app.name,
                          role: app.job_title || form.role,
                          startDate: form.startDate,
                          endDate: form.endDate,
                          issueDate: form.issueDate,
                          qr: previewQr || "",
                        });
                      }
                    }}
                    className="px-3 py-1 rounded bg-black text-white text-xs inline-flex items-center gap-2"
                  >
                    <Eye size={14} /> Generate
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/api/jobs/applications/${app.id}/status`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: "Rejected" }),
                        });
                        await fetchApplications();
                      } catch (e) {
                        console.error(e);
                        alert("Failed to update status");
                      }
                    }}
                    className="px-3 py-1 rounded border text-xs inline-flex items-center gap-2"
                  >
                    <X size={14} /> Reject
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
            <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl">
              {/* header */}
              <div className="flex items-center justify-between bg-black text-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Generate Certificate — {selected.name}</h2>
                  <div className="text-xs opacity-80">{selected.email} • Job: {selected.job_id}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetGenerated}
                    title="Reset"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>

                  <button
                    onClick={() => {
                      // close
                      setSelected(null);
                      resetGenerated();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
                  >
                    <X size={16} /> Close
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* left: form & controls */}
                <div className="md:col-span-1 space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Intern Name</label>
                    <input
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900"
                      placeholder="Intern Name"
                      value={form.internName}
                      onChange={(e) => setForm({ ...form, internName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
                    <input
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900"
                      placeholder="Role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Start</label>
                      <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">End</label>
                      <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Issue</label>
                      <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateCertificateLocal}
                      disabled={generating}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded"
                    >
                      {generating ? "Generating..." : <><Eye size={16} /> Generate</>}
                    </button>

                    {generatedCert && (
                      <>
                        <button onClick={handleOpenPreview} className="inline-flex items-center gap-2 px-3 py-2 border rounded">
                          <Eye size={14} /> Preview
                        </button>

                        <button onClick={handleDownloadGeneratedPdf} className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded">
                          <Download size={14} /> Download
                        </button>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    Note: This generates the certificate locally (no upload). Use Preview to open the PDF in a new tab and Download to save it.
                  </div>
                </div>

                {/* middle: visible preview (iframe) */}
                <div className="md:col-span-2">
                  <div className="border rounded-lg overflow-hidden h-[420px]">
                    <iframe
                      ref={iframeRef}
                      title="Certificate Preview"
                      className="w-full h-full"
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

                  <div className="mt-3 text-sm text-slate-500">
                    The iframe above shows the exact HTML template (fonts & background). The generated PDF will match this layout.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden capture node for html2canvas */}
          <div style={{ position: "fixed", left: -99999, top: -99999, width: 1600, height: 1200, overflow: "hidden", zIndex: -9999 }}>
            <div ref={captureRef} />
          </div>
        </>
      )}
    </main>
  );
}
