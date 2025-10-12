import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4"><strong>Your Privacy Matters</strong></p>
      <p className="mb-4">
        At Dripzoid, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li><strong>Information We Collect:</strong> Name, email, phone, shipping/billing info, browsing behavior.</li>
        <li><strong>How We Use Your Data:</strong> Process orders, improve experience, send updates, respond to inquiries.</li>
        <li><strong>Data Protection:</strong> Industry-standard security measures in place.</li>
        <li><strong>Third-Party Sharing:</strong> Only with trusted partners for order/payment processing.</li>
        <li><strong>Cookies:</strong> Used to enhance site functionality and personalize experience.</li>
      </ul>
      <p>By using Dripzoid, you agree to our Privacy Policy. For questions, contact us at <strong>support@dripzoid.com</strong>.</p>
    </div>
  );
}
