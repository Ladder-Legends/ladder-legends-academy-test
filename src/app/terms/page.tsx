import { Footer } from '@/components/footer';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Ladder Legends Academy',
  description: 'Terms of service for Ladder Legends Academy',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
            </div>

            <div className="prose prose-sm sm:prose dark:prose-invert max-w-none space-y-6">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Ladder Legends Academy (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you accept and agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
                </p>
                <p>
                  We reserve the right to modify these Terms at any time. Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. Description of Service</h2>
                <p>
                  Ladder Legends Academy is an online educational platform that provides StarCraft II coaching content, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Video tutorials and coaching sessions</li>
                  <li>Build order guides and strategies</li>
                  <li>Replay analysis and commentary</li>
                  <li>Live events and tournaments</li>
                  <li>Community features and discussions</li>
                </ul>
                <p>
                  Some content is available for free, while premium content requires an active subscription.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. Account Registration and Security</h2>
                <h3 className="text-xl font-semibold">3.1 Account Creation</h3>
                <p>
                  To access certain features of the Service, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>

                <h3 className="text-xl font-semibold">3.2 Age Requirement</h3>
                <p>
                  You must be at least 16 years old to create an account and use the Service. By using the Service, you represent and warrant that you meet this age requirement.
                </p>

                <h3 className="text-xl font-semibold">3.3 Account Termination</h3>
                <p>
                  We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including violation of these Terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. Subscriptions and Payments</h2>
                <h3 className="text-xl font-semibold">4.1 Subscription Plans</h3>
                <p>
                  Premium content requires an active subscription. Subscription plans and pricing are subject to change with reasonable notice.
                </p>

                <h3 className="text-xl font-semibold">4.2 Billing</h3>
                <p>
                  By subscribing, you authorize us to charge your payment method on a recurring basis according to your chosen subscription plan. Subscriptions automatically renew unless cancelled before the renewal date.
                </p>

                <h3 className="text-xl font-semibold">4.3 Refunds</h3>
                <p>
                  Refunds are handled on a case-by-case basis. Please contact us at l4dderlegends@gmail.com to discuss refund requests.
                </p>

                <h3 className="text-xl font-semibold">4.4 Cancellation</h3>
                <p>
                  You may cancel your subscription at any time. Upon cancellation, you will retain access to premium content until the end of your current billing period.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
                <p>
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any illegal purpose or in violation of any laws</li>
                  <li>Share your account credentials with others or allow others to use your account</li>
                  <li>Download, distribute, or share premium content without authorization</li>
                  <li>Circumvent or attempt to circumvent any security features or access controls</li>
                  <li>Use automated systems or software to extract data from the Service (&quot;scraping&quot;)</li>
                  <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  <li>Transmit any viruses, malware, or other harmful code</li>
                  <li>Harass, abuse, or harm other users or coaches</li>
                  <li>Post or transmit any unlawful, threatening, abusive, defamatory, obscene, or otherwise objectionable content</li>
                  <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">6. Intellectual Property</h2>
                <h3 className="text-xl font-semibold">6.1 Our Content</h3>
                <p>
                  All content on the Service, including videos, text, graphics, logos, and software, is owned by or licensed to Ladder Legends Academy and is protected by copyright, trademark, and other intellectual property laws.
                </p>

                <h3 className="text-xl font-semibold">6.2 License to Use</h3>
                <p>
                  We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for personal, non-commercial purposes. This license does not include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Reselling or making commercial use of the Service or content</li>
                  <li>Downloading or copying content (except as expressly permitted)</li>
                  <li>Modifying, distributing, or creating derivative works</li>
                  <li>Using data mining, robots, or similar data gathering tools</li>
                </ul>

                <h3 className="text-xl font-semibold">6.3 Trademarks</h3>
                <p>
                  &quot;Ladder Legends Academy&quot; and related marks are trademarks of Ladder Legends Academy. StarCraft II and related marks are trademarks of Blizzard Entertainment, Inc. We are not affiliated with, endorsed by, or sponsored by Blizzard Entertainment.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">7. User-Generated Content</h2>
                <h3 className="text-xl font-semibold">7.1 Your Responsibility</h3>
                <p>
                  You are solely responsible for any content you post or transmit through the Service, including comments, messages, and uploaded files. You represent and warrant that you own or have the necessary rights to any content you submit.
                </p>

                <h3 className="text-xl font-semibold">7.2 License to Us</h3>
                <p>
                  By submitting content to the Service, you grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with operating and promoting the Service.
                </p>

                <h3 className="text-xl font-semibold">7.3 Content Moderation</h3>
                <p>
                  We reserve the right to remove any user-generated content that violates these Terms or that we deem inappropriate, without notice.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">8. Privacy</h2>
                <p>
                  Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which explains how we collect, use, and protect your personal information. By using the Service, you consent to our data practices as described in the Privacy Policy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">9. Disclaimers</h2>
                <h3 className="text-xl font-semibold">9.1 No Warranties</h3>
                <p>
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </p>

                <h3 className="text-xl font-semibold">9.2 No Guarantees</h3>
                <p>
                  We do not guarantee that:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>The results obtained from using the Service will be accurate or reliable</li>
                  <li>The quality of any content, products, services, or information obtained through the Service will meet your expectations</li>
                  <li>Any errors in the Service will be corrected</li>
                </ul>

                <h3 className="text-xl font-semibold">9.3 Third-Party Services</h3>
                <p>
                  The Service may contain links to third-party websites or services (such as Discord, YouTube, or social media platforms). We are not responsible for the content, privacy policies, or practices of third-party websites or services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">10. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, LADDER LEGENDS ACADEMY, ITS OFFICERS, DIRECTORS, EMPLOYEES, COACHES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your access to or use of or inability to access or use the Service</li>
                  <li>Any conduct or content of any third party on the Service</li>
                  <li>Any content obtained from the Service</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                </ul>
                <p>
                  IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT PAID BY YOU, IF ANY, FOR ACCESSING THE SERVICE DURING THE TWELVE (12) MONTHS PRIOR TO THE CLAIM.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">11. Indemnification</h2>
                <p>
                  You agree to indemnify, defend, and hold harmless Ladder Legends Academy, its officers, directors, employees, coaches, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use of the Service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any rights of another person or entity</li>
                  <li>Your user-generated content</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">12. Governing Law and Disputes</h2>
                <h3 className="text-xl font-semibold">12.1 Governing Law</h3>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Ladder Legends Academy operates, without regard to its conflict of law provisions.
                </p>

                <h3 className="text-xl font-semibold">12.2 Dispute Resolution</h3>
                <p>
                  Any dispute arising from or relating to these Terms or the Service shall be resolved through good faith negotiations. If negotiations fail, disputes may be resolved through binding arbitration or in the courts of competent jurisdiction.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">13. Termination</h2>
                <p>
                  We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your right to use the Service will immediately cease</li>
                  <li>You will no longer have access to your account or any content in your account</li>
                  <li>We may delete your account and any associated data</li>
                  <li>Provisions that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, and limitations of liability</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">14. General Provisions</h2>
                <h3 className="text-xl font-semibold">14.1 Entire Agreement</h3>
                <p>
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Ladder Legends Academy regarding the Service.
                </p>

                <h3 className="text-xl font-semibold">14.2 Severability</h3>
                <p>
                  If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that the Terms will otherwise remain in full force and effect.
                </p>

                <h3 className="text-xl font-semibold">14.3 Waiver</h3>
                <p>
                  Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>

                <h3 className="text-xl font-semibold">14.4 Assignment</h3>
                <p>
                  You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign these Terms without restriction.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">15. Contact Information</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="pl-4">
                  <p>Email: l4dderlegends@gmail.com</p>
                  <p>Website: <Link href="/" className="text-primary hover:underline">ladderlegendsacademy.com</Link></p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">16. Acknowledgment</h2>
                <p>
                  BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
