import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Snitch" },
      {
        name: "description",
        content: "Privacy Policy for the Snitch service.",
      },
      { property: "og:title", content: "Privacy Policy | Snitch" },
      {
        property: "og:description",
        content: "Privacy Policy for the Snitch service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link to="/" className="text-xl tracking-tight">
            Snitch
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <article className="space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
          <div>
            <h1 className="text-3xl tracking-tight text-foreground md:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm">Last updated: 9 November 2026</p>
            <p className="mt-4">
              This Privacy Policy describes Our policies and procedures on the
              collection, use, and disclosure of Your information when You use the
              Service, and tells You about Your privacy rights and how the law
              protects You.
            </p>
            <p>
              We use Your personal data to provide and improve the Service. By
              using the Service, You agree to the collection and use of information
              in accordance with this Privacy Policy. This Policy should be read
              together with Our{" "}
              <Link
                to="/terms"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Terms and Conditions
              </Link>
              .
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">1. Interpretation and Definitions</h2>
            <h3 className="text-base text-foreground">Interpretation</h3>
            <p>
              Words with capitalised initial letters have meanings defined under
              the following conditions. The same meaning applies whether they
              appear in singular or plural.
            </p>
            <h3 className="text-base text-foreground">Definitions</h3>
            <p>For the purposes of this Privacy Policy:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Account</strong> means a unique
                account created for You to access the Service.
              </li>
              <li>
                <strong className="text-foreground">Company</strong> (referred to as
                either “the Company”, “We”, “Us” or “Our”) refers to{" "}
                <strong className="text-foreground">CHAN Jit</strong>, operator of
                Snitch, based in Hong Kong SAR. Contact:{" "}
                <a
                  className="text-foreground underline-offset-4 hover:underline"
                  href="mailto:chanjisaac@gmail.com"
                >
                  chanjisaac@gmail.com
                </a>
                .
              </li>
              <li>
                <strong className="text-foreground">Cookies</strong> means small
                files placed on Your Device by a website, containing details of Your
                browsing history or preferences among other uses.
              </li>
              <li>
                <strong className="text-foreground">Country</strong> refers to Hong
                Kong Special Administrative Region.
              </li>
              <li>
                <strong className="text-foreground">Device</strong> means any device
                that can access the Service, such as a computer, mobile phone, or
                tablet.
              </li>
              <li>
                <strong className="text-foreground">Personal Data</strong> means any
                information relating to an identified or identifiable individual (in
                Hong Kong, often described as personal data under the Personal Data
                (Privacy) Ordinance, Cap. 486).
              </li>
              <li>
                <strong className="text-foreground">Service</strong> means the
                Snitch website and related applications, including competitor peer
                monitoring, niche news, peer pricing views, competitor activity
                summaries, and briefs, offered at domains and hosts We operate.
              </li>
              <li>
                <strong className="text-foreground">Service Provider</strong> means
                any natural or legal person who processes data on behalf of the
                Company (for example hosting, authentication, database, search, or
                language-model providers).
              </li>
              <li>
                <strong className="text-foreground">Usage Data</strong> means data
                collected automatically, generated either by use of the Service or
                from the Service infrastructure itself (for example page visits,
                approximate time on page, or diagnostic logs).
              </li>
              <li>
                <strong className="text-foreground">You</strong> means the
                individual accessing or using the Service, or the company or other
                legal entity on behalf of which that individual is accessing or
                using the Service, as applicable.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">
              2. Collecting and Using Your Personal Data
            </h2>
            <h3 className="text-base text-foreground">Types of Data Collected</h3>
            <h3 className="text-base text-foreground">Personal Data</h3>
            <p>
              While using Our Service, We may ask You to provide certain personally
              identifiable information that can be used to contact or identify You.
              This may include, but is not limited to:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Email address</li>
              <li>Display name (optional)</li>
              <li>
                Account authentication data (for example password hashes managed by
                Our authentication provider; We do not store Your plain-text
                password)
              </li>
              <li>
                Date of birth (used only to verify that You are 18 or older at
                sign-up; We aim not to retain the full date longer than needed for
                that check, and may keep only an adult/yes flag)
              </li>
              <li>
                Company profile fields You submit for the Service, such as industry,
                product or service description, region, company scale, and
                approximate sales volume
              </li>
              <li>
                Billing-related information if paid Subscriptions are enabled
                (payment card details are typically processed by a payment processor
                such as Stripe and are not stored in full on Our servers)
              </li>
              <li>Communications You send Us (for example support emails)</li>
            </ul>
            <h3 className="text-base text-foreground">Usage Data</h3>
            <p>
              Usage Data is collected automatically when using the Service. Usage
              Data may include:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Internet Protocol (IP) address</li>
              <li>Browser type and version</li>
              <li>Pages of Our Service that You visit</li>
              <li>Time and date of Your visit</li>
              <li>Time spent on those pages</li>
              <li>Unique device or session identifiers</li>
              <li>Diagnostic data when an error occurs</li>
            </ul>
            <h3 className="text-base text-foreground">
              Information from Your use of product features
            </h3>
            <p>
              To operate Snitch We process data tied to Your Account, which may
              include:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Onboarding and profile answers used to resolve competitor peers
              </li>
              <li>
                Competitor peer lists and related metadata stored for Your Account
              </li>
              <li>
                Niche news, peer pricing observations, competitor activity items,
                summaries, and daily briefs associated with Your Account
              </li>
              <li>
                Plan status (for example Free or Premium) and related timestamps
              </li>
              <li>
                Rate-limit or generation-limit records needed to operate fair use
                controls
              </li>
            </ul>
            <p>
              Public information retrieved about third-party companies (for example
              from public websites via research tools) is processed to provide the
              Service to You. That public information is not “Your” personal data,
              but it is stored in connection with Your Account.
            </p>
            <h3 className="text-base text-foreground">
              Cookies and similar technologies
            </h3>
            <p>
              We may use Cookies and similar tracking technologies to track activity
              on Our Service and store certain information. Technologies used may
              include:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Essential / session cookies</strong>{" "}
                — required for sign-in, security, and core functionality
              </li>
              <li>
                <strong className="text-foreground">Preference cookies</strong> — for
                example appearance settings You choose
              </li>
              <li>
                <strong className="text-foreground">Analytics cookies</strong> (if
                enabled) — to understand how the Service is used
              </li>
            </ul>
            <p>
              You can instruct Your browser to refuse Cookies. If You refuse
              essential Cookies, some parts of the Service may not work. Where We
              use a cookie banner, You can manage non-essential preferences there
              when available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">3. Use of Your Personal Data</h2>
            <p>
              The Company may use Personal Data for the following purposes:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                To provide and maintain the Service, including monitoring usage and
                operating monitors, briefs, and peer resolution
              </li>
              <li>To manage Your Account and registration as a user</li>
              <li>
                To perform a contract, including Subscriptions when payment is
                enabled
              </li>
              <li>
                To contact You regarding updates, security notices, or
                Service-related messages
              </li>
              <li>
                To provide news or offers about the Service only if You have opted
                in or where permitted by law
              </li>
              <li>To manage Your requests to Us</li>
              <li>
                For security, fraud prevention, and abuse prevention (including rate
                limits and bot protection)
              </li>
              <li>
                For business transfers (for example merger or sale of assets)
              </li>
              <li>
                For other purposes with Your consent, or as required or permitted by
                law
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">4. Sharing of Your Personal Data</h2>
            <p>We may share Personal Data in the following situations:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">With Service Providers</strong> —
                to operate hosting, authentication, databases, email, payments,
                search, and language-model features (examples of categories: cloud
                hosting and database such as Supabase; payment processors such as
                Stripe when enabled; research/search APIs such as Exa or Tavily; LLM
                providers such as those accessed via OpenRouter or similar). These
                providers process data under their own terms and privacy policies.
              </li>
              <li>
                <strong className="text-foreground">For business transfers</strong> —
                in connection with any merger, sale of Company assets, financing, or
                acquisition
              </li>
              <li>
                <strong className="text-foreground">With Your consent</strong> — for
                any other purpose We disclose to You
              </li>
              <li>
                <strong className="text-foreground">For legal reasons</strong> — if
                required to comply with law, regulation, legal process, or
                governmental request, or to protect rights, property, or safety
              </li>
            </ul>
            <p>
              We do <strong className="text-foreground">not</strong> sell Your
              Personal Data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">5. Retention of Your Personal Data</h2>
            <p>
              We retain Personal Data only for as long as necessary for the purposes
              set out in this Privacy Policy, including to satisfy legal,
              accounting, or reporting requirements.
            </p>
            <p>
              Account data is generally kept while Your Account remains active.
              After deletion or closure requests, We may retain limited information
              where required for legitimate business or legal purposes (for example
              security logs, dispute records, or backup copies for a limited
              period).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">6. Transfer of Your Personal Data</h2>
            <p>
              Your information, including Personal Data, may be processed on servers
              or by Service Providers located outside Hong Kong (for example in
              other regions where cloud or AI providers operate).
            </p>
            <p>
              Your consent to this Privacy Policy followed by submission of such
              information represents Your agreement to that transfer, where consent
              is the relevant basis. We take reasonable steps so that Your data is
              treated securely and in accordance with this Privacy Policy, subject
              to the safeguards available from Our providers and applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">7. Delete / access Your Personal Data</h2>
            <p>
              You may update certain profile information in Settings. You may
              request access to, correction of, or deletion of Personal Data We hold
              about You, subject to exceptions under Hong Kong law (including the
              Personal Data (Privacy) Ordinance, Cap. 486).
            </p>
            <p>
              To make a request, contact{" "}
              <a
                className="text-foreground underline-offset-4 hover:underline"
                href="mailto:chanjisaac@gmail.com"
              >
                chanjisaac@gmail.com
              </a>
              . We may need to verify Your identity. Account deletion features in
              the product may be limited; full deletion may require Our manual
              assistance until automated deletion is fully available.
            </p>
            <p>
              Please note that We may need to retain certain information where We
              have a legal obligation or lawful basis to do so.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">8. Security of Your Personal Data</h2>
            <p>
              The security of Your Personal Data is important to Us. We use
              commercially reasonable administrative, technical, and organisational
              measures (for example encrypted transport, authenticated access, and
              access controls on databases). However, no method of transmission over
              the Internet or electronic storage is 100% secure. We cannot guarantee
              absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">9. Service is for adults only</h2>
            <p>
              The Service is intended only for users aged{" "}
              <strong className="text-foreground">18 and over</strong>, as stated in
              Our Terms and Conditions. We do not knowingly collect Personal Data
              from individuals under 18. If You believe We have collected data from
              someone under 18, contact Us and We will take appropriate steps to
              delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">10. Links to Other Websites</h2>
            <p>
              Our Service may contain links to other websites not operated by Us. We
              strongly advise You to review the Privacy Policy of every site You
              visit. We have no control over and assume no responsibility for the
              content, privacy policies, or practices of any third-party sites or
              services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">11. Changes to this Privacy Policy</h2>
            <p>
              We may update Our Privacy Policy from time to time. We will post the
              new Privacy Policy on this page and update the “Last updated” date.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically. Changes
              are effective when posted on this page, unless We state otherwise or
              applicable law requires additional notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">12. Contact Us</h2>
            <p>
              If You have questions about this Privacy Policy or wish to exercise
              privacy rights:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                By email:{" "}
                <a
                  className="text-foreground underline-offset-4 hover:underline"
                  href="mailto:chanjisaac@gmail.com"
                >
                  chanjisaac@gmail.com
                </a>
              </li>
              <li>Via any contact method listed on the Service</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
