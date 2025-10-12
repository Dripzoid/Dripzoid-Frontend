import React from "react";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <p className="text-lg mb-4">We’d love to hear from you! Reach out to us via:</p>
      <ul className="mb-4 space-y-2">
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@dripzoid.com" className="text-blue-500 hover:underline">
            support@dripzoid.com
          </a>
        </li>
        <li>
          <strong>Phone:</strong>{" "}
          <a href="tel:+919494038163" className="text-blue-500 hover:underline">
            +91 94940 38163
          </a>
        </li>
        <li>
          <strong>Address:</strong> Dripzoid, Near Cattle Market, Pithapuram, Andhra Pradesh, India - 533450
        </li>
      </ul>
      <p>Or fill out our contact form on the website, and our team will get back to you as soon as possible.</p>
      <p className="mt-4">
        Follow us on social media:{" "}
        <a
          href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw=="
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Instagram
        </a>{" "}
        |{" "}
        <a
          href="https://wa.me/message/NSIW5WOQRBDFG1"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          WhatsApp
        </a>{" "}
        |{" "}
        <a
          href="https://www.facebook.com/share/1Begozxt9S/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Facebook
        </a>{" "}
        |{" "}
        <a
          href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          YouTube
        </a>
      </p>
    </div>
  );
}
