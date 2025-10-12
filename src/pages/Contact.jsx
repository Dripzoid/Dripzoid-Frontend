import React from "react";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <p className="text-lg mb-4">We’d love to hear from you! Reach out to us via:</p>
      <ul className="mb-4">
        <li><strong>Email:</strong> support@dripzoid.com</li>
        <li><strong>Phone:</strong> +91 12345 67890</li>
        <li><strong>Address:</strong> Dripzoid HQ, Mumbai, India</li>
      </ul>
      <p>Or fill out our contact form on the website, and our team will get back to you as soon as possible.</p>
      <p className="mt-4">Follow us on social media: Instagram | Facebook | Twitter | YouTube</p>
    </div>
  );
}
