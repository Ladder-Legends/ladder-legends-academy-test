import { MainNav } from '@/components/main-nav';
import { UserMenu } from '@/components/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Ladder Legends Academy',
  description: 'Privacy policy and data protection information for Ladder Legends Academy',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <Image
                  src="/LL_LOGO.png"
                  alt="Ladder Legends"
                  width={48}
                  height={48}
                  unoptimized
                  className="object-contain"
                  priority
                />
                <h1 className="text-2xl font-bold hidden lg:block">Ladder Legends Academy</h1>
              </Link>

              <MainNav />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
            </div>

            <div className="prose prose-sm sm:prose dark:prose-invert max-w-none space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Introduction</h2>
                <p>
                  Welcome to Ladder Legends Academy. We are committed to protecting your personal data and respecting your privacy. This privacy policy explains how we collect, use, and safeguard your information in compliance with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
                </p>
                <p>
                  Ladder Legends Academy is a StarCraft II coaching platform that provides educational content, live events, and community features. This policy applies to all users of our website and services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Data Controller</h2>
                <p>
                  Ladder Legends Academy is the data controller responsible for your personal data. If you have any questions about this privacy policy or our data practices, please contact us at l4dderlegends@gmail.com.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. Information We Collect</h2>

                <h3 className="text-xl font-semibold">3.1 Information You Provide</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> When you create an account, we collect your username and authentication credentials through our authentication system.</li>
                  <li><strong>Profile Information:</strong> Any information you choose to add to your profile, such as your preferred race or skill level.</li>
                  <li><strong>Communication Data:</strong> Messages and communications you send through our platform or Discord community.</li>
                </ul>

                <h3 className="text-xl font-semibold">3.2 Information Automatically Collected</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited, features accessed, and content viewed.</li>
                  <li><strong>Device Information:</strong> Device type, browser type, IP address, and operating system.</li>
                  <li><strong>Analytics Data:</strong> Behavioral data and interactions collected through PostHog for product analytics and improvement.</li>
                  <li><strong>Authentication Tokens:</strong> Secure tokens stored in your browser to maintain your logged-in session and verify your identity.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Third-Party Services</h2>
                <p>We use the following third-party services to provide and improve our platform:</p>

                <h3 className="text-xl font-semibold">4.1 Vercel (Hosting and CDN)</h3>
                <p>
                  Our website is hosted on Vercel, which provides content delivery network (CDN) services. Vercel may collect technical information such as IP addresses and request data to deliver our website efficiently and securely. For more information, see <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel&apos;s Privacy Policy</a>.
                </p>

                <h3 className="text-xl font-semibold">4.2 Cloudflare</h3>
                <p>
                  We use Cloudflare for security, performance optimization, and DDoS protection. Cloudflare may process IP addresses and other technical data to provide these services. For more information, see <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cloudflare&apos;s Privacy Policy</a>.
                </p>

                <h3 className="text-xl font-semibold">4.3 PostHog (Analytics)</h3>
                <p>
                  We use PostHog for product analytics to understand how users interact with our platform and improve the user experience. PostHog collects usage data, session recordings (when enabled), and behavioral analytics. PostHog is GDPR-compliant and we have configured it to respect user privacy. You can opt out of analytics tracking in your account settings. For more information, see <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PostHog&apos;s Privacy Policy</a>.
                </p>

                <h3 className="text-xl font-semibold">4.4 Mux (Video Hosting)</h3>
                <p>
                  We use Mux to host and deliver video content, including coaching sessions, replays, and masterclasses. Mux processes video viewing data, including playback statistics and quality metrics, to ensure optimal video delivery. For more information, see <a href="https://www.mux.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mux&apos;s Privacy Policy</a>.
                </p>

                <h3 className="text-xl font-semibold">4.5 YouTube</h3>
                <p>
                  Some of our content is embedded from YouTube. When you view YouTube videos on our platform, YouTube may collect data about your viewing behavior according to their privacy policy. YouTube is owned by Google. For more information, see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google&apos;s Privacy Policy</a>.
                </p>

                <h3 className="text-xl font-semibold">4.6 Discord</h3>
                <p>
                  We operate a Discord community server where members can interact with coaches and other players. When you join our Discord server, you are subject to Discord&apos;s Terms of Service and Privacy Policy. We do not control data collected by Discord. For more information, see <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord&apos;s Privacy Policy</a>.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">5. How We Use Your Information</h2>
                <p>We use your personal data for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Provide Services:</strong> To operate our platform, deliver content, and provide access to premium features for subscribers.</li>
                  <li><strong>Authentication:</strong> To verify your identity and maintain secure access to your account using authentication tokens.</li>
                  <li><strong>Personalization:</strong> To customize your experience and recommend relevant content based on your preferences and viewing history.</li>
                  <li><strong>Analytics:</strong> To understand how users interact with our platform and improve our services.</li>
                  <li><strong>Communication:</strong> To send you important updates about our services, events, and new content (with your consent for marketing communications).</li>
                  <li><strong>Security:</strong> To protect our platform from fraud, abuse, and security threats.</li>
                  <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms of service.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">6. Legal Basis for Processing (GDPR)</h2>
                <p>Under the GDPR, we process your personal data based on the following legal grounds:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Contract Performance:</strong> Processing necessary to provide our services and fulfill our contractual obligations to you.</li>
                  <li><strong>Legitimate Interest:</strong> Processing necessary for our legitimate business interests, such as improving our services, preventing fraud, and ensuring platform security.</li>
                  <li><strong>Consent:</strong> Where you have given explicit consent for specific processing activities, such as marketing communications or optional analytics features.</li>
                  <li><strong>Legal Obligation:</strong> Processing required to comply with legal requirements.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">7. Data Retention</h2>
                <p>
                  We retain your personal data only for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law. Specifically:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after account closure to comply with legal obligations.</li>
                  <li><strong>Analytics Data:</strong> Aggregated and anonymized analytics data may be retained indefinitely for statistical purposes.</li>
                  <li><strong>Authentication Tokens:</strong> Session tokens expire automatically and are deleted from our systems when you log out or after a period of inactivity.</li>
                  <li><strong>Video Viewing Data:</strong> Retained for up to 2 years to improve content delivery and recommendations.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">8. Your Rights Under GDPR</h2>
                <p>If you are located in the European Economic Area (EEA), you have the following rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Right of Access:</strong> You can request a copy of the personal data we hold about you.</li>
                  <li><strong>Right to Rectification:</strong> You can request correction of inaccurate or incomplete personal data.</li>
                  <li><strong>Right to Erasure:</strong> You can request deletion of your personal data (subject to certain legal limitations).</li>
                  <li><strong>Right to Restriction:</strong> You can request that we limit how we use your personal data.</li>
                  <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a machine-readable format.</li>
                  <li><strong>Right to Object:</strong> You can object to processing based on legitimate interests or for direct marketing purposes.</li>
                  <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you can withdraw it at any time.</li>
                </ul>
                <p>
                  To exercise any of these rights, please contact us at l4dderlegends@gmail.com. We will respond to your request within 30 days.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">9. International Data Transfers</h2>
                <p>
                  Your personal data may be transferred to and processed in countries outside your country of residence, including the United States, where our service providers (such as Vercel, Mux, and PostHog) operate data centers. These countries may have data protection laws that differ from those in your jurisdiction.
                </p>
                <p>
                  When we transfer personal data outside the EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved by the European Commission, to protect your data in accordance with GDPR requirements.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">10. Cookies and Similar Technologies</h2>
                <p>
                  We use cookies and similar tracking technologies to enhance your experience on our platform. Cookies are small text files stored on your device that help us:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain your login session and authentication state</li>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze site usage and performance</li>
                  <li>Deliver personalized content and recommendations</li>
                </ul>
                <p>
                  You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our platform. For more information about the cookies we use, please see our Cookie Policy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">11. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit using HTTPS/TLS</li>
                  <li>Secure authentication token management</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication requirements for our systems</li>
                  <li>Use of security services from Cloudflare to protect against DDoS attacks and other threats</li>
                </ul>
                <p>
                  However, no method of transmission over the Internet is 100% secure. While we strive to protect your personal data, we cannot guarantee its absolute security.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">12. Children&apos;s Privacy</h2>
                <p>
                  Our services are not directed to individuals under the age of 16. We do not knowingly collect personal data from children under 16. If you become aware that a child has provided us with personal data without parental consent, please contact us and we will take steps to delete such information.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">13. Changes to This Privacy Policy</h2>
                <p>
                  We may update this privacy policy from time to time to reflect changes in our practices, services, or legal requirements. We will notify you of any material changes by posting the updated policy on our website and updating the &quot;Last updated&quot; date. We encourage you to review this policy periodically.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">14. Contact Us</h2>
                <p>
                  If you have any questions, concerns, or requests regarding this privacy policy or our data practices, please contact us at:
                </p>
                <div className="pl-4">
                  <p>Email: l4dderlegends@gmail.com</p>
                  <p>Website: <Link href="/" className="text-primary hover:underline">ladderlegendsacademy.com</Link></p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">15. Supervisory Authority</h2>
                <p>
                  If you are located in the EEA and believe that our processing of your personal data violates data protection laws, you have the right to lodge a complaint with your local data protection supervisory authority. However, we encourage you to contact us first so we can address your concerns directly.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-8 mt-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>© {new Date().getFullYear()} Ladder Legends Academy. All rights reserved.</div>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
