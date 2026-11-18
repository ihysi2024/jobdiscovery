import LegalPage, { Contact } from "@/components/LegalPage";

export const metadata = { title: "Privacy policy · aligned" };

const h2 = { fontSize: "20px", margin: "32px 0 8px" } as const;

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="November 18, 2026">
      <p>aligned helps people in New York City find jobs. This page explains what we collect, why, and what you can do about it.</p>

      <h2 style={h2}>What we collect</h2>
      <ul>
        <li><strong>From Google, when you sign in:</strong> your name, email address and profile photo. We don't get your password or access to your Gmail, Drive, calendar or contacts.</li>
        <li><strong>What you give us:</strong> your resume and the details read from it (experience, education, skills), your answers during setup (priorities, trade-offs, the kinds of roles you want), your plan and email preferences.</li>
        <li><strong>What you do in the app:</strong> jobs you like or pass on and why, jobs you track and their status.</li>
      </ul>

      <h2 style={h2}>How we use it</h2>
      <p>Only to run aligned for you: to sign you in, rank jobs against what you told us, show your tracker and plan, and send the emails you choose to receive. We don't sell your information, show you ads, or share it with employers.</p>

      <h2 style={h2}>Where it's kept</h2>
      <p>Your data is stored with Supabase, our database and sign-in provider, and the site is hosted by Vercel. Both process data on our behalf. Job listings come from employers' public career pages, not from you.</p>

      <h2 style={h2}>Your choices</h2>
      <p>You can change your answers in your profile at any time. To get a copy of your data or delete your account and everything in it, email <Contact />. We'll do it within 30 days.</p>

      <h2 style={h2}>Changes</h2>
      <p>If we change this policy we'll update the date above, and tell you in the app if the change is significant.</p>
    </LegalPage>
  );
}
