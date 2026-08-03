/**
 * Starting content for the Privacy Policy singleton.
 *
 * Seeded into the document the first time it is created (and by
 * `npm run seed:privacy` for sites that already have an empty one) so the admin
 * opens the page with the real policy in front of them and edits from there,
 * rather than facing a blank field and having to retype it.
 *
 * Mirrors the copy the public /privacy page falls back to.
 */
export const PRIVACY_POLICY_HTML = `
<p>CADCAM Automation Systems (&ldquo;CADCAMSYS&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy and is committed to protecting the personal data you share with us. This Privacy Policy explains what we collect, why, how we use and protect it, and the rights available to you. It is published in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;).</p>

<h2>1. Information we collect</h2>
<p>We collect only the information needed to respond to you and improve our services:</p>
<ul>
  <li><strong>Details you provide</strong> &mdash; name, email address, phone/mobile number, company name, job role, and any message, requirement, CV/resume, or sample file you submit through our contact, demo booking, enrolment, post-processor request, job application, or download forms.</li>
  <li><strong>Usage data</strong> &mdash; pages visited, referring page, approximate location (derived from IP), device and browser type, collected via cookies and similar technologies to understand and improve site performance.</li>
</ul>

<h2>2. How we use your information</h2>
<ul>
  <li>To respond to enquiries, demo requests, and support and service requests.</li>
  <li>To process job applications, training enrolments, and post-processor requests.</li>
  <li>To deliver requested downloads (brochures, datasheets).</li>
  <li>To send relevant product, service, and event updates (only where permitted).</li>
  <li>To operate, secure, analyse, and improve our website.</li>
  <li>To comply with applicable legal obligations.</li>
</ul>

<h2>3. Legal basis / consent</h2>
<p>We process your personal data on the basis of the consent you give when you submit a form, and for the legitimate purposes described above. You may withdraw consent at any time by contacting us (see Section 9); withdrawal does not affect processing already carried out.</p>

<h2>4. Cookies</h2>
<p>We use essential cookies for site functionality and analytics cookies to measure and improve performance. You can control or disable cookies through your browser settings; some features may not work as intended if disabled.</p>

<h2>5. Sharing and disclosure</h2>
<p>We do not sell your personal data. We may share it with trusted service providers (e.g. email, hosting, and analytics providers) strictly to operate our services and under confidentiality obligations, or where required by law, regulation, or valid legal process.</p>

<h2>6. Data security</h2>
<p>We follow reasonable security practices and procedures as required under the IT Act and its Rules, including encryption in transit, access controls, and secure hosting, to protect your data against unauthorised access, disclosure, alteration, or loss.</p>

<h2>7. Data retention</h2>
<p>We retain personal data only as long as necessary to fulfil the purpose for which it was collected, or as required by applicable law, after which it is securely deleted or anonymised.</p>

<h2>8. Your rights</h2>
<p>Under the DPDP Act, subject to applicable conditions, you have the right to:</p>
<ul>
  <li>Access the personal data we hold about you.</li>
  <li>Request correction or updating of inaccurate or incomplete data.</li>
  <li>Request erasure of your personal data.</li>
  <li>Withdraw consent for processing.</li>
  <li>Raise a grievance regarding the handling of your data.</li>
</ul>
<p>To exercise any of these rights, contact us using the details below.</p>

<h2>9. Grievance Officer</h2>
<p>In accordance with the Information Technology Act, 2000 and rules made thereunder, the name and contact details of the Grievance Officer are provided below. We aim to acknowledge and resolve complaints within the timelines prescribed by law.</p>
<ul>
  <li><strong>Company:</strong> CADCAM Automation Systems</li>
  <li><strong>Email:</strong> <a href="mailto:sales@cadcamsys.com">sales@cadcamsys.com</a></li>
  <li><strong>Phone:</strong> +91 91567 39830</li>
</ul>

<h2>10. Children&rsquo;s data</h2>
<p>Our services are intended for businesses and professionals. We do not knowingly collect personal data of children. If you believe a child has provided us data, please contact us and we will delete it.</p>

<h2>11. Changes to this policy</h2>
<p>We may update this Privacy Policy from time to time. The latest version will always be available on this page with a revised effective date.</p>

<h2>12. Contact us</h2>
<p>Questions about this policy or your data? Email <a href="mailto:sales@cadcamsys.com">sales@cadcamsys.com</a>.</p>
`.trim();

export const PRIVACY_DEFAULTS = {
  eyebrow: "Legal",
  heading: "Privacy Policy",
  tagline: "Effective 27 July 2026. How we handle your personal data.",
  intro: PRIVACY_POLICY_HTML,
};
