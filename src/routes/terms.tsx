import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions | Snitch" },
      {
        name: "description",
        content: "Terms and Conditions for using the Snitch service.",
      },
      { property: "og:title", content: "Terms and Conditions | Snitch" },
      {
        property: "og:description",
        content: "Terms and Conditions for using the Snitch service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
              Terms and Conditions
            </h1>
            <p className="mt-2 text-sm">Last updated: 9 November 2026</p>
            <p className="mt-4">
              Please read these Terms and Conditions carefully before using
              Snitch.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">1. Interpretation and Definitions</h2>
            <h3 className="text-base text-foreground">Interpretation</h3>
            <p>
              Words with capitalised initial letters have the meanings below. The
              same meaning applies in singular and plural.
            </p>
            <h3 className="text-base text-foreground">Definitions</h3>
            <p>For these Terms and Conditions:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Affiliate</strong> means an
                entity that controls, is controlled by, or is under common
                control with a party, where “control” means ownership of 50% or
                more of shares, equity interest, or other voting securities.
              </li>
              <li>
                <strong className="text-foreground">Account</strong> means a
                unique account created for You to access the Service.
              </li>
              <li>
                <strong className="text-foreground">Company</strong> (referred to
                as either “the Company”, “We”, “Us” or “Our”) refers to the
                operator of Snitch, <strong className="text-foreground">CHAN Jit</strong>,
                based in Hong Kong SAR. Contact:{" "}
                <a
                  className="text-foreground underline-offset-4 hover:underline"
                  href="mailto:chanjisaac@gmail.com"
                >
                  chanjisaac@gmail.com
                </a>
              </li>
              <li>
                <strong className="text-foreground">Content</strong> means text,
                images, data, briefs, monitors, summaries, charts, or other
                information that can be posted, generated, displayed, or
                otherwise made available through the Service, whether created by
                Us, by You, or by automated systems.
              </li>
              <li>
                <strong className="text-foreground">Device</strong> means any
                device that can access the Service, such as a computer, mobile
                phone, or tablet.
              </li>
              <li>
                <strong className="text-foreground">Service</strong> means the
                Snitch website and related applications, including competitor peer
                monitoring, niche news, peer pricing views, competitor activity
                summaries, and daily or other briefs, currently offered at domains
                and hosts We operate (including any custom domain such as
                snitchai.org and any staging or app hosts We designate).
              </li>
              <li>
                <strong className="text-foreground">Subscription</strong> means
                paid access to Premium features of the Service on a recurring
                basis (for example monthly or yearly), if and when payment is
                enabled.
              </li>
              <li>
                <strong className="text-foreground">Terms</strong> means these
                Terms and Conditions.
              </li>
              <li>
                <strong className="text-foreground">Third-Party Services</strong>{" "}
                means external providers used to operate the Service (for example
                hosting, authentication, databases, search, and language-model
                APIs).
              </li>
              <li>
                <strong className="text-foreground">You</strong> means the
                individual accessing or using the Service, or the company or other
                legal entity on behalf of which such individual is accessing or
                using the Service, as applicable.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">2. Acknowledgment</h2>
            <p>
              These Terms govern the use of the Service and form the agreement
              between You and the Company. They set out the rights and obligations
              of all users regarding the Service.
            </p>
            <p>
              Your access to and use of the Service is conditioned on Your
              acceptance of and compliance with these Terms. These Terms apply to
              all visitors, users, and others who access or use the Service.
            </p>
            <p>
              By accessing or using the Service You agree to be bound by these
              Terms. If You disagree with any part of these Terms, You may not
              access the Service.
            </p>
            <p>
              You represent that You are at least 18 years old. The Company does
              not permit those under 18 to use the Service.
            </p>
            <p>
              Your access to and use of the Service is also conditioned on Your
              acceptance of and compliance with Our Privacy Policy. Our Privacy
              Policy describes Our policies and procedures on the collection, use,
              and disclosure of Your personal information and tells You about Your
              privacy rights. Please read Our Privacy Policy before using the
              Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">3. Description of the Service</h2>
            <p>
              Snitch provides software tools intended to help startup founders and
              similar users monitor publicly available information related to
              competitors, niche news, pricing signals, and activity summaries,
              and to generate short briefs and action-oriented text using automated
              systems.
            </p>
            <p>
              The Service may use Third-Party Services to search, extract, store,
              or summarise information. Outputs are{" "}
              <strong className="text-foreground">informational only</strong>.
              They are not legal, financial, investment, or professional advice.
              Public sources can be incomplete, outdated, or wrong. Automated
              summaries can omit context or contain errors. You remain solely
              responsible for decisions You make using the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">4. User Accounts</h2>
            <p>
              When You create an Account, You must provide information that is
              accurate, complete, and current. Failure to do so may result in
              suspension or termination of Your Account.
            </p>
            <p>
              You are responsible for safeguarding the password or credentials You
              use and for any activities or actions under Your Account. You agree
              not to disclose Your password to any third party. You must notify Us
              promptly upon becoming aware of any security breach or unauthorised
              use of Your Account.
            </p>
            <p>
              You may not use as a display name or identifier anything that is
              unlawful, offensive, or impersonates another person or entity.
            </p>
            <p>
              Profile fields used for peer matching (such as industry, product,
              region, scale, and sales volume) may be subject to change limits We
              publish in the product (for example a cooldown period). Abuse of
              onboarding or profile systems may lead to restriction of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">5. Subscriptions and Free Access</h2>
            <p>
              The Service may offer a Free plan and a Premium plan with different
              features (for example access to competitor detail pages, unblurred
              monitors, or brief generation limits). Feature lists on the billing
              page describe the then-current offer and may change.
            </p>
            <p>If paid Subscriptions are enabled:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Fees, billing intervals (for example HK$80 per month or a yearly
                option), taxes, and renewal terms will be shown at checkout and/or
                on the billing page.
              </li>
              <li>
                Payment is processed by a third-party processor (for example
                Stripe). Their terms also apply to payment processing.
              </li>
              <li>
                Unless stated otherwise in a separate Subscription or Refund
                Policy, Subscriptions renew automatically until cancelled in
                accordance with the cancellation method We provide.
              </li>
              <li>You are responsible for providing accurate billing information.</li>
            </ul>
            <p>
              Until live payments are enabled, any “demo” or manually granted
              Premium status is for testing only and does not create a paid
              contract beyond what We expressly state in writing.
            </p>
            <p>
              Further detail may appear in Our Subscription Policy or Refund
              Policy when published. If there is a conflict on billing mechanics,
              the Subscription/Refund Policy and checkout terms control for payment
              matters; these Terms still govern use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">6. Content</h2>
            <h3 className="text-base text-foreground">Your inputs</h3>
            <p>
              You retain rights to the profile and other information You submit.
              You grant Us a worldwide, non-exclusive licence to host, process, and
              use that information solely to operate, secure, improve, and provide
              the Service (including running peer resolution, monitors, and briefs
              for Your Account).
            </p>
            <h3 className="text-base text-foreground">Generated and monitored Content</h3>
            <p>
              Briefs, news digests, pricing charts, activity items, and similar
              outputs are produced or assembled for Your use within the Service. We
              do not claim ownership of public third-party source text. You may use
              outputs for Your internal business purposes. You may not resell the
              Service itself or systematically republish Our non-public product UI,
              prompts, or aggregated feeds as a competing service.
            </p>
            <h3 className="text-base text-foreground">Accuracy</h3>
            <p>
              You agree that Content may be wrong or incomplete and that You will
              not treat it as a sole basis for high-stakes decisions without
              independent verification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">7. Prohibited Uses</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Use the Service in any way that violates applicable law (including
                Hong Kong law) or third-party rights.
              </li>
              <li>
                Attempt to scrape, overload, or reverse engineer the Service except
                as allowed by mandatory law.
              </li>
              <li>Bypass plan limits, rate limits, paywalls, or access controls.</li>
              <li>
                Use the Service to harass, defame, or unlawfully surveil
                individuals.
              </li>
              <li>Submit unlawful, harmful, or infringing material.</li>
              <li>
                Use automated means to create Accounts or extract data at a scale
                that harms the Service or Third-Party Services.
              </li>
              <li>
                Misrepresent the origin of Service outputs as purely human
                professional research if that would mislead a third party in a
                commercial context.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">8. Intellectual Property</h2>
            <p>
              The Service, its original branding, design, software, and
              documentation (excluding Content sourced from third parties and
              excluding Your inputs) are and remain the exclusive property of the
              Company and its licensors.
            </p>
            <p>
              Our trademarks and trade dress may not be used in connection with any
              product or service without Our prior written consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">9. Copyright Policy</h2>
            <p>
              All information generated or summarised in Our Services, including
              but not limited to briefs, pricing charts, competitor information, is
              produced with assistance from generative systems and third-party
              research tools that access public information on the internet
              (including providers such as Exa and Tavily). We do not guarantee that
              all words, phrases, and sentences are wholly original. If text
              resembles publicly available material, that may reflect the nature of
              public sources and automated generation.
            </p>
            <p>
              We respect intellectual property rights. If You believe material
              available through the Service infringes Your copyright under the
              Copyright Ordinance (Cap. 528) or other applicable law, contact Us at{" "}
              <a
                className="text-foreground underline-offset-4 hover:underline"
                href="mailto:chanjisaac@gmail.com"
              >
                chanjisaac@gmail.com
              </a>{" "}
              with: a description of the work, the URL or location of the material,
              Your contact details, and a statement made in good faith that the use
              is not authorised.
            </p>
            <p>
              We may remove or disable access to material and, in appropriate
              circumstances, terminate Accounts of repeat infringers, consistent
              with applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">10. User Feedback</h2>
            <p>
              If You send ideas, suggestions, or feedback, You grant Us the right
              to use them without obligation to compensate You, unless We agree
              otherwise in writing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">11. Links to Other Websites</h2>
            <p>
              The Service may contain links to or data derived from third-party
              websites. We do not control and are not responsible for their
              content, privacy practices, or availability. Accessing third-party
              sites is at Your own risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">12. Termination</h2>
            <p>
              We may suspend or terminate Your access immediately, without prior
              notice, for any breach of these Terms, for abuse of the Service, for
              non-payment (when Subscriptions apply), or where required by law.
            </p>
            <p>
              Upon termination, Your right to use the Service ceases. Provisions
              that by nature should survive (including intellectual property,
              disclaimers, limitation of liability, and governing law) will survive
              termination.
            </p>
            <p>
              You may stop using the Service and, where the product allows, delete
              or request closure of Your Account. Some data may be retained as
              required for legal, security, or backup purposes, as described in the
              Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, the Company and
              its suppliers shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits,
              data, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Your access to, use of, or inability to use the Service;</li>
              <li>
                any conduct or content of any third party on or via the Service;
              </li>
              <li>
                any Content obtained from the Service, including AI-generated or
                automatically summarised material; or
              </li>
              <li>
                unauthorised access, use, or alteration of Your transmissions or
                Content,
              </li>
            </ul>
            <p>
              whether based on warranty, contract, tort (including negligence), or
              any other legal theory, even if We have been advised of the
              possibility of such damages.
            </p>
            <p>
              To the maximum extent permitted by law, Our total liability for any
              claim arising out of or relating to the Service is limited to the
              greater of (a) the amount You paid Us for the Service in the twelve
              (12) months before the claim, or (b) HKD 500 if You have not paid Us.
            </p>
            <p>
              Nothing in these Terms shall limit or exclude the Company’s liability
              for death or personal injury caused by its negligence, fraud,
              fraudulent misrepresentation, or any other liability which cannot be
              limited or excluded by the laws of Hong Kong.
            </p>
            <p>
              Some jurisdictions do not allow certain limitations; in such cases
              Our liability is limited to the fullest extent permitted by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">
              14. “AS IS” and “AS AVAILABLE” Disclaimer
            </h2>
            <p>
              The Service is provided to You{" "}
              <strong className="text-foreground">AS IS</strong> and{" "}
              <strong className="text-foreground">AS AVAILABLE</strong>, with all
              faults and defects, without warranty of any kind. To the maximum
              extent permitted under applicable law, the Company, on its own behalf
              and on behalf of its Affiliates and licensors, expressly disclaims
              all warranties, whether express, implied, statutory, or otherwise,
              including implied warranties of merchantability, fitness for a
              particular purpose, title, and non-infringement, and warranties that
              may arise out of course of dealing or usage of trade.
            </p>
            <p>
              Without limiting the foregoing, We do not warrant that the Service
              will meet Your requirements, achieve any intended results, be
              compatible with other software or systems, operate without
              interruption, meet performance or reliability standards, or be
              error-free, or that any errors can or will be corrected. Especially
              and specifically due to the use of content generated from large
              language models, We do not warrant that all information provided is
              wholly accurate or truthful due to hallucinations of generative
              artificial intelligence. We discourage You from believing or trusting
              all content generated and We declare that it is Your sole
              responsibility to verify all information before acting based upon the
              information.
            </p>
            <p>
              We do not warrant the accuracy, completeness, or usefulness of
              competitor lists, prices, news, activity items, or briefs. Nothing in
              these Terms excludes or limits liability that cannot be excluded or
              limited under applicable Hong Kong law, including (where applicable)
              liability under the Supply of Services (Implied Terms) Ordinance
              (Cap. 457) as against a person dealing as a consumer, or liability
              for death or personal injury caused by negligence under the Control
              of Exemption Clauses Ordinance (Cap. 71).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">15. Governing Law</h2>
            <p>
              These Terms and Your use of the Service are governed by the laws of{" "}
              <strong className="text-foreground">
                Hong Kong Special Administrative Region
              </strong>
              , without regard to conflict-of-law rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">16. Disputes Resolution</h2>
            <p>
              If You have a concern, please contact Us first at{" "}
              <a
                className="text-foreground underline-offset-4 hover:underline"
                href="mailto:chanjisaac@gmail.com"
              >
                chanjisaac@gmail.com
              </a>{" "}
              so We can try to resolve it informally.
            </p>
            <p>
              Subject to mandatory consumer protections that cannot be waived,
              courts of Hong Kong shall have exclusive jurisdiction over disputes
              arising out of or relating to these Terms or the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">17. Severability and Waiver</h2>
            <p>
              If any provision of these Terms is held unenforceable, that provision
              will be modified to the minimum extent necessary or severed, and the
              remaining provisions will continue in full force.
            </p>
            <p>
              A failure to enforce a right under these Terms does not constitute a
              waiver of that or any other right.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">18. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. If a revision
              is material, We will use reasonable efforts to provide notice (for
              example by posting an updated date on this page or by email or
              in-product notice) before the new terms take effect.
            </p>
            <p>
              By continuing to access or use the Service after revisions become
              effective, You agree to the revised terms. If You do not agree, stop
              using the Service and close Your Account as provided in the product.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl text-foreground">19. Contact Us</h2>
            <p>If You have questions about these Terms:</p>
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
              <li>Via the contact method listed on the Service</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
