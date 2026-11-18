import LegalPage, { Contact } from "@/components/LegalPage";

export const metadata = { title: "Terms of service · aligned" };

const h2 = { fontSize: "20px", margin: "32px 0 8px" } as const;

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="November 18, 2026">
      <p>By using aligned you agree to these terms.</p>

      <h2 style={h2}>The service</h2>
      <p>aligned collects job openings from employers' public career pages and helps you sort, track and plan your search. It's free. We may change or stop features at any time.</p>

      <h2 style={h2}>Job information</h2>
      <p>Listings, pay ranges and interview details come from employers' own postings and can be out of date or wrong. Always check the employer's site before you apply. We aren't the employer, and we aren't part of any hiring decision.</p>

      <h2 style={h2}>Your account</h2>
      <p>Use your own Google account and keep it secure. Don't use aligned to collect other people's information, overload the site, or break the law. We may suspend accounts that do.</p>

      <h2 style={h2}>No guarantees</h2>
      <p>aligned is provided as is. We can't promise it will be error-free or that it will help you get a job, and we aren't liable for decisions you make using it, to the extent the law allows.</p>

      <h2 style={h2}>Contact</h2>
      <p>Questions: <Contact />.</p>
    </LegalPage>
  );
}
