import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import priceMonitorVideo from "@/assets/videos/snitch-price-monitor-loop.mp4.asset.json";
import priceMonitorWebm from "@/assets/videos/snitch-price-monitor-loop.webm.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Snitch: Competitor, price and news briefs for startups" },
      {
        name: "description",
        content:
          "Snitch watches your competitors, their prices and your niche news, then sends you one clear weekly brief.",
      },
      { property: "og:title", content: "Snitch: Intelligence briefs for startups" },
      {
        property: "og:description",
        content: "Competitor, price and niche news monitoring in one weekly brief. Free to start.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    title: "News Monitor",
    body: "Your niche, written up like a morning paper. Only the stories that matter to your market.",
  },
  {
    title: "Price Monitor",
    body: "Track what similar products cost across your industry, on one simple line chart.",
  },
  {
    title: "Competitor Monitor",
    body: "See who leads your space and a short summary of the moves that got them there.",
  },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pt-20 pb-12 text-center">
          <h1 className="text-5xl leading-tight tracking-tight md:text-7xl">
            Know what your competitors did this week.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Snitch monitors competitors, prices and niche news, then delivers one clear weekly brief.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button asChild size="pill">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Free plan: 1 monitor and weekly briefs. No card required.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5">
          <video
            aria-label="Price Monitor sample showing seven-day prices for Aether Labs, Nexus Soft and Orbit AI"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            width={1600}
            height={912}
            className="w-full rounded-2xl"
          >
            <source src={priceMonitorVideo.url} type="video/mp4" />
            <source src={priceMonitorWebm.url} type="video/webm" />
          </video>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-5 py-20 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-card p-8">
              <h2 className="text-2xl">{f.title}</h2>
              <p className="mt-3 text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-24 text-center">
          <h2 className="text-3xl md:text-4xl">One brief. Every week. Sources included.</h2>
          <p className="mt-4 text-muted-foreground">
            Every brief cites where its information came from. Rankings and strategy summaries are
            clearly marked as AI estimates from public sources.
          </p>
          <Button asChild size="pill" className="mt-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your free account
            </Link>
          </Button>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Snitch. For users aged 18 and over.
      </footer>
    </div>
  );
}
