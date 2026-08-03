/**
 * Starting content for the Privacy Policy singleton.
 *
 * Structured, not HTML: each section has a heading plus an optional paragraph
 * and/or a list of points, so the admin adds and reorders sections in the
 * editor instead of hand-writing markup.
 *
 * Backfilled into the document whenever those fields are still empty, so the
 * editor opens with the real policy to edit rather than a blank page.
 */
export const PRIVACY_SECTIONS = [
  {
    heading: "",
    text:
      "CADCAM Automation Systems (“CADCAMSYS”, “we”, “us”, or “our”) respects your privacy and is committed to protecting the personal data you share with us. This Privacy Policy explains what we collect, why, how we use and protect it, and the rights available to you. It is published in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023 (“DPDP Act”).",
    items: [],
  },
  {
    heading: "1. Information we collect",
    text: "We collect only the information needed to respond to you and improve our services:",
    items: [
      "Details you provide — name, email address, phone/mobile number, company name, job role, and any message, requirement, CV/resume, or sample file you submit through our contact, demo booking, enrolment, post-processor request, job application, or download forms.",
      "Usage data — pages visited, referring page, approximate location (derived from IP), device and browser type, collected via cookies and similar technologies to understand and improve site performance.",
    ],
  },
  {
    heading: "2. How we use your information",
    text: "",
    items: [
      "To respond to enquiries, demo requests, and support and service requests.",
      "To process job applications, training enrolments, and post-processor requests.",
      "To deliver requested downloads (brochures, datasheets).",
      "To send relevant product, service, and event updates (only where permitted).",
      "To operate, secure, analyse, and improve our website.",
      "To comply with applicable legal obligations.",
    ],
  },
  {
    heading: "3. Legal basis / consent",
    text:
      "We process your personal data on the basis of the consent you give when you submit a form, and for the legitimate purposes described above. You may withdraw consent at any time by contacting us (see the Grievance Officer section); withdrawal does not affect processing already carried out.",
    items: [],
  },
  {
    heading: "4. Cookies",
    text:
      "We use essential cookies for site functionality and analytics cookies to measure and improve performance. You can control or disable cookies through your browser settings; some features may not work as intended if disabled.",
    items: [],
  },
  {
    heading: "5. Sharing and disclosure",
    text:
      "We do not sell your personal data. We may share it with trusted service providers (e.g. email, hosting, and analytics providers) strictly to operate our services and under confidentiality obligations, or where required by law, regulation, or valid legal process.",
    items: [],
  },
  {
    heading: "6. Data security",
    text:
      "We follow reasonable security practices and procedures as required under the IT Act and its Rules, including encryption in transit, access controls, and secure hosting, to protect your data against unauthorised access, disclosure, alteration, or loss.",
    items: [],
  },
  {
    heading: "7. Data retention",
    text:
      "We retain personal data only as long as necessary to fulfil the purpose for which it was collected, or as required by applicable law, after which it is securely deleted or anonymised.",
    items: [],
  },
  {
    heading: "8. Your rights",
    text: "Under the DPDP Act, subject to applicable conditions, you have the right to:",
    items: [
      "Access the personal data we hold about you.",
      "Request correction or updating of inaccurate or incomplete data.",
      "Request erasure of your personal data.",
      "Withdraw consent for processing.",
      "Raise a grievance regarding the handling of your data.",
    ],
  },
  {
    heading: "9. Grievance Officer",
    text:
      "In accordance with the Information Technology Act, 2000 and rules made thereunder, the name and contact details of the Grievance Officer are provided below. We aim to acknowledge and resolve complaints within the timelines prescribed by law.",
    items: [
      "Company: CADCAM Automation Systems",
      "Email: sales@cadcamsys.com",
      "Phone: +91 91567 39830",
    ],
  },
  {
    heading: "10. Children’s data",
    text:
      "Our services are intended for businesses and professionals. We do not knowingly collect personal data of children. If you believe a child has provided us data, please contact us and we will delete it.",
    items: [],
  },
  {
    heading: "11. Changes to this policy",
    text:
      "We may update this Privacy Policy from time to time. The latest version will always be available on this page with a revised effective date.",
    items: [],
  },
  {
    heading: "12. Contact us",
    text: "Questions about this policy or your data? Email sales@cadcamsys.com.",
    items: [],
  },
];

export const PRIVACY_DEFAULTS = {
  eyebrow: "Legal",
  heading: "Privacy Policy",
  tagline: "Effective 27 July 2026. How we handle your personal data.",
  sections: PRIVACY_SECTIONS,
};
