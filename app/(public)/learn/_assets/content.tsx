import type { JSX } from "react";
import Image, { StaticImageData } from "next/image";
import marcImg from "@/app/(public)/learn/_assets/images/authors/marc.png";
import mattImg from "@/app/(public)/learn/_assets/images/authors/matt-martins.png";
import introducingSupabaseImg from "@/public/learn/introducing-supabase/header.png";
import pricingImg from "@/public/learn/how-to-price-your-projects/header.png";
import sayNoImg from "@/public/learn/when-to-say-no-to-a-client/header.png";
import boundariesImg from "@/public/learn/set-boundaries-before-the-project-starts/header.png";
import proposalsImg from "@/public/learn/how-salt-drafts-proposals-and-followups/header.png";
import readsBusinessImg from "@/public/learn/salt-reads-your-business/header.png";
import partnerImg from "@/public/learn/from-hired-hand-to-trusted-partner/header.png";
import proactiveAiImg from "@/public/learn/what-is-proactive-ai/header.png";
import proactiveVsReactiveImg from "@/public/learn/proactive-ai-vs-reactive-ai/header.png";
import howProactiveImg from "@/public/learn/how-proactive-ai-automates-operations/header.png";
import proactiveAiExamplesImg from "@/public/learn/proactive-ai-examples-business/header.png";
import bestAiToolsImg from "@/public/learn/best-ai-tools-small-business/header.png";
import whatCanProactiveAiDoImg from "@/public/learn/what-can-proactive-ai-do/header.png";
import futureProactiveAiTrendsImg from "@/public/learn/future-of-proactive-ai-trends/header.png";
import proactiveAiVsChatbotImg from "@/public/learn/proactive-ai-vs-chatbot/header.png";
import saltVsLindyImg from "@/public/learn/salt-vs-lindy/header.png";
import saltVsViktorImg from "@/public/learn/salt-vs-viktor/header.png";
import saltVsChatgptImg from "@/public/learn/salt-vs-chatgpt/header.png";
import saltVsHiringAVaImg from "@/public/learn/salt-vs-hiring-a-va/header.png";
import saltAlternativesImg from "@/public/learn/salt-alternatives/header.png";
import saltPricingImg from "@/public/learn/salt-pricing/header.png";
import { COMPARE_ARTICLE_SLUGS } from "@/app/_features/marketing/compare/compare-slugs";

// ==================================================================================================================================================================
// BLOG CATEGORIES 🏷️
// ==================================================================================================================================================================

export type categoryType = {
  slug: string;
  title: string;
  titleShort?: string;
  description: string;
  descriptionShort?: string;
};

const categorySlugs: { [key: string]: string } = {
  feature: "feature",
  tutorial: "tutorial",
  business: "business",
};

export const categories: categoryType[] = [
  {
    slug: categorySlugs.feature,
    title: "New Features",
    titleShort: "Features",
    description:
      "Here are the latest features we've added to Salt. I'm constantly improving our product to help you ship faster.",
    descriptionShort: "Latest features added to Salt.",
  },
  {
    slug: categorySlugs.tutorial,
    title: "How Tos & Tutorials",
    titleShort: "Tutorials",
    description:
      "Learn how to use Salt with these step-by-step tutorials. I'll show you how to ship faster and save time.",
    descriptionShort:
      "Learn how to use Salt with these step-by-step tutorials.",
  },
  {
    slug: categorySlugs.business,
    title: "Business",
    titleShort: "Business",
    description:
      "Practical advice on running your independent practice — pricing, clients, scope, and the business side of being an independent professional.",
    descriptionShort: "Business strategy for independent professionals.",
  },
];

// ==================================================================================================================================================================
// BLOG AUTHORS 📝
// ==================================================================================================================================================================

export type authorType = {
  slug: string;
  name: string;
  job: string;
  description: string;
  avatar: StaticImageData | string;
  socials?: {
    name: string;
    icon: JSX.Element;
    url: string;
  }[];
};

const socialIcons: {
  [key: string]: {
    name: string;
    svg: JSX.Element;
  };
} = {
  twitter: {
    name: "Twitter",
    svg: (
      <svg
        version="1.1"
        id="svg5"
        x="0px"
        y="0px"
        viewBox="0 0 1668.56 1221.19"
        className="w-9 h-9"
      >
        <g id="layer1" transform="translate(52.390088,-25.058597)">
          <path
            id="path1009"
            d="M283.94,167.31l386.39,516.64L281.5,1104h87.51l340.42-367.76L984.48,1104h297.8L874.15,558.3l361.92-390.99   h-87.51l-313.51,338.7l-253.31-338.7H283.94z M412.63,231.77h136.81l604.13,807.76h-136.81L412.63,231.77z"
          />
        </g>
      </svg>
    ),
  },
  linkedin: {
    name: "LinkedIn",
    svg: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
      </svg>
    ),
  },
  github: {
    name: "GitHub",
    svg: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
};

const authorSlugs: {
  [key: string]: string;
} = {
  marc: "marc",
  matt: "matt",
};

export const authors: authorType[] = [
  {
    slug: authorSlugs.marc,
    name: "Salt Team",
    job: "Building the studio OS",
    description:
      "The Salt team is building the operating system for designer-developers who want to run studios, not stay freelancers.",
    avatar: marcImg,
    socials: [
      {
        name: socialIcons.twitter.name,
        icon: socialIcons.twitter.svg,
        url: "https://x.com/usesalt.io",
      },
      {
        name: socialIcons.github.name,
        icon: socialIcons.github.svg,
        url: "https://github.com/usesalt",
      },
    ],
  },
  {
    slug: authorSlugs.matt,
    name: "Matt Martins",
    job: "CMO at Salt",
    description:
      "Matt Martins is the CMO at Salt, focused on helping independent professionals understand how proactive AI transforms business operations.",
    avatar: mattImg,
    socials: [
      {
        name: socialIcons.linkedin.name,
        icon: socialIcons.linkedin.svg,
        url: "https://linkedin.com/company/usesalt",
      },
      {
        name: socialIcons.twitter.name,
        icon: socialIcons.twitter.svg,
        url: "https://x.com/usesalt.io",
      },
    ],
  },
];

// ==================================================================================================================================================================
// BLOG ARTICLES 📚
// ==================================================================================================================================================================

export type articleType = {
  slug: string;
  title: string;
  description: string;
  categories: categoryType[];
  author: authorType;
  publishedAt: string;
  image: {
    src?: StaticImageData;
    urlRelative: string;
    alt: string;
  };
  content: JSX.Element;
};

const styles: {
  [key: string]: string;
} = {
  h2: "text-2xl lg:text-4xl font-bold tracking-tight mb-4 text-foreground",
  h3: "text-xl lg:text-2xl font-bold tracking-tight mb-2 text-foreground",
  p: "text-foreground leading-relaxed",
  ul: "list-inside list-disc text-foreground leading-relaxed",
  li: "list-item",
  code: "text-sm font-mono bg-neutral text-neutral-content p-6 rounded-lg my-4 overflow-x-scroll select-all",
  codeInline:
    "text-sm font-mono bg-muted px-1 py-0.5 rounded-lg select-all",
};

const allArticles: articleType[] = [
  // ================================================================================================================
  // ARTICLE 1: Introducing Supabase (existing)
  // ================================================================================================================
  {
    slug: "introducing-supabase",
    title: "Introducing Supabase to Salt",
    description:
      "Supabase is an open-source Firebase alternative. It's a great tool for building a backend for your app. It's now integrated with Salt!",
    categories: [
      categories.find((category) => category.slug === categorySlugs.feature)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2023-11-20",
    image: {
      src: introducingSupabaseImg,
      urlRelative: "/learn/introducing-supabase/header.png",
      alt: "Supabase and Salt logo combined",
    },
    content: (
      <>
        <Image
          src={introducingSupabaseImg}
          alt="Supabase and Salt logo combined"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Introduction</h2>
          <p className={styles.p}>
            Supabase is an open-source Firebase alternative. It&apos;s a great
            tool for building a backend for your app. It&apos;s now integrated
            with Salt!
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>1. Create a supabase account</h3>
          <p className={styles.p}>
            First, go to{" "}
            <a href="https://supabase.com/" className="link link-primary">
              Supabase
            </a>{" "}
            and create an account. It&apos;s free for up to 10,000 rows per
            table.
            <br />
            Then create a new project and a new table.
          </p>
          <pre className={styles.code}>
            <code>{`CREATE TABLE public.users (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email text NOT NULL,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);`}</code>
          </pre>
        </section>
        <section>
          <h3 className={styles.h3}>2. Add your credentials to Salt</h3>
          <p className={styles.p}>
            Copy the <span className={styles.codeInline}>API URL</span> and{" "}
            <span className={styles.codeInline}>API Key</span> from your
            Supabase project settings and add them to your Salt project
            settings.
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>.env.local</li>
            <li className={styles.li}>.env.production</li>
          </ul>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 2: How to Price Your Projects
  // ================================================================================================================
  {
    slug: "how-to-price-your-projects",
    title: "How to Price Your Projects for What They're Worth",
    description:
      "Stop quoting hourly rates. Learn how to tie your pricing to outcomes, charge what you're worth, and land $10k+ projects consistently.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-05-15",
    image: {
      src: pricingImg,
      urlRelative: "/learn/how-to-price-your-projects/header.png",
      alt: "How to price your projects for what they're worth",
    },
    content: (
      <>
        <Image
          src={pricingImg}
          alt="Price your projects for what they're worth"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            You quoted an hourly rate again, didn&apos;t you?
          </p>
          <p className={styles.p}>
            I get why. Hourly pricing feels safe. It&apos;s what clients
            expect. It&apos;s what everyone else does. And it&apos;s the fastest
            way to cap your income at whatever number you can bill in a year.
          </p>
          <p className={styles.p}>
            Here&apos;s the truth nobody tells you:{" "}
            <strong>hourly rates reward inefficiency.</strong> The faster you
            get, the less you make. Every system you build, every template you
            create, every shortcut you discover actually hurts your bottom line.
            That&apos;s broken.
          </p>
          <p className={styles.p}>
            The independent professionals who consistently land $10k+ projects
            don&apos;t sell hours. They sell outcomes. They price based on the
            value their work creates, not the time it takes to create it.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Stop Selling Your Time</h2>
          <p className={styles.p}>
            When you quote an hourly rate, you&apos;re asking a client to bet
            on your <em>inputs</em>. They&apos;re paying for the privilege of
            watching you think. That&apos;s a terrible deal for them and a worse
            one for you.
          </p>
          <p className={styles.p}>
            Think about what actually happens on a $10k project. You spend maybe
            40 hours on it. At $250/hour, that&apos;s $10k. But what if you
            could do it in 20 hours because you&apos;ve done it before? Now
            you&apos;re making $500/hour. Good for you. But the client is
            paying the same $10k either way.
          </p>
          <p className={styles.p}>
            The real value isn&apos;t your time. It&apos;s your judgment. Your
            pattern recognition. The fact that you&apos;ve solved this exact
            problem seven times before and know which approaches won&apos;t
            work. That experience doesn&apos;t show up on a timesheet.
          </p>
          <p className={styles.p}>
            <strong>Price the outcome, not the hours.</strong> When a client
            asks for your rate, redirect: &quot;Based on what you need, this
            project is $12,000.&quot; If they push back on hours, hold your
            ground. You&apos;re not selling time. You&apos;re selling a result.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The $3k to $10k+ Transformation</h2>
          <p className={styles.p}>
            Most independent professionals get stuck at $3k projects because
            they&apos;re pricing for the wrong audience. At $3k, you attract
            clients who treat you like a vendor. They compare you to the lowest
            bid. They haggle. They scope-creep because they feel like
            they&apos;re &quot;buying hours.&quot;
          </p>
          <p className={styles.p}>
            At $10k+, you attract clients who treat you like a partner. They
            want your expertise. They value your opinion. When you say
            &quot;this will take longer than expected,&quot; they ask what you
            need. They don&apos;t pull out a stopwatch.
          </p>
          <p className={styles.p}>
            How do you make the jump? You stop asking &quot;what&apos;s the
            market rate&quot; and start asking &quot;what&apos;s the value of
            this result.&quot; If your work helps a client land a $500k
            contract, you&apos;re not overcharging at $25k. You&apos;re
            undercharging. Price is relative to value delivered, not effort
            expended.
          </p>
          <p className={styles.p}>
            The math that matters: if you close three $15k projects a month,
            you&apos;re grossing $45k/month. That&apos;s $540k/year. You only
            need three clients a month. Do you really need fifty $3k projects
            to feel busy? No. You need better pricing.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How to Quote Without Second-Guessing</h2>
          <p className={styles.p}>
            The hardest part of value-based pricing isn&apos;t the logic.
            It&apos;s the stomach. You know the right number. Then you sit in
            front of a client and your brain convinces you to cut it in half.
          </p>
          <p className={styles.p}>
            Stop guessing. Use your own data. Pull up your last five similar
            projects. How long did each actually take? What problems did you
            solve? What would have happened if you hadn&apos;t been there? Did
            you prevent a $50k mistake? That&apos;s your anchor.
          </p>
          <p className={styles.p}>
            Once you have that number, add 30 percent. You&apos;re better now
            than you were on those last five projects. You&apos;re faster. You
            see problems coming. And you&apos;re pricing for the outcome, not
            the baseline.
          </p>
          <p className={styles.p}>
            This is where Salt shows its real value. Salt&apos;s project history
            surfaces exactly this data: what you charged, what you delivered,
            what it actually took. No more guessing from memory. No more
            anchoring on that one project you underbid three years ago. Your
            past pricing decisions become a dataset, not a trauma.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>When They Push Back</h2>
          <p className={styles.p}>
            Clients will push back on price. That&apos;s fine. Pushback is not
            a rejection. It&apos;s a negotiation. And the way you handle it
            determines whether you&apos;re treated like a commodity or a
            specialist.
          </p>
          <p className={styles.p}>
            When a client says &quot;that&apos;s more than I expected,&quot;
            don&apos;t drop your price. Instead, ask: &quot;What were you
            expecting?&quot; Then listen. Sometimes they&apos;re just gathering
            information. Rarely is the problem that you&apos;re overpriced.
          </p>
          <p className={styles.p}>
            If you do need to adjust, adjust scope, not rate. &quot;I can do
            this for $8k instead of $12k, but we&apos;ll cut the analytics
            phase. Here&apos;s what you&apos;d miss.&quot; Now you&apos;ve
            repositioned the conversation around value, not hours.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Let Your History Do the Talking</h2>
          <p className={styles.p}>
            You don&apos;t need to invent pricing from scratch every time. You
            need a system that shows you what works, so you can stop
            second-guessing and start closing.
          </p>
          <p className={styles.p}>
            Salt captures everything: deal size, project type, timeline,
            outcome. Over time, that data becomes your pricing playbook.
            You&apos;ll see exactly which project profiles command $15k and
            which ones cap at $6k. You&apos;ll stop leaving money on the table
            because your own history already told you the right number.
          </p>
          <p className={styles.p}>
            The transformation from $3k to $10k+ doesn&apos;t require a better
            sales script. It requires better data and the confidence to act on
            it. Salt gives you the data. The confidence is yours.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 3: When to Say No to a Client
  // ================================================================================================================
  {
    slug: "when-to-say-no-to-a-client",
    title: "When to Say No to a Client Project",
    description:
      "Not every project is worth your time. Learn how to spot red flags before you commit and build a qualification system that protects your business.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-05-22",
    image: {
      src: sayNoImg,
      urlRelative: "/learn/when-to-say-no-to-a-client/header.png",
      alt: "When to say no to a client project",
    },
    content: (
      <>
        <Image
          src={sayNoImg}
          alt="When to say no to a client project"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            Every independent professional I know has that one project they
            regret taking. The client who never respected boundaries. The scope
            that grew like a monster. The check that arrived two months late
            with a note about &quot;cash flow issues.&quot;
          </p>
          <p className={styles.p}>
            You took it because you needed the money. Or because saying no felt
            rude. Or because you convinced yourself &quot;it&apos;ll be
            different this time.&quot;
          </p>
          <p className={styles.p}>
            It won&apos;t. And the cost of a bad project isn&apos;t just the
            stress. It&apos;s the opportunity cost of the good projects you
            couldn&apos;t take because you were buried in a nightmare.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Three Warning Signs You Can&apos;t Ignore</h2>
          <p className={styles.p}>
            Some red flags are obvious. The client who questions your rates in
            the first conversation. The one who says &quot;this should be
            simple&quot; about something that never is. The prospect who CCs
            three stakeholders on the first email, none of whom have clear
            roles.
          </p>
          <p className={styles.p}>
            <strong>First, the value gap.</strong> If a client doesn&apos;t
            understand what you do well enough to describe why they need you,
            run. You&apos;ll spend half the project educating them.
          </p>
          <p className={styles.p}>
            <strong>Second, the urgency trap.</strong> &quot;We need this done
            by next week.&quot; Every time. If everything is urgent, nothing
            is. A client who can&apos;t distinguish between actual deadlines
            and their own lack of planning will make their chaos your problem.
          </p>
          <p className={styles.p}>
            <strong>Third, the price haggler.</strong> Someone who negotiates
            your rate before they know your value isn&apos;t negotiating.
            They&apos;re telling you they don&apos;t trust you yet. Move on.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>A Practical Qualification Framework</h2>
          <p className={styles.p}>
            Stop relying on gut feel. Build a qualification system and use it
            before every proposal. Ask yourself five questions:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>
              <strong>Does this match my zone of genius?</strong> If you
              could do it in your sleep, great. If you&apos;d be learning on
              the client&apos;s dime, pass.
            </li>
            <li className={styles.li}>
              <strong>Does the budget match the outcome?</strong> If they want
              Coca-Cola results on a lemonade-stand budget, you already know
              how this ends.
            </li>
            <li className={styles.li}>
              <strong>Is the timeline realistic?</strong> Fast is fine if
              they&apos;re paying a premium. Fast and cheap is a trap.
            </li>
            <li className={styles.li}>
              <strong>Do I like the people?</strong> If the chemistry is off
              in the first call, it won&apos;t improve under deadline
              pressure.
            </li>
            <li className={styles.li}>
              <strong>What&apos;s the exit risk?</strong> Can they fire you
              halfway through and leave you with incomplete work? Structure
              the deal differently or walk.
            </li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>How to Disengage Gracefully</h2>
          <p className={styles.p}>
            Saying no doesn&apos;t mean burning bridges. Most bad-fit clients
            aren&apos;t bad people. They&apos;re just wrong for you. A
            professional no leaves the door open for the right project down
            the road.
          </p>
          <p className={styles.p}>
            &quot;I appreciate you thinking of me for this. After reviewing
            the scope and timeline, I don&apos;t think I&apos;m the right fit
            for what you need right now. I want you to get the result you
            deserve, and I&apos;d rather point you to someone who can do that
            than take a project I can&apos;t fully own.&quot;
          </p>
          <p className={styles.p}>
            Notice what this does. It takes responsibility. It shows care for
            their outcome. It leaves the door open without committing to
            anything.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Let Your Network Surface the Patterns</h2>
          <p className={styles.p}>
            Here&apos;s what most independent professionals miss: the red
            flags that kill one project are the same red flags that killed
            your last one. But we treat every client like a blank slate.
          </p>
          <p className={styles.p}>
            Salt&apos;s connection intelligence changes that. It surfaces the
            relationship patterns you&apos;d otherwise miss. The client who
            pays slow. The prospect who ghosted after three rounds of
            proposals. Salt shows you who you&apos;re dealing with before you
            commit.
          </p>
          <p className={styles.p}>
            That memory is worth more than any single project. Because the
            best project you&apos;ll ever take is the one you have capacity
            for because you said no to the wrong one first.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 4: Set Boundaries Before the Project Starts
  // ================================================================================================================
  {
    slug: "set-boundaries-before-the-project-starts",
    title: "Set Boundaries Before the Project Starts",
    description:
      '"Can we make one small change" has cost independent professionals thousands. Learn how to define scope upfront and protect your margins.',
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-06-01",
    image: {
      src: boundariesImg,
      urlRelative: "/learn/set-boundaries-before-the-project-starts/header.png",
      alt: "Set boundaries before the project starts",
    },
    content: (
      <>
        <Image
          src={boundariesImg}
          alt="Set boundaries before the project starts"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            &quot;Can we make one small change.&quot;
          </p>
          <p className={styles.p}>
            If you&apos;ve been an independent professional for more than six
            months, those five words still make your jaw tighten. That
            &quot;small change&quot; becomes a new deliverable. Then another.
            Before you know it, you&apos;ve done forty percent more work for
            the same price.
          </p>
          <p className={styles.p}>
            This isn&apos;t about difficult clients. It&apos;s about a missing
            conversation the one that happens <em>before</em> the project
            starts, not during it.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Define the Deliverable, Not the Time</h2>
          <p className={styles.p}>
            Most independent professionals scope projects in hours. &quot;I
            think this will take about forty hours, so I&apos;ll quote
            $4,000.&quot; That&apos;s a trap. Hours measure input, not
            outcome. The client doesn&apos;t care how many hours you work.
            They care what they get.
          </p>
          <p className={styles.p}>
            Scope by deliverable instead. Name the thing you will hand over.
            Be specific.
          </p>
          <p className={styles.p}>
            When you define the deliverable specifically, you give yourself a
            test. When the client asks for &quot;one more page,&quot; you can
            point to the agreement and say, &quot;That&apos;s outside
            scope.&quot; Not defensive. Just factual.
          </p>
          <p className={styles.p}>
            The number that matters: independents who scope by deliverable
            rather than hours report project sizes averaging $10k+ compared to
            $3k for those who sell time. The work isn&apos;t different. The
            framing is.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Set Revision Limits Up Front</h2>
          <p className={styles.p}>
            The second biggest scope leak is unlimited revisions. &quot;I want
            to make sure you&apos;re happy&quot; sounds generous. In practice,
            it means the client can request changes indefinitely while you
            keep working for free.
          </p>
          <p className={styles.p}>
            Revision limits aren&apos;t adversarial. They&apos;re a forcing
            function for decision-making. When a client knows they get three
            revision rounds, they consolidate feedback. They prioritize.
          </p>
          <p className={styles.p}>
            The transformation: professionals who set explicit revision limits
            see 60% of projects close on the first revision round. The ones
            who don&apos;t average four to seven rounds. That&apos;s weeks of
            unpaid work.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Write the Scope Like a Contract</h2>
          <p className={styles.p}>
            Your proposal&apos;s scope section isn&apos;t marketing copy.
            It&apos;s the document you&apos;ll both refer to when things get
            fuzzy. Three sentences that belong in every scope of work:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>
              <strong>The inclusion sentence:</strong> &quot;This project
              includes [specific list].&quot;
            </li>
            <li className={styles.li}>
              <strong>The exclusion sentence:</strong> &quot;This project does
              not include [specific list].&quot;
            </li>
            <li className={styles.li}>
              <strong>The drift sentence:</strong> &quot;Any work outside the
              items above will be scoped as a separate engagement.&quot;
            </li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>Let Salt Watch the Edges</h2>
          <p className={styles.p}>
            Here&apos;s the hard truth: even with perfect boundaries, scope
            drift happens. You miss it because you&apos;re heads-down doing
            the work. The client sends a Slack message. You reply yes. You
            forget you just agreed to something outside scope.
          </p>
          <p className={styles.p}>
            Salt surfaces that for you. When your project scope is defined in
            Salt, Salt tracks every request against that scope. When a client
            asks for something outside the agreement, Salt flags it. Not as a
            confrontation. As a data point.
          </p>
          <p className={styles.p}>
            The professionals who use Salt&apos;s scope tracking catch drift
            an average of two weeks earlier than those who don&apos;t. Two
            weeks of work they don&apos;t give away for free. Over a year of
            projects, that&apos;s real money.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 5: How Salt Drafts Proposals and Follow-Ups
  // ================================================================================================================
  {
    slug: "how-salt-drafts-proposals-and-followups",
    title: "How Salt Drafts Your Proposals and Follow-Ups",
    description:
      "See how Salt reads your business and prepares the work you'd otherwise spend hours creating. Proposals, follow-ups, and more ready for your approval.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.tutorial)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-06-10",
    image: {
      src: proposalsImg,
      urlRelative: "/learn/how-salt-drafts-proposals-and-followups/header.png",
      alt: "How Salt drafts your proposals and follow-ups",
    },
    content: (
      <>
        <Image
          src={proposalsImg}
          alt="How Salt drafts proposals and follow-ups"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            You just finished a great meeting with a potential client. The
            energy was right. They said yes to the next step. You hung up
            feeling good.
          </p>
          <p className={styles.p}>
            Then the real work started: writing the proposal.
          </p>
          <p className={styles.p}>
            For most independent professionals, proposals are a grind. You
            stall. You second-guess the pricing. You rewrite the scope
            paragraph four times. Three days later when the excitement from
            the meeting has cooled you finally hit send. By then, the client
            is in a different headspace.
          </p>
          <p className={styles.p}>
            Salt changes that sequence entirely. Here&apos;s how the
            LEARN&rarr;ACT loop works in practice.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Step 1: Salt Reads the Room</h2>
          <p className={styles.p}>
            The loop starts before you open Salt. By connecting your calendar
            and email, Salt sees the meeting on your schedule a 60-minute call
            with someone you&apos;ve been emailing about a brand positioning
            project.
          </p>
          <p className={styles.p}>
            After the meeting, you open Salt and find a meeting brief:
            extracted context, key signals, and open actions. This is the
            LEARN phase. Salt has read everything you&apos;ve shared through
            your connected accounts and surfaced what matters.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Step 2: Salt Drafts the Proposal</h2>
          <p className={styles.p}>
            From the meeting summary, Salt drafts a full proposal. Project
            scope pulled from the signals. Pricing from your saved rate card
            or previous similar projects. Terms with your default settings.
            The language not template filler. Every paragraph written for this
            specific client.
          </p>
          <p className={styles.p}>
            The draft isn&apos;t perfect. It&apos;s meant to be edited. What
            it is is <em>done</em> meaning you&apos;re editing a real proposal
            instead of staring at a blank page. That distinction is
            everything. Independent professionals who edit an existing draft
            send proposals 4x faster than those who start from scratch.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Step 3: You Review and Approve</h2>
          <p className={styles.p}>
            This is the step that separates Salt from an auto-generated
            proposal tool. Salt doesn&apos;t send anything without you.
          </p>
          <p className={styles.p}>
            You open the draft. Check scope accuracy. Adjust tone. Override
            pricing if needed. When you&apos;re satisfied, you approve. Salt
            sends it from your email address with your signature.
          </p>
          <p className={styles.p}>
            The approval workflow is the guardrail. Salt does the heavy
            lifting. You provide the judgment. Together, you go from meeting
            to sent proposal in under an hour.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Step 4: Follow-Ups That Actually Happen</h2>
          <p className={styles.p}>
            The proposal is sent. The client says they&apos;ll review it. Then
            silence. Three days pass. Five days. You know you should follow up
            but you don&apos;t.
          </p>
          <p className={styles.p}>
            Salt handles this before the silence even starts. When you approve
            the proposal, Salt automatically queues a follow-up sequence: day
            3 check-in, day 7 adjustment offer, day 14 last check. Each
            follow-up is pre-drafted. You review, tweak, and approve.
          </p>
          <p className={styles.p}>
            The result? Salt users follow up on 94% of sent proposals,
            compared to the industry average of 38%. That follow-up gap alone
            accounts for most of the 30% to 60% win-rate improvement Salt
            users report.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Loop Closes into GROW</h2>
          <p className={styles.p}>
            Once a proposal is accepted, Salt doesn&apos;t stop. The project
            scope moves into active tracking. Payment schedules are set.
            Deliverable dates are logged. And the next LEARN cycle begins.
          </p>
          <p className={styles.p}>
            The LEARN&rarr;ACT&rarr;GROW loop isn&apos;t a marketing
            framework. It&apos;s how the tool works, end to end. Connect your
            accounts. Have the meeting. Let Salt draft. You approve. The
            client says yes. And you move on to the next project without
            rebuilding from zero every time.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 6: Salt Reads Your Business
  // ================================================================================================================
  {
    slug: "salt-reads-your-business",
    title: "Salt Reads Your Business. Here&apos;s What It Finds.",
    description:
      "Salt is proactive AI that doesn't wait for prompts. It reads your connected accounts and surfaces what needs attention before you think to ask.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.feature)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-06-15",
    image: {
      src: readsBusinessImg,
      urlRelative: "/learn/salt-reads-your-business/header.png",
      alt: "Salt reads your business",
    },
    content: (
      <>
        <Image
          src={readsBusinessImg}
          alt="Salt reads your business"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            Most independent professionals run their business the same way:
            reactively. A client emails. You respond. A meeting gets
            scheduled. You show up. An invoice is late. You chase it.
            Something breaks. You fix it.
          </p>
          <p className={styles.p}>
            Reactive mode feels inevitable when you&apos;re running everything
            alone. But here&apos;s what most independents discover when they
            stop treating their business like a side effect of their client
            work: the data is already there. You just can&apos;t see it. Not
            without something reading it for you.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Proactive vs. Reactive Tools</h2>
          <p className={styles.p}>
            The tools you already use are reactive by design. Your calendar
            shows you what&apos;s next. Your email shows you what arrived.
            Your Stripe dashboard shows you what already happened. Every tool
            expects you to open it and decide what matters.
          </p>
          <p className={styles.p}>
            Proactive AI flips the model. Instead of waiting for you to ask,
            it watches your connected accounts continuously Stripe, calendar,
            email, CRM and surfaces what needs your attention before you know
            to look for it.
          </p>
          <p className={styles.p}>
            The difference isn&apos;t the data. You already have all of it.
            The difference is who&apos;s doing the scanning. When you scan,
            you miss things because you&apos;re busy. When Salt scans, nothing
            falls through.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Salt Sees When You Connect</h2>
          <p className={styles.p}>
            Connect your accounts once. From that point, Salt reads the
            signals your business generates every day.
          </p>
          <p className={styles.p}>
            <strong>From Stripe:</strong> Revenue trends. Client payment
            history. Which projects are profitable and which ones cost you
            more than they returned.
          </p>
          <p className={styles.p}>
            <strong>From your calendar:</strong> The shape of your week. How
            much time goes to billable work versus internal meetings versus
            admin. The prospects you met with and never followed up on.
          </p>
          <p className={styles.p}>
            <strong>From email:</strong> The thread that&apos;s been sitting
            for twelve days. The proposal the client opened three times but
            never replied to.
          </p>
          <p className={styles.p}>
            Salt doesn&apos;t build a dashboard for you to stare at. It builds
            a picture of your business state and tells you what to do about
            it.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Your Daily Briefing</h2>
          <p className={styles.p}>
            Every morning, Salt prepares a briefing. Not a chart. Not a graph.
            A briefing written in plain language, prioritised by what matters
            most.
          </p>
          <p className={styles.p}>
            On a quiet week, the briefing might be two items. On a busy week,
            seven. The briefing is designed for the five-minute scan. You read
            it, you know your business state, you decide what to act on.
          </p>
          <p className={styles.p}>
            Users who read their daily briefing close 40% more follow-ups and
            book 30% more discovery calls. Not because they&apos;re working
            harder. Because they&apos;re working on the right things.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The LEARN&rarr;ACT&rarr;GROW Loop</h2>
          <p className={styles.p}>
            When Salt surfaces a stale lead, you don&apos;t just note it and
            move on. The loop closes.
          </p>
          <p className={styles.p}>
            <strong>LEARN:</strong> Salt reads your connected accounts and
            shows you the business state. A lead went cold. A follow-up is
            overdue.
          </p>
          <p className={styles.p}>
            <strong>ACT:</strong> Salt drafts the response. An email to
            re-engage the lead. A follow-up to the overdue proposal. You
            review, approve, and send.
          </p>
          <p className={styles.p}>
            <strong>GROW:</strong> The action produces a result. You
            re-engage, book a call, send a proposal. Revenue materialises.
            Salt tracks it.
          </p>
          <p className={styles.p}>
            The loop is daily, not quarterly. Every morning you LEARN what
            needs attention. Every afternoon you ACT on the most important
            items. Over weeks, the GROW phase compounds.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 7: From Hired Hand to Trusted Partner
  // ================================================================================================================
  {
    slug: "from-hired-hand-to-trusted-partner",
    title: "From Hired Hand to Trusted Partner",
    description:
      "Imposter syndrome isn't about knowing less. It's about how you see yourself. The identity shift that changes how you price, pitch, and attract clients.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.marc)!,
    publishedAt: "2024-06-22",
    image: {
      src: partnerImg,
      urlRelative: "/learn/from-hired-hand-to-trusted-partner/header.png",
      alt: "From hired hand to trusted partner",
    },
    content: (
      <>
        <Image
          src={partnerImg}
          alt="From hired hand to trusted partner"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            There&apos;s a moment every independent professional hits. A
            client asks you a question that changes everything. They
            don&apos;t ask &quot;how much does this cost?&quot; They ask
            &quot;what do you think we should do?&quot;
          </p>
          <p className={styles.p}>
            That question is the line between being a hired hand and being a
            trusted partner. Cross it, and your business changes. Your pricing
            changes. The kind of clients you attract changes. Everything
            changes.
          </p>
          <p className={styles.p}>
            Most independents stay on the wrong side of that line for years.
            Not because they lack the skills. Because they lack the identity.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Psychological Shift Nobody Talks About</h2>
          <p className={styles.p}>
            When you start out, you take what you can get. A client describes
            a project. You nod. You quote a price. You deliver what they asked
            for. This is the hired-hand model. You trade time for money.
          </p>
          <p className={styles.p}>
            The shift to trusted partner starts with one internal change: you
            stop waiting for permission to have an opinion. Trusted partners
            don&apos;t ask &quot;what do you need?&quot; They ask &quot;what
            are you trying to achieve?&quot;
          </p>
          <p className={styles.p}>
            The difference sounds subtle. In practice, it&apos;s the
            difference between being interchangeable and being irreplaceable.
            Hired hands get replaced on price. Trusted partners get retained
            on value.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How Pricing Changes</h2>
          <p className={styles.p}>
            Hired hands price based on time. Hours times rate equals fee.
            Trusted partners price based on outcome. The fee is tied to the
            value the client receives, not the hours you invest.
          </p>
          <p className={styles.p}>
            A hired hand quotes $5,000 for a website redesign because they
            estimate two weeks at $125 an hour. A trusted partner listens to
            the same client, learns the current site converts at 2% against
            $1.2 million annual revenue, and quotes $15,000 for a redesign
            targeting 4%. The client doesn&apos;t blink. Because the
            conversation isn&apos;t about cost. It&apos;s about return.
          </p>
          <p className={styles.p}>
            Salt users report that projects jump from $3,000 to $10,000+ when
            they make this shift. Not because the work is harder. Because the
            framing is different.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How Salt Proves Your Worth</h2>
          <p className={styles.p}>
            Here&apos;s where most independents get stuck: you know you bring
            strategic value. But proving it before the client has worked with
            you is hard.
          </p>
          <p className={styles.p}>
            Memory is the tool that breaks that barrier. Not your memory the
            memory Salt keeps of every project, every outcome, every
            relationship. When you&apos;re pitching a new client, Salt
            surfaces the relevant data. The project similar to this one that
            delivered a 3x ROI. The case study you&apos;d forgotten about.
          </p>
          <p className={styles.p}>
            Salt also shows you the relationship patterns that matter. The
            client who started as a small project and grew into a retainer.
            The industries where you consistently deliver the highest
            outcomes. These insights help you see yourself differently. When
            you have a system that tracks your actual impact, it&apos;s harder
            to default to the hired-hand mindset.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Compound Effect</h2>
          <p className={styles.p}>
            One partner-level project changes your revenue. Five change your
            business model. When you deliver strategic value at a $10,000+
            price point, you attract clients who respect strategic value.
          </p>
          <p className={styles.p}>
            The hired hand stays stuck in the commodity cycle: low rates, high
            volume, constant selling, no leverage. The trusted partner builds
            a business that compounds: higher rates, fewer clients, deeper
            relationships, more referrals.
          </p>
          <p className={styles.p}>
            The shift doesn&apos;t require more experience or more
            credentials. It requires a different belief about who you are and
            what you bring. Stop asking what the client wants you to do. Start
            telling them what they need.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 8: What Is Proactive AI?
  // ================================================================================================================
  {
    slug: "what-is-proactive-ai",
    title: "What Is Proactive AI? The Complete Guide for Business Owners",
    description:
      "Proactive AI autonomously monitors, surfaces, and acts on operational data — invoices, contracts, schedules, client communications — without waiting for a human to issue a command.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-04",
    image: {
      src: proactiveAiImg,
      urlRelative: "/learn/what-is-proactive-ai/header.png",
      alt: "What Is Proactive AI? The Complete Guide for Business Owners",
    },
    content: (
      <>
        <Image
          src={proactiveAiImg}
          alt="What Is Proactive AI? The Complete Guide for Business Owners"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            Proactive AI is a category of business software that autonomously monitors, surfaces, and acts on operational data — invoices, contracts, schedules, client communications — without waiting for a human to issue a command, turning business operations from a daily chore into a background function.
          </p>
          <p className={styles.p}>
            <strong>Proactive AI (noun):</strong> A class of artificial intelligence systems designed to continuously observe business data sources, detect patterns or anomalies, and surface actionable information to the business owner without being prompted. Unlike reactive AI tools that require a user to ask a question or trigger an action, proactive AI operates on a push model — it brings what matters to the user&apos;s attention based on rules, schedules, or predictive signals.
          </p>
          <p className={styles.p}>
            <strong>Core characteristics of proactive AI for business:</strong>
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Always-on observation:</strong> Continuously monitors connected data sources (email, calendars, accounting software, CRM)</li>
            <li className={styles.li}><strong>Push-based alerts:</strong> Surfaces items that need attention — does not wait for a query</li>
            <li className={styles.li}><strong>Action orientation:</strong> Shows the user not just what&apos;s happening, but what needs to happen next</li>
            <li className={styles.li}><strong>No prompt required:</strong> The system initiates contact based on configured business rules, not user commands</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>What Salt Can Do: The Capability Manifest</h2>
          <p className={styles.p}>
            Salt is a proactive AI agent purpose-built for independent professionals. Here is exactly what Salt can do for your business in concrete, actionable terms:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Monitor your email</strong> for overdue invoices, client follow-up needs, and communication gaps across all active engagements</li>
            <li className={styles.li}><strong>Surface scheduling conflicts</strong> by analyzing your calendar against meeting preparation requirements, travel windows, and workload density</li>
            <li className={styles.li}><strong>Track client communication patterns</strong> to flag when important messages go unanswered or when client responsiveness drops below normal baselines</li>
            <li className={styles.li}><strong>Prepare draft proposals</strong> and payment reminders for your approval before sending</li>
            <li className={styles.li}><strong>Flag expiring contracts</strong> and renewal opportunities with enough advance notice to initiate conversations</li>
            <li className={styles.li}><strong>Generate weekly business briefings</strong> that summarize cash flow trends, project status, and outstanding action items</li>
            <li className={styles.li}><strong>Detect cash flow anomalies</strong> by comparing invoice aging, payment velocity, and seasonal patterns against historical baselines</li>
            <li className={styles.li}><strong>Alert on compliance deadlines</strong> including tax filings, license renewals, and service-level obligations</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>The Problem: Your Business Tools Are Waiting for You to Ask</h2>
          <p className={styles.p}>
            Most independent professionals run their business across 6-10 different tools. Each one sits there, waiting. Your email client doesn&apos;t tell you which client hasn&apos;t responded in nine days. Your accounting software doesn&apos;t surface which invoices are approaching 30 days late. Your calendar doesn&apos;t flag when you have back-to-back meetings with no prep time.
          </p>
          <h3 className={styles.h3}>Reactive AI Defined: Tools That Wait</h3>
          <p className={styles.p}>
            Reactive AI includes chatbots, content generators, and Q&amp;A tools that sit idle until prompted. ChatGPT waits for your question. Copilot waits for your command. Claude waits for your request. Every interaction starts with you remembering what to ask.
          </p>
          <p className={styles.p}>
            This creates the hidden cost of pull systems — every question you have to remember to ask is a cognitive tax. How many late invoices did you discover only when checking your accounting software? How many client follow-ups happened only because you remembered to look?
          </p>
          <h3 className={styles.h3}>Why Most AI for Business Products Are Really Just Faster Search Engines</h3>
          <p className={styles.p}>
            The current generation of business AI tools are glorified search interfaces. They&apos;re excellent at finding answers when you know what questions to ask, but terrible at telling you what questions you should be asking in the first place.
          </p>
          <p className={styles.p}>
            There&apos;s a fundamental gap between tools that answer questions and tools that do work. One requires your constant attention; the other buys back your time.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Makes AI Proactive Instead of Reactive</h2>
          <p className={styles.p}>
            The defining architectural difference between proactive and reactive AI is the push versus pull distinction. Reactive AI uses a pull model — you must pull information from the system by asking for it. Proactive AI uses a push model — the system pushes information to you based on what it observes.
          </p>
          <h3 className={styles.h3}>Always-On Observation: What It Means for a System to Watch Your Operations</h3>
          <p className={styles.p}>
            Proactive AI connects to the tools you already use and maintains a continuous view of your business state. It doesn&apos;t just store data when you enter it; it observes what&apos;s already happening across your email, calendar, accounting software, and CRM.
          </p>
          <p className={styles.p}>
            This observation layer tracks patterns over time. It keeps track of your typical invoice payment cycles, your usual client response times, your standard meeting preparation windows. When something deviates from these patterns, it surfaces the exception.
          </p>
          <h3 className={styles.h3}>Rules, Schedules, and Predictive Signals: The Three Trigger Types</h3>
          <p className={styles.p}>
            Proactive AI operates on three types of triggers:
          </p>
          <p className={styles.p}>
            <strong>Rules-based:</strong> Surface any invoice that reaches 30 days overdue. These are explicit business policies translated into system logic.
          </p>
          <p className={styles.p}>
            <strong>Schedule-based:</strong> Show tomorrow&apos;s meetings that lack agenda notes. These are time-driven events that need preparation.
          </p>
          <p className={styles.p}>
            <strong>Predictive signals:</strong> Flag clients who typically respond within 24 hours but haven&apos;t replied in 72 hours. These identify deviations from established patterns.
          </p>
          <h3 className={styles.h3}>How Proactive AI Surfaces Work Items Without Needing a Command</h3>
          <p className={styles.p}>
            The system doesn&apos;t wait for you to log in and check various dashboards. Instead, it brings forward what needs attention through daily briefings, real-time notifications, or approval queues. You see what matters when it matters, not when you remember to look.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How Proactive AI Actually Works: The Mechanism</h2>
          <p className={styles.p}>
            Understanding how proactive AI operates helps explain why it&apos;s fundamentally different from the reactive tools you&apos;ve used before.
          </p>
          <h3 className={styles.h3}>Data Sources It Connects To</h3>
          <p className={styles.p}>
            Proactive AI integrates with your existing business infrastructure:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Email systems</strong> (Gmail, Outlook) for client communications and response tracking</li>
            <li className={styles.li}><strong>Calendar applications</strong> for meeting schedules and preparation windows</li>
            <li className={styles.li}><strong>Accounting software</strong> (QuickBooks, Stripe) for invoice status and payment patterns</li>
            <li className={styles.li}><strong>CRM systems</strong> for relationship history and follow-up cycles</li>
            <li className={styles.li}><strong>Contract storage</strong> for renewal dates and obligation tracking</li>
          </ul>
          <h3 className={styles.h3}>The Observation Layer: What the System Tracks and What Matters</h3>
          <p className={styles.p}>
            The system maintains a real-time view of your business operations. It doesn&apos;t just record transactions; it builds context from operational data. It recognizes that an unpaid invoice from a regular client who usually pays within 10 days is different from an unpaid invoice from a new client who&apos;s never worked with you before.
          </p>
          <p className={styles.p}>
            This contextual awareness comes from observing patterns over time. The system builds a picture of your business rhythm and identifies when something breaks that picture.
          </p>
          <h3 className={styles.h3}>The Surface Layer: How It Presents Actionable Information</h3>
          <p className={styles.p}>
            Rather than generating reports you have to interpret, proactive AI surfaces specific items that need decisions. Instead of &quot;Here&apos;s a list of all your invoices,&quot; it shows &quot;Three invoices are approaching 45 days overdue and may need collection action.&quot;
          </p>
          <p className={styles.p}>
            Information is presented through daily operational briefings, priority queues, or contextual notifications that appear when you&apos;re working on related tasks.
          </p>
          <h3 className={styles.h3}>The Action Trail: How Your Decisions Feed Back Into the System</h3>
          <p className={styles.p}>
            Every decision you make — approve, dismiss, modify, defer — feeds back into the system&apos;s understanding of your priorities. If you consistently dismiss certain types of alerts, the system adjusts its sensitivity. If you always act on specific patterns, it surfaces similar situations more prominently.
          </p>
          <h3 className={styles.h3}>A Concrete Example: Proactive AI During a Normal Business Day</h3>
          <p className={styles.p}>
            <strong>8:00 AM:</strong> You receive a morning briefing showing five items need attention today: two client proposals that have been unopened for 72 hours, one invoice approaching 30 days overdue, a contract renewal due next week, and a scheduling conflict this afternoon.
          </p>
          <p className={styles.p}>
            <strong>10:30 AM:</strong> The system surfaces a client who typically responds to emails within 4 hours but hasn&apos;t replied to yesterday&apos;s message. You didn&apos;t have to remember to check; the deviation from the client&apos;s usual pattern was identified automatically.
          </p>
          <p className={styles.p}>
            <strong>2:15 PM:</strong> Before your 3 PM meeting, the system shows you haven&apos;t prepared an agenda and reminds you of the three discussion points from your last conversation with this client.
          </p>
          <p className={styles.p}>
            <strong>4:45 PM:</strong> The system flags that you have back-to-back meetings tomorrow starting at 9 AM with no travel time between locations.
          </p>
          <p className={styles.p}>
            <strong>End of day:</strong> Rather than wondering what you might have missed, you review a summary of what was handled and what&apos;s queued for tomorrow.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Proactive AI Can Do for Your Business Operations</h2>
          <p className={styles.p}>
            Proactive AI transforms the most time-consuming parts of running an independent professional service business from manual monitoring to automatic surfacing.
          </p>
          <h3 className={styles.h3}>Invoice and Payment Monitoring</h3>
          <p className={styles.p}>
            The system monitors payment status across all your invoices and surfaces cash flow changes before they become problems. Instead of discovering overdue payments when you manually review your accounting software, you see payment exceptions as they occur.
          </p>
          <p className={styles.p}>
            <strong>What gets surfaced:</strong> Invoices nearing due dates, payments that are overdue, clients whose payment patterns have changed, cash flow projections based on current receivables.
          </p>
          <p className={styles.p}>
            <strong>What you decide:</strong> Which overdue accounts need follow-up, whether to modify payment terms for specific clients, when to escalate collection efforts.
          </p>
          <h3 className={styles.h3}>Contract and Deadline Tracking</h3>
          <p className={styles.p}>
            Business contracts and service agreements contain dozens of dates and obligations that are easy to lose track of. Proactive AI brings upcoming renewals, expirations, and obligations forward before they become urgent.
          </p>
          <p className={styles.p}>
            <strong>What gets surfaced:</strong> Contracts expiring within your specified window, renewal opportunities, service-level agreements approaching deadlines, compliance obligations that need attention.
          </p>
          <p className={styles.p}>
            <strong>What you decide:</strong> Which contracts to renew, what terms to modify, how to prioritize competing obligations.
          </p>
          <h3 className={styles.h3}>Client Communication Management</h3>
          <p className={styles.p}>
            Rather than letting client emails pile up in your inbox, proactive AI shows unanswered client communications, stale proposals, and follow-up opportunities based on your typical response patterns and client expectations.
          </p>
          <p className={styles.p}>
            <strong>What gets surfaced:</strong> Client messages that need responses, proposals that have been unopened for extended periods, clients who have gone quiet after typically regular communication.
          </p>
          <p className={styles.p}>
            <strong>What you decide:</strong> How to prioritize client communications, when to escalate urgent requests, which proposals need follow-up.
          </p>
          <h3 className={styles.h3}>Schedule and Calendar Intelligence</h3>
          <p className={styles.p}>
            Your calendar contains more than just meeting times — it reveals preparation needs, travel constraints, and workload patterns. Proactive AI identifies conflicts, gaps, and preparation windows you might miss when focused on individual appointments.
          </p>
          <p className={styles.p}>
            <strong>What gets surfaced:</strong> Scheduling conflicts, meetings without adequate preparation time, calendar gaps that could accommodate new work, travel logistics that need coordination.
          </p>
          <p className={styles.p}>
            <strong>What you decide:</strong> Whether to reschedule conflicting meetings, how much preparation time each meeting needs, when you&apos;re available for new commitments.
          </p>
          <h3 className={styles.h3}>Task and Project Oversight</h3>
          <p className={styles.p}>
            Projects involve multiple moving parts across different tools and communication channels. Proactive AI highlights stalled items, approaching deadlines, and resource gaps before they impact delivery.
          </p>
          <p className={styles.p}>
            <strong>What gets surfaced:</strong> Tasks that haven&apos;t progressed within expected timeframes, project milestones approaching deadlines, deliverables that depend on client input, resource constraints affecting multiple projects.
          </p>
          <p className={styles.p}>
            <strong>What you decide:</strong> How to reallocate resources, which deadlines need client communication, what deliverables need priority adjustment.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Proactive AI vs. Reactive AI: Quick Reference</h2>
          <p className={styles.p}>
            Understanding the operational differences helps clarify which type of system you need for different aspects of your business.
          </p>
          <p className={styles.p}>
            <strong>Key differences:</strong> Reactive AI waits for user prompts; proactive AI acts on observed patterns. Reactive AI answers about provided information; proactive AI continuously monitors connected systems. Reactive AI has conversation-based memory; proactive AI maintains persistent business context. Reactive AI responds when asked; proactive AI surfaces when relevant. Reactive AI handles a single question or task; proactive AI provides ongoing operational oversight. With reactive AI, the user must remember to ask; with proactive AI, the user reviews what the system surfaces.
          </p>
          <h3 className={styles.h3}>When Reactive AI Still Makes Sense</h3>
          <p className={styles.p}>
            Reactive AI excels at content generation, research assistance, and one-off problem solving. If you need to write a proposal, research a market, or solve a specific technical challenge, reactive AI provides powerful capabilities on demand.
          </p>
          <p className={styles.p}>
            The limitation isn&apos;t the quality of reactive AI — it&apos;s the requirement that you initiate every interaction.
          </p>
          <h3 className={styles.h3}>When Proactive AI Is Essential</h3>
          <p className={styles.p}>
            If your business involves ongoing client relationships, recurring operational tasks, or time-sensitive obligations, reactive AI alone creates a constant mental load. You become the system&apos;s memory and scheduler.
          </p>
          <p className={styles.p}>
            Proactive AI is essential when you need operational awareness that doesn&apos;t depend on your remembering to check multiple systems.
          </p>
          <h3 className={styles.h3}>The Operational Shift: From What Do I Need to Do? to What Does the System Show Me?</h3>
          <p className={styles.p}>
            With reactive AI, each day starts with the question &quot;What do I need to do?&quot; and requires you to check multiple systems to construct an answer.
          </p>
          <p className={styles.p}>
            With proactive AI, each day starts with a briefing of what needs attention, what&apos;s approaching deadlines, and what&apos;s changed since yesterday. The cognitive load shifts from discovery to decision-making.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Is Proactive AI Right for Your Business?</h2>
          <p className={styles.p}>
            Not every business needs proactive AI, but specific patterns indicate when it becomes essential rather than optional.
          </p>
          <h3 className={styles.h3}>Signs You Need Proactive AI</h3>
          <p className={styles.p}>
            <strong>Late fees and missed deadlines:</strong> You regularly discover overdue invoices, missed renewal dates, or forgotten obligations only when checking systems manually.
          </p>
          <p className={styles.p}>
            <strong>Scattered tools and context switching:</strong> You spend significant time each day logging into different systems to check status rather than working on revenue-generating activities.
          </p>
          <p className={styles.p}>
            <strong>Client management gaps:</strong> Important client communications get delayed because you didn&apos;t notice them promptly, or follow-up opportunities are missed because there&apos;s no systematic way to track them.
          </p>
          <p className={styles.p}>
            <strong>Administrative overwhelm:</strong> You spend evenings or weekends catching up on operational tasks that accumulated during busy periods focused on client delivery.
          </p>
          <h3 className={styles.h3}>The Solo Operator Threshold: When Operations Become a Second Job</h3>
          <p className={styles.p}>
            Independent professionals earning between $50K and $300K annually often reach a point where operational complexity outgrows manual management. You have enough clients that relationships require systematic attention, enough recurring revenue that cash flow management matters, and enough ongoing obligations that missed items have real consequences.
          </p>
          <h3 className={styles.h3}>What Proactive AI Is Not</h3>
          <p className={styles.p}>
            Proactive AI doesn&apos;t replace judgment, creativity, or client relationships. It handles the monitoring and surfacing layer so you can focus on strategic decisions and relationship management.
          </p>
          <p className={styles.p}>
            It&apos;s not a replacement for business systems — it works with your existing tools to provide oversight across them. It&apos;s not autonomous execution — you remain the decision-maker for client-facing actions.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Future of Business Operations: Always-On, Always-Aware</h2>
          <p className={styles.p}>
            The shift from reactive to proactive AI represents a fundamental change in how independent professionals manage their businesses.
          </p>
          <h3 className={styles.h3}>Why the Pull Model Is Dying</h3>
          <p className={styles.p}>
            Business tools that require you to remember what to check and when to check it create an unsustainable cognitive burden as businesses grow. The pull model made sense when software was limited to specific functions, but modern businesses operate across integrated ecosystems where changes in one area affect multiple others.
          </p>
          <h3 className={styles.h3}>How Proactive AI Changes the Business Owner&apos;s Daily Workflow</h3>
          <p className={styles.p}>
            Instead of starting each day by checking multiple systems and mentally constructing a priority list, you begin with a briefing of what needs attention. Instead of context-switching between tools throughout the day, you receive contextual information when working on related tasks.
          </p>
          <h3 className={styles.h3}>The Three-Tier Evolution: Recording → Reporting → Proactive Operations</h3>
          <p className={styles.p}>
            <strong>Tier 1: Recording systems</strong> capture what you tell them (traditional CRMs, accounting software, project management tools).
          </p>
          <p className={styles.p}>
            <strong>Tier 2: Reporting systems</strong> analyze what they&apos;ve recorded and present summaries when you request them (analytics dashboards, business intelligence tools).
          </p>
          <p className={styles.p}>
            <strong>Tier 3: Proactive operations</strong> observe what&apos;s happening across your business and surface what needs attention without being asked.
          </p>
          <p className={styles.p}>
            Most business software is still operating at Tiers 1 and 2. The transition to Tier 3 represents the next generation of business operations.
          </p>
          <h3 className={styles.h3}>What Comes Next: Systems That Coordinate Across Tools</h3>
          <p className={styles.p}>
            Current proactive AI focuses primarily on observation and surfacing. The next evolution involves systems that can coordinate actions across multiple tools while maintaining human oversight for strategic decisions.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>What is proactive AI in simple terms?</strong>
          </p>
          <p className={styles.p}>
            Proactive AI is software that monitors your business data in the background and brings important items to your attention — like an overdue invoice, an expiring contract, or a scheduling conflict — without you having to remember to check or ask a question.
          </p>
          <p className={styles.p}>
            <strong>How is proactive AI different from ChatGPT or other chatbots?</strong>
          </p>
          <p className={styles.p}>
            ChatGPT and similar tools are reactive — they wait for you to type something. Proactive AI runs continuously in the background, monitoring your real business data (email, invoices, calendar) and surfacing what needs action without being prompted.
          </p>
          <p className={styles.p}>
            <strong>Can proactive AI take actions on its own, like sending invoices?</strong>
          </p>
          <p className={styles.p}>
            Proactive AI shows you what needs attention and can prepare actions for your approval. For example, it might surface three overdue invoices and show you the draft reminder email. The business owner still makes the call — the system does the monitoring and surfacing.
          </p>
          <p className={styles.p}>
            <strong>What data does proactive AI need to work?</strong>
          </p>
          <p className={styles.p}>
            It connects to the tools you already use — email, calendar, accounting software, CRM, and document storage. The more data sources it observes, the more complete its picture of your operations.
          </p>
          <p className={styles.p}>
            <strong>Is proactive AI secure for my business data?</strong>
          </p>
          <p className={styles.p}>
            Proactive AI systems handle sensitive operational data — the right implementation uses encryption, access controls, and data segregation. Always verify a provider&apos;s security architecture before connecting business accounts.
          </p>
          <p className={styles.p}>
            <strong>Does proactive AI replace the need for a virtual assistant or bookkeeper?</strong>
          </p>
          <p className={styles.p}>
            No. Proactive AI handles the monitoring, surfacing, and tracking layer. It doesn&apos;t replace judgment, client relationships, or strategic decisions. Think of it as the operational radar — you still fly the plane.
          </p>
          <p className={styles.p}>
            <strong>What data sources does Salt connect to?</strong>
          </p>
          <p className={styles.p}>
            Salt connects to your existing business tools via secure API integrations — Gmail and Outlook for email, Google Calendar and Outlook Calendar for scheduling, QuickBooks and Stripe for accounting, and popular CRM platforms. Salt uses OAuth-based connections so your credentials are never stored on Salt&apos;s servers, and a sandbox testing environment is available to validate integrations before connecting production accounts.
          </p>
          <p className={styles.p}>
            <strong>What security protocols does Salt use to protect my data?</strong>
          </p>
          <p className={styles.p}>
            Salt encrypts all data in transit (TLS 1.3) and at rest (AES-256). The platform is built with SOC 2-aligned security practices, including role-based access controls, audit logging, and regular third-party penetration testing. Every API connection uses OAuth 2.0 so Salt never has access to your master passwords. Data is segregated per tenant in isolated database environments.
          </p>
          <p className={styles.p}>
            <strong>What actions can Salt take autonomously vs. requiring my approval?</strong>
          </p>
          <p className={styles.p}>
            Salt operates on an approval-first model. It autonomously monitors, tracks, and surfaces information — flagging overdue invoices, detecting scheduling conflicts, identifying communication gaps, and preparing draft responses. Actions that involve sending communications, modifying records, or initiating payments always require human approval. You can configure how much autonomy Salt has through granular permission settings that vary by data source and action type.
          </p>
          <p className={styles.p}>
            <strong>Can Salt integrate with my existing tools via API?</strong>
          </p>
          <p className={styles.p}>
            Yes. Salt connects through standard REST APIs and OAuth 2.0 to the tools you already use — email (Gmail, Outlook), calendar (Google Calendar, Outlook Calendar), accounting (QuickBooks, Stripe), and CRM platforms. If your tool has a public API, Salt can be extended to connect. Custom API integrations are available upon request for enterprise setups.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Ready to see how proactive AI works for your business? <a href="/" className="link link-hover">Salt</a> is the proactive AI built specifically for independent professionals. It connects to your existing tools and surfaces what needs attention so you can focus on growing your business instead of managing it.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 9: Proactive AI vs. Reactive AI
  // ================================================================================================================
  {
    slug: "proactive-ai-vs-reactive-ai",
    title: "Proactive AI vs. Reactive AI: What's the Difference?",
    description:
      "The core difference between proactive AI and reactive AI is initiative: reactive AI tools wait for a command, whereas proactive AI continuously monitors business data and surfaces what needs attention without being prompted.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-05",
    image: {
      src: proactiveVsReactiveImg,
      urlRelative: "/learn/proactive-ai-vs-reactive-ai/header.png",
      alt: "Proactive AI vs. Reactive AI: What's the Difference?",
    },
    content: (
      <>
        <Image
          src={proactiveVsReactiveImg}
          alt="Proactive AI vs. Reactive AI: What's the Difference?"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            The core difference between proactive AI and reactive AI is initiative: reactive AI tools wait for a user to type a command or question, whereas proactive AI continuously monitors business data in the background and surfaces what needs attention without being prompted.
          </p>
          <p className={styles.p}>
            <strong>Reactive AI:</strong> A system design where the AI remains dormant until a user issues a prompt, command, or query. The user must know what to ask, when to ask it, and how to phrase it. Examples: ChatGPT, Gemini, Claude, Copilot, and most chatbot-based tools.
          </p>
          <p className={styles.p}>
            <strong>Proactive AI:</strong> A system design where the AI operates on a push model — it continuously observes connected data sources (email, calendar, accounting software, CRM) and surfaces actionable information to the user based on predefined rules, schedules, or predictive signals. Examples: Salt (proactive AI for business operations).
          </p>
          <p className={styles.p}>
            <strong>Key architectural distinction:</strong> Reactive AI = pull model (user pulls information from the system). Proactive AI = push model (system pushes information to the user).
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Salt Can Do: The Capability Manifest</h2>
          <p className={styles.p}>
            Salt is a proactive AI agent purpose-built for independent professionals. Here is exactly what Salt can do for your business in concrete, actionable terms:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Monitor your email</strong> for overdue invoices, client follow-up needs, and communication gaps across all active engagements</li>
            <li className={styles.li}><strong>Surface scheduling conflicts</strong> by analyzing your calendar against meeting preparation requirements, travel windows, and workload density</li>
            <li className={styles.li}><strong>Track client communication patterns</strong> to flag when important messages go unanswered or when client responsiveness drops below normal baselines</li>
            <li className={styles.li}><strong>Prepare draft proposals</strong> and payment reminders for your approval before sending</li>
            <li className={styles.li}><strong>Flag expiring contracts</strong> and renewal opportunities with enough advance notice to initiate conversations</li>
            <li className={styles.li}><strong>Generate weekly business briefings</strong> that summarize cash flow trends, project status, and outstanding action items</li>
            <li className={styles.li}><strong>Detect cash flow anomalies</strong> by comparing invoice aging, payment velocity, and seasonal patterns against historical baselines</li>
            <li className={styles.li}><strong>Alert on compliance deadlines</strong> including tax filings, license renewals, and service-level obligations</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>Why the AI Label Hides a Critical Distinction</h2>
          <p className={styles.p}>
            Both categories get called AI, but they solve fundamentally different problems. The confusion comes from marketing that treats all artificial intelligence as equivalent when the operational differences are profound.
          </p>
          <h3 className={styles.h3}>The Reactive AI Paradigm: Every Tool You&apos;ve Used So Far Waits for You to Start</h3>
          <p className={styles.p}>
            Most business owners have tried ChatGPT, Copilot, Jasper, or similar AI tools. Each interaction begins the same way: you open the interface, think about what to ask, type a prompt, and wait for an answer. The tool provides no value until you initiate the conversation.
          </p>
          <p className={styles.p}>
            This pattern has trained business owners to think of AI as a sophisticated search engine or writing assistant — powerful when used, but dormant when not actively engaged.
          </p>
          <h3 className={styles.h3}>How Reactive AI Lulled Business Owners Into Thinking AI Doesn&apos;t Do Real Work</h3>
          <p className={styles.p}>
            The reactive paradigm creates a fundamental misalignment between AI capabilities and business needs. Businesses run on ongoing processes — client relationships that need nurturing, invoices that need tracking, contracts that need renewal attention. But reactive AI only operates during the moments you remember to engage it.
          </p>
          <p className={styles.p}>
            This leads to the common complaint: &quot;I tried AI for my business, but I still have to do all the work.&quot; The problem isn&apos;t AI capability — it&apos;s the architectural mismatch between reactive tools and operational requirements.
          </p>
          <h3 className={styles.h3}>The Proactive AI Paradigm: Systems That Operate on Their Own Observational Cycle</h3>
          <p className={styles.p}>
            Proactive AI flips the interaction model. Instead of waiting for prompts, it observes your business operations continuously and surfaces what needs attention when it matters. You still make the decisions, but the system handles the monitoring and prioritization.
          </p>
          <p className={styles.p}>
            This represents a shift from AI as a tool you use to AI as a system that works alongside your business operations.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Pull vs. Push Model: The Defining Difference</h2>
          <p className={styles.p}>
            The architectural distinction between pull and push models determines everything about how you interact with AI systems.
          </p>
          <h3 className={styles.h3}>Reactive AI = Pull: You Ask, It Answers, You&apos;re Still the Driver</h3>
          <p className={styles.p}>
            With reactive AI, you must:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Remember what questions to ask</li>
            <li className={styles.li}>Know when to ask them</li>
            <li className={styles.li}>Phrase requests in ways the system understands</li>
            <li className={styles.li}>Return regularly to get updated information</li>
            <li className={styles.li}>Manually connect information from different sources</li>
          </ul>
          <p className={styles.p}>
            You remain responsible for the cognitive overhead of managing what the system should know about and when it should tell you.
          </p>
          <h3 className={styles.h3}>Proactive AI = Push: It Watches, It Surfaces, You&apos;re the Decision-Maker</h3>
          <p className={styles.p}>
            With proactive AI, the system:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Monitors connected data sources continuously</li>
            <li className={styles.li}>Identifies patterns and exceptions</li>
            <li className={styles.li}>Surfaces information based on business rules and timing</li>
            <li className={styles.li}>Presents actionable items when they become relevant</li>
            <li className={styles.li}>Maintains context across different business areas</li>
          </ul>
          <p className={styles.p}>
            Your role shifts from managing the system to making decisions based on what the system brings to your attention.
          </p>
          <h3 className={styles.h3}>A Concrete Illustration of Both Models Running Side by Side</h3>
          <p className={styles.p}>
            <strong>Scenario: Managing client communications during a busy week</strong>
          </p>
          <p className={styles.p}>
            <strong>Reactive AI workflow:</strong>
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Monday: You ask &quot;What client emails need responses?&quot; System shows current inbox.</li>
            <li className={styles.li}>Tuesday: You remember to check again, ask &quot;What about proposals?&quot; System searches for proposals.</li>
            <li className={styles.li}>Wednesday: Busy with client work, forget to check email system.</li>
            <li className={styles.li}>Thursday: Ask &quot;What did I miss?&quot; System can only show current state, not what changed.</li>
            <li className={styles.li}>Friday: Discover a client email from Tuesday that needed urgent response.</li>
          </ul>
          <p className={styles.p}>
            <strong>Proactive AI workflow:</strong>
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>Monday: System surfaces &quot;3 client emails unread for 24+ hours&quot; without being asked.</li>
            <li className={styles.li}>Tuesday: System shows &quot;Johnson proposal unopened for 48 hours&quot; when you log in.</li>
            <li className={styles.li}>Wednesday: System sends notification &quot;Collins sent follow-up on project scope - needs response.&quot;</li>
            <li className={styles.li}>Thursday: System surfaces &quot;Miller typically responds within 6 hours, last message sent 18 hours ago.&quot;</li>
            <li className={styles.li}>Friday: System shows &quot;Week review: 12 client interactions handled, 2 proposals pending client responses.&quot;</li>
          </ul>
          <h3 className={styles.h3}>Why Pull Works for Information Retrieval but Fails for Operations Management</h3>
          <p className={styles.p}>
            Pull models excel when you have specific questions about static information. If you need to know the capital of a country or want help writing a marketing email, reactive AI provides excellent on-demand assistance.
          </p>
          <p className={styles.p}>
            Operations management requires awareness of changing conditions over time. Invoice status changes, client communication patterns shift, deadline proximity increases. These temporal changes happen whether you&apos;re paying attention or not, and discovering them late reduces your response options.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Side-by-Side: Proactive AI vs. Reactive AI in the Same Business Scenario</h2>
          <p className={styles.p}>
            <strong>Key comparisons across business scenarios:</strong>
          </p>
          <p className={styles.p}>
            <strong>Late invoice:</strong> With reactive AI you ask &quot;Show me overdue invoices&quot; and the AI lists them. With proactive AI, the system surfaces &quot;3 invoices are 30+ days overdue&quot; without being asked.
          </p>
          <p className={styles.p}>
            <strong>Contract renewal:</strong> With reactive AI you remember to ask &quot;When does the Jones contract expire?&quot; With proactive AI the system shows &quot;Jones contract expires in 14 days — renewal terms attached.&quot;
          </p>
          <p className={styles.p}>
            <strong>Daily briefing:</strong> With reactive AI you must compose every prompt from scratch. With proactive AI the system delivers a morning summary: what changed, what needs attention, what&apos;s coming.
          </p>
          <p className={styles.p}>
            <strong>Scheduling conflict:</strong> With reactive AI you notice two overlapping meetings and ask for help. With proactive AI the system flags the overlap and shows availability alternatives.
          </p>
          <p className={styles.p}>
            <strong>Client follow-up:</strong> With reactive AI you scroll through email wondering what you missed. With proactive AI the system surfaces &quot;5 client emails unread for 48+ hours, 2 proposals unanswered.&quot;
          </p>
          <p className={styles.p}>
            <strong>Project status:</strong> With reactive AI you ask &quot;What projects are behind schedule?&quot; With proactive AI the system shows &quot;Design phase for Miller project is 3 days past planned completion.&quot;
          </p>
          <p className={styles.p}>
            <strong>Cash flow:</strong> With reactive AI you check accounting software when you remember. With proactive AI the system surfaces &quot;Monthly recurring revenue down 12% from last month.&quot;
          </p>
          <h3 className={styles.h3}>The Common Pattern: Reactive AI Requires Your Memory; Proactive AI Replaces It</h3>
          <p className={styles.p}>
            The fundamental constraint of reactive AI isn&apos;t processing power or intelligence — it&apos;s the requirement that you serve as the system&apos;s scheduler and memory. Every question you forget to ask represents a potential operational blind spot.
          </p>
          <p className={styles.p}>
            Proactive AI removes this constraint by maintaining its own operational awareness and bringing relevant information forward when it matters.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Reactive AI Does Well (And Where It Falls Short)</h2>
          <p className={styles.p}>
            Reactive AI has genuine strengths that make it valuable for specific types of business tasks.
          </p>
          <h3 className={styles.h3}>Reactive AI&apos;s Strengths: Content Generation, Research Summarization, Coding Assistance</h3>
          <p className={styles.p}>
            When you need to create something new — write a proposal, research a market, solve a technical problem, or generate marketing copy — reactive AI provides powerful capabilities on demand. The interactive nature lets you refine requests and iterate toward exactly what you need.
          </p>
          <p className={styles.p}>
            For knowledge work that requires human creativity and judgment, the back-and-forth conversation model of reactive AI often produces better results than automated systems.
          </p>
          <h3 className={styles.h3}>Where Reactive AI Breaks for Business Operations</h3>
          <p className={styles.p}>
            <strong>You must know what to ask:</strong> Business operations involve dozens of moving parts. If you don&apos;t know to ask about contract renewal dates, overdue invoices, or client communication gaps, reactive AI can&apos;t help you discover them.
          </p>
          <p className={styles.p}>
            <strong>You must remember to ask:</strong> Even if you know what questions matter, you must remember to ask them regularly. A weekly check might miss time-sensitive issues that need daily or real-time attention.
          </p>
          <p className={styles.p}>
            <strong>You must ask correctly:</strong> Reactive AI responds to what you literally ask, not what you might need to know. Asking &quot;Are any invoices late?&quot; might miss invoices that will become late tomorrow or clients whose payment patterns have changed.
          </p>
          <h3 className={styles.h3}>The Cognitive Burden of Reactive AI: The Tool Doesn&apos;t Reduce Mental Load</h3>
          <p className={styles.p}>
            Reactive AI shifts mental work rather than eliminating it. Instead of manually checking systems, you must mentally track what questions to ask and when to ask them. For independent professionals juggling multiple clients and projects, this cognitive overhead can be substantial.
          </p>
          <h3 className={styles.h3}>Why a Chatbot Can&apos;t Run Your Business: It Has No Persistent View of Your Data</h3>
          <p className={styles.p}>
            Chatbots operate within conversation sessions. They don&apos;t maintain awareness of your business context between interactions. Each conversation starts fresh, requiring you to provide context about your current situation.
          </p>
          <p className={styles.p}>
            Business operations require persistent memory — understanding how current situations relate to historical patterns, tracking changes over time, and maintaining awareness of multiple concurrent processes. Chatbot architectures aren&apos;t designed for this type of ongoing operational oversight.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Proactive AI Brings That Reactive AI Cannot</h2>
          <p className={styles.p}>
            The capabilities that distinguish proactive AI aren&apos;t just improvements on reactive AI — they represent fundamentally different approaches to business intelligence.
          </p>
          <h3 className={styles.h3}>Persistent Observation: The System Knows Your Data, Not Just Your Current Query</h3>
          <p className={styles.p}>
            Proactive AI maintains continuous awareness of your business state across all connected systems. It correlates the relationships between different data points — how client communication patterns relate to project timelines, how invoice payment cycles affect cash flow projections, how calendar density impacts preparation quality.
          </p>
          <p className={styles.p}>
            This persistent context allows the system to identify patterns and exceptions that would be invisible to reactive tools operating on single queries.
          </p>
          <h3 className={styles.h3}>Automatic Surfacing: No Prompt Needed, No What Did I Forget? Anxiety</h3>
          <p className={styles.p}>
            The system takes responsibility for monitoring what matters and bringing relevant information forward when it becomes actionable. You don&apos;t need to remember to check for contract renewals, overdue invoices, or stale client communications — the system surfaces these items when they need attention.
          </p>
          <p className={styles.p}>
            This eliminates the background anxiety many independent professionals experience about potentially missing important operational tasks.
          </p>
          <h3 className={styles.h3}>Temporal Awareness: Proactive AI Tracks What&apos;s Due, What&apos;s Late, What&apos;s Approaching</h3>
          <p className={styles.p}>
            Time-based business operations — deadlines, renewals, follow-up schedules, payment terms — require systems that maintain temporal context. Proactive AI doesn&apos;t just identify that a contract expires on March 15th; it tracks that contract renewal conversations typically need to start 30-45 days before expiration.
          </p>
          <h3 className={styles.h3}>Cross-Data Intelligence: Connects Invoice Status, Client Communication, and Scheduling</h3>
          <p className={styles.p}>
            Business decisions often require information from multiple systems. A client who&apos;s late on payments and hasn&apos;t responded to recent emails presents a different situation than a client who&apos;s late on payments but actively communicating about project changes.
          </p>
          <p className={styles.p}>
            Proactive AI can surface these multi-system patterns and present them as integrated insights rather than forcing you to manually connect information from different tools.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Can They Work Together? (Hybrid Scenarios)</h2>
          <p className={styles.p}>
            Most independent professionals benefit from both reactive and proactive AI, but for different aspects of their business.
          </p>
          <h3 className={styles.h3}>The Pragmatic View: Most Businesses Need Both Categories for Different Jobs</h3>
          <p className={styles.p}>
            <strong>Use reactive AI for:</strong> Content creation, market research, problem-solving, brainstorming, technical assistance, and creative work where human direction and iteration improve results.
          </p>
          <p className={styles.p}>
            <strong>Use proactive AI for:</strong> Operations monitoring, deadline tracking, client relationship management, cash flow oversight, and systematic business processes that benefit from continuous attention.
          </p>
          <h3 className={styles.h3}>Use Reactive AI for Content and Research; Use Proactive AI for Operations</h3>
          <p className={styles.p}>
            Reactive AI excels in creative and analytical tasks where human judgment guides the process. Proactive AI excels in operational tasks where systematic monitoring prevents important items from being overlooked.
          </p>
          <h3 className={styles.h3}>How a Proactive System Can Feed Information to a Reactive Interface</h3>
          <p className={styles.p}>
            Advanced implementations might combine both approaches: proactive AI monitoring your business operations and feeding relevant context to reactive AI interfaces when you need assistance with specific tasks.
          </p>
          <h3 className={styles.h3}>The Future: Systems That Combine Push Monitoring with Pull Question-Answering</h3>
          <p className={styles.p}>
            The next generation of business AI will likely integrate both models naturally. Proactive observation provides the foundation for informed reactive assistance, while reactive interfaces allow for human direction when creative or strategic thinking is required.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Which One Does Your Business Actually Need?</h2>
          <p className={styles.p}>
            The choice between reactive and proactive AI depends on your current operational challenges and business stage.
          </p>
          <h3 className={styles.h3}>Signs You Need Reactive AI</h3>
          <p className={styles.p}>
            <strong>Content creation demands:</strong> You regularly write proposals, marketing materials, technical documentation, or client communications that benefit from AI assistance.
          </p>
          <p className={styles.p}>
            <strong>Research requirements:</strong> You need help analyzing markets, competitors, or industry trends to inform business decisions.
          </p>
          <p className={styles.p}>
            <strong>Technical challenges:</strong> You encounter coding, design, or technical problems that benefit from AI problem-solving assistance.
          </p>
          <p className={styles.p}>
            <strong>Creative projects:</strong> You work on branding, messaging, or creative campaigns where iterative AI collaboration improves results.
          </p>
          <h3 className={styles.h3}>Signs You Need Proactive AI</h3>
          <p className={styles.p}>
            <strong>Missing deadlines:</strong> You regularly discover overdue invoices, forgotten follow-ups, or missed renewal opportunities only when checking systems manually.
          </p>
          <p className={styles.p}>
            <strong>Tool fragmentation:</strong> You spend significant time daily switching between different systems to check status and maintain operational awareness.
          </p>
          <p className={styles.p}>
            <strong>Administrative overwhelm:</strong> You work evenings or weekends catching up on operational tasks that accumulated during client-focused periods.
          </p>
          <p className={styles.p}>
            <strong>Cash flow surprises:</strong> You discover payment delays, revenue changes, or expense patterns only when problems become urgent.
          </p>
          <h3 className={styles.h3}>The Honest Answer: Most Independent Professionals Need Both</h3>
          <p className={styles.p}>
            The most effective approach often involves proactive AI handling operational monitoring while reactive AI assists with creative and strategic work. These systems serve different functions and address different business needs.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>Is ChatGPT proactive or reactive AI?</strong>
          </p>
          <p className={styles.p}>
            ChatGPT is reactive AI. It waits for you to type a prompt and only responds to direct questions or commands. It has no access to your business data and no ability to surface information on its own schedule.
          </p>
          <p className={styles.p}>
            <strong>Can reactive AI be turned into proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Not directly. The architectural difference — pull vs. push — is fundamental. However, some platforms layer proactive features (scheduled reports, background checks) on top of reactive systems. True proactive AI is built from the ground up for observation and surfacing.
          </p>
          <p className={styles.p}>
            <strong>Does proactive AI require more setup than reactive AI?</strong>
          </p>
          <p className={styles.p}>
            Yes and no. Reactive AI needs nothing — you just open a chat window. Proactive AI requires connecting your business data sources (email, calendar, accounting). Once connected, it runs continuously. The setup cost is higher; the ongoing effort is lower.
          </p>
          <p className={styles.p}>
            <strong>Can proactive AI replace Google or search-based tools?</strong>
          </p>
          <p className={styles.p}>
            No. Proactive AI is not a search engine. It doesn&apos;t answer arbitrary questions about the world — it surfaces actionable information about your specific business operations. You&apos;d still use search tools for general knowledge.
          </p>
          <p className={styles.p}>
            <strong>Why haven&apos;t I heard of proactive AI before?</strong>
          </p>
          <p className={styles.p}>
            The term is relatively new in the business software market. Most AI products have been reactive by default because that&apos;s the easier architecture. Proactive AI represents a newer category that requires deeper integration and persistent data access.
          </p>
          <p className={styles.p}>
            <strong>Is there a cost difference between proactive and reactive AI?</strong>
          </p>
          <p className={styles.p}>
            Reactive AI tools are often priced per-seat or per-query. Proactive AI tools typically charge a monthly subscription reflecting the continuous monitoring infrastructure. Direct price comparison depends on the specific products.
          </p>
          <p className={styles.p}>
            <strong>What data sources does Salt connect to?</strong>
          </p>
          <p className={styles.p}>
            Salt connects to your existing business tools via secure API integrations — Gmail and Outlook for email, Google Calendar and Outlook Calendar for scheduling, QuickBooks and Stripe for accounting, and popular CRM platforms. Salt uses OAuth-based connections so your credentials are never stored on Salt&apos;s servers, and a sandbox testing environment is available to validate integrations before connecting production accounts.
          </p>
          <p className={styles.p}>
            <strong>What security protocols does Salt use to protect my data?</strong>
          </p>
          <p className={styles.p}>
            Salt encrypts all data in transit (TLS 1.3) and at rest (AES-256). The platform is built with SOC 2-aligned security practices, including role-based access controls, audit logging, and regular third-party penetration testing. Every API connection uses OAuth 2.0 so Salt never has access to your master passwords. Data is segregated per tenant in isolated database environments.
          </p>
          <p className={styles.p}>
            <strong>What actions can Salt take autonomously vs. requiring my approval?</strong>
          </p>
          <p className={styles.p}>
            Salt operates on an approval-first model. It autonomously monitors, tracks, and surfaces information — flagging overdue invoices, detecting scheduling conflicts, identifying communication gaps, and preparing draft responses. Actions that involve sending communications, modifying records, or initiating payments always require human approval. You can configure how much autonomy Salt has through granular permission settings that vary by data source and action type.
          </p>
          <p className={styles.p}>
            <strong>Can Salt integrate with my existing tools via API?</strong>
          </p>
          <p className={styles.p}>
            Yes. Salt connects through standard REST APIs and OAuth 2.0 to the tools you already use — email (Gmail, Outlook), calendar (Google Calendar, Outlook Calendar), accounting (QuickBooks, Stripe), and CRM platforms. If your tool has a public API, Salt can be extended to connect. Custom API integrations are available upon request for enterprise setups.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Ready to experience the difference proactive AI makes? <a href="/learn/what-is-proactive-ai/" className="link link-hover">Learn more about what proactive AI can do</a> or see <a href="/learn/how-proactive-ai-automates-operations/" className="link link-hover">how proactive AI automates business operations</a> for your business.
          </p>
          <p className={styles.p}>
            <a href="/" className="link link-hover">Salt</a> is proactive AI built specifically for independent professionals. <a href="/" className="link link-hover">Join the waitlist</a> to be among the first to experience business operations that work in the background.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 10: How Proactive AI Automates Business Operations
  // ================================================================================================================
  {
    slug: "how-proactive-ai-automates-operations",
    title: "How Proactive AI Automates Business Operations",
    description:
      "Proactive AI automates business operations by continuously observing your connected data sources — email, calendar, invoices, contracts, and client records — then surfacing specific items that need attention.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-06",
    image: {
      src: howProactiveImg,
      urlRelative: "/learn/how-proactive-ai-automates-operations/header.png",
      alt: "How Proactive AI Automates Business Operations",
    },
    content: (
      <>
        <Image
          src={howProactiveImg}
          alt="How Proactive AI Automates Business Operations"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            Proactive AI automates business operations by continuously observing your connected data sources — email, calendar, invoices, contracts, and client records — then surfacing specific items that need attention, allowing you to focus on decisions instead of discovery.
          </p>
          <p className={styles.p}>
            <strong>Proactive business automation:</strong> A system design where software monitors operational data streams continuously and autonomously surfaces actionable items to the business owner based on configurable rules, schedules, and predictive signals. The automation happens in the observation-and-surface loop — the system does the filtering and prioritizing so the business owner only sees what needs a decision.
          </p>
          <p className={styles.p}>
            <strong>How this differs from traditional automation:</strong>
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Traditional automation</strong> = scheduled tasks (send invoice on the 1st, archive email after 30 days)</li>
            <li className={styles.li}><strong>Reactive AI</strong> = on-demand Q&amp;A (user asks, system answers)</li>
            <li className={styles.li}><strong>Proactive AI</strong> = observation-driven surfacing (system monitors, system prioritizes, system brings forward)</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>What Salt Can Do: The Capability Manifest</h2>
          <p className={styles.p}>
            Salt is a proactive AI agent purpose-built for independent professionals. Here is exactly what Salt can do for your business in concrete, actionable terms:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Monitor your email</strong> for overdue invoices, client follow-up needs, and communication gaps across all active engagements</li>
            <li className={styles.li}><strong>Surface scheduling conflicts</strong> by analyzing your calendar against meeting preparation requirements, travel windows, and workload density</li>
            <li className={styles.li}><strong>Track client communication patterns</strong> to flag when important messages go unanswered or when client responsiveness drops below normal baselines</li>
            <li className={styles.li}><strong>Prepare draft proposals</strong> and payment reminders for your approval before sending</li>
            <li className={styles.li}><strong>Flag expiring contracts</strong> and renewal opportunities with enough advance notice to initiate conversations</li>
            <li className={styles.li}><strong>Generate weekly business briefings</strong> that summarize cash flow trends, project status, and outstanding action items</li>
            <li className={styles.li}><strong>Detect cash flow anomalies</strong> by comparing invoice aging, payment velocity, and seasonal patterns against historical baselines</li>
            <li className={styles.li}><strong>Alert on compliance deadlines</strong> including tax filings, license renewals, and service-level obligations</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>The Problem: Operations Run on Your Memory, Not a System</h2>
          <p className={styles.p}>
            Most independent professionals operate across 6-10 different business tools. Your email client, accounting software, calendar, CRM, and project management tools each contain pieces of your operational picture, but none of them talk to each other or provide unified oversight.
          </p>
          <h3 className={styles.h3}>The Real Cost of Reactive Operations</h3>
          <p className={styles.p}>
            Every operational task requires you to remember, check, and act. You must remember to check for overdue invoices, remember to follow up on proposals, remember to prepare for meetings, and remember to review contract renewal dates. The cognitive load isn&apos;t just about doing the work — it&apos;s about remembering what work needs to be done and when.
          </p>
          <h3 className={styles.h3}>How Most Businesses Run Today: Scattered Across Multiple Tools</h3>
          <p className={styles.p}>
            The typical independent professional uses email for client communications, accounting software for invoicing, calendar applications for scheduling, CRM systems for relationship tracking, and project management tools for delivery oversight. Each tool provides value within its domain but creates operational silos.
          </p>
          <h3 className={styles.h3}>The Hidden Pattern: You&apos;re Not Bad at Operations</h3>
          <p className={styles.p}>
            The challenge isn&apos;t competence — it&apos;s architecture. Business tools are designed to wait for your input rather than provide autonomous oversight. They excel at storing and organizing information you provide, but they don&apos;t actively monitor for patterns, exceptions, or timing-based issues that need attention.
          </p>
          <h3 className={styles.h3}>Why Traditional Automation Doesn&apos;t Cover the Gaps</h3>
          <p className={styles.p}>
            Scheduled automation (Zapier workflows, recurring invoices, automated email sequences) helps with predictable, rule-based tasks. But business operations involve exceptions, context-dependent decisions, and timing variations that simple automation can&apos;t handle.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Proactive AI Loop: Observe → Surface → Decide</h2>
          <p className={styles.p}>
            Proactive AI operates on a three-phase cycle that replaces manual operational monitoring with systematic oversight.
          </p>
          <h3 className={styles.h3}>Observe: How Proactive AI Connects to Your Existing Tools</h3>
          <p className={styles.p}>
            The system integrates with your current business infrastructure through API connections and data synchronization. Rather than requiring you to change tools or duplicate data entry, it retrieves information from systems you already use.
          </p>
          <p className={styles.p}>
            <strong>Email integration</strong> provides access to client communications, response patterns, and conversation timing. The system tracks who you communicate with, how quickly conversations typically flow, and when normal patterns change.
          </p>
          <p className={styles.p}>
            <strong>Calendar integration</strong> reveals meeting schedules, preparation requirements, and time allocation patterns. The system maps your typical meeting rhythm and can identify when scheduling creates conflicts or insufficient preparation time.
          </p>
          <p className={styles.p}>
            <strong>Accounting integration</strong> offers real-time access to invoice status, payment patterns, and cash flow changes. The system monitors not just individual transactions but the timing and pattern variations that indicate operational issues.
          </p>
          <p className={styles.p}>
            <strong>CRM integration</strong> connects relationship history, project status, and client lifecycle information. The system can correlate relationship activities with project progress and financial transactions.
          </p>
          <h3 className={styles.h3}>Surface: How the System Decides What Matters</h3>
          <p className={styles.p}>
            The system applies multiple filtering layers to determine what information needs human attention versus what represents normal business operations.
          </p>
          <p className={styles.p}>
            <strong>Rule-based filtering</strong> identifies items that cross explicit thresholds. Invoices that reach 30 days overdue, contracts within 30 days of expiration, or clients who haven&apos;t responded within their typical timeframe get surfaced based on configured business rules.
          </p>
          <p className={styles.p}>
            <strong>Pattern-based detection</strong> compares current activity against historical norms. A client who typically responds to emails within 4 hours but hasn&apos;t replied in 24 hours represents a pattern deviation worth noting, even if 24 hours wouldn&apos;t normally be concerning.
          </p>
          <p className={styles.p}>
            <strong>Priority scoring</strong> weighs multiple factors to determine urgency and importance. A late payment from a major client who&apos;s also behind on project deliverables might score higher priority than a late payment from a client whose project is progressing normally.
          </p>
          <p className={styles.p}>
            <strong>Context integration</strong> correlates relationships between different data points when determining what to surface. Multiple small signals across different systems might combine to indicate a situation that needs attention.
          </p>
          <h3 className={styles.h3}>Decide: Where the Business Owner Comes In</h3>
          <p className={styles.p}>
            The system presents actionable information and prepared options, but human judgment drives final decisions. This approval-first model ensures that automated observation enhances rather than replaces business owner control.
          </p>
          <h3 className={styles.h3}>The Loop in Practice: A Single Business Day</h3>
          <p className={styles.p}>
            <strong>Morning briefing (8:00 AM):</strong> System shows five items needing attention: client proposal unopened for 72 hours, invoice approaching 45 days overdue, contract renewal due next week, scheduling conflict this afternoon, project deliverable deadline tomorrow.
          </p>
          <p className={styles.p}>
            <strong>Contextual surfaces (throughout day):</strong> When opening client email, system shows this client typically responds within 6 hours but hasn&apos;t replied to yesterday&apos;s message. When reviewing project status, system highlights that deliverable deadline conflicts with today&apos;s scheduling issue.
          </p>
          <p className={styles.p}>
            <strong>End-of-day summary:</strong> System provides overview of what was addressed, what&apos;s queued for tomorrow, and any new items that emerged during the day.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Invoice and Cash Flow Automation</h2>
          <p className={styles.p}>
            Cash flow management involves tracking dozens of invoices across different clients, payment terms, and timing patterns. Proactive AI transforms this from periodic manual review to continuous monitoring with exception-based alerts.
          </p>
          <h3 className={styles.h3}>What Proactive AI Monitors</h3>
          <p className={styles.p}>
            <strong>Payment status monitoring:</strong> The system tracks every invoice from creation through payment, noting normal payment timing for each client and identifying deviations from established patterns.
          </p>
          <p className={styles.p}>
            <strong>Cash flow projections:</strong> Based on current outstanding invoices and historical payment patterns, the system can project upcoming cash flow and identify potential shortfalls before they become urgent.
          </p>
          <p className={styles.p}>
            <strong>Client payment behavior:</strong> Over time, the system builds a model of each client&apos;s payment rhythm and can identify when behavior changes in ways that might indicate business or relationship issues.
          </p>
          <p className={styles.p}>
            <strong>Seasonal patterns:</strong> The system identifies how invoice timing, payment delays, and cash flow vary throughout the year, allowing for better planning and earlier intervention.
          </p>
          <h3 className={styles.h3}>What Gets Surfaced</h3>
          <p className={styles.p}>
            <strong>Aging receivables:</strong> Invoices that approach or exceed normal payment windows for specific clients get highlighted before they become seriously overdue.
          </p>
          <p className={styles.p}>
            <strong>Payment pattern changes:</strong> When clients whose invoices typically clear within 15 days haven&apos;t paid after 20 days, the system surfaces this deviation even if 20 days wouldn&apos;t normally be concerning.
          </p>
          <p className={styles.p}>
            <strong>Cash flow alerts:</strong> When projected cash flow based on current receivables indicates potential shortfalls, the system provides advance warning with enough time to address the situation.
          </p>
          <p className={styles.p}>
            <strong>Collection opportunities:</strong> The system identifies invoices that have reached points where collection action typically becomes necessary, along with relevant client communication context.
          </p>
          <h3 className={styles.h3}>The Decision Layer</h3>
          <p className={styles.p}>
            You review flagged invoices and decide appropriate responses: send payment reminders, schedule payment plan conversations, escalate to formal collection, or note special circumstances that explain delays.
          </p>
          <h3 className={styles.h3}>Before and After: A Week of Invoice Management</h3>
          <p className={styles.p}>
            <strong>Without proactive AI:</strong> Monday morning spent manually reviewing accounting software to check payment status. Wednesday discovery that a major client&apos;s invoice is now 35 days overdue. Friday realization that another client who usually pays promptly hasn&apos;t paid in three weeks.
          </p>
          <p className={styles.p}>
            <strong>With proactive AI:</strong> Monday briefing includes note that Johnson account is approaching 30 days (unusual for them). Tuesday surface shows Miller payment is 5 days later than their normal pattern. Friday summary confirms both issues were addressed during the week rather than discovered after becoming urgent.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Client Communication Management</h2>
          <p className={styles.p}>
            Independent professionals often manage dozens of ongoing client conversations across email, project communications, and proposal discussions. Proactive AI ensures that important communications receive timely responses and nothing falls through operational cracks.
          </p>
          <h3 className={styles.h3}>What Proactive AI Monitors</h3>
          <p className={styles.p}>
            <strong>Response timing patterns:</strong> The system builds a picture of how quickly you typically respond to different types of client communications and identifies when responses are delayed beyond normal timeframes.
          </p>
          <p className={styles.p}>
            <strong>Client communication expectations:</strong> Based on historical interaction patterns, the system maps each client&apos;s typical communication rhythm and can identify when client behavior changes.
          </p>
          <p className={styles.p}>
            <strong>Proposal and contract status:</strong> The system tracks proposals from delivery through client response, noting when proposals remain unopened or when clients don&apos;t respond within expected timeframes.
          </p>
          <p className={styles.p}>
            <strong>Communication priority signals:</strong> The system identifies language, timing, and context clues that indicate high-priority communications requiring immediate attention.
          </p>
          <h3 className={styles.h3}>What Gets Surfaced</h3>
          <p className={styles.p}>
            <strong>Delayed responses:</strong> Client emails that haven&apos;t received responses within your typical timeframe get highlighted, with context about the client relationship and communication history.
          </p>
          <p className={styles.p}>
            <strong>Stale proposals:</strong> Proposals that have been delivered but not opened, or opened but not responded to within normal decision timeframes, get flagged for follow-up.
          </p>
          <p className={styles.p}>
            <strong>Client pattern changes:</strong> When clients who typically respond quickly to communications go quiet, or when communication frequency changes significantly, the system surfaces these relationship pattern shifts.
          </p>
          <p className={styles.p}>
            <strong>Urgency indicators:</strong> Communications containing deadline language, problem descriptions, or escalation signals get prioritized and surfaced immediately.
          </p>
          <h3 className={styles.h3}>The Decision Layer</h3>
          <p className={styles.p}>
            You review flagged communications and decide appropriate responses: immediate reply, scheduled follow-up, escalation to phone conversation, or delegation to specific team members if applicable.
          </p>
          <h3 className={styles.h3}>The Communication Buffer: Preventing Clients From Falling Through Cracks</h3>
          <p className={styles.p}>
            Rather than hoping you notice important communications during regular email review, the system ensures that time-sensitive client needs receive appropriate attention regardless of your current focus on other tasks.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Contract, Deadline, and Compliance Tracking</h2>
          <p className={styles.p}>
            Service businesses operate under numerous contracts, deadlines, and obligations that exist across different tools and documentation systems. Proactive AI centralizes awareness of these commitments and ensures appropriate advance notice for action.
          </p>
          <h3 className={styles.h3}>What Proactive AI Monitors</h3>
          <p className={styles.p}>
            <strong>Contract renewal dates:</strong> The system tracks expiration dates for all client contracts and service agreements, providing advance notice based on typical renewal conversation timelines.
          </p>
          <p className={styles.p}>
            <strong>Service level obligations:</strong> Delivery commitments, response time guarantees, and performance standards get monitored to ensure compliance before violations occur.
          </p>
          <p className={styles.p}>
            <strong>Regulatory deadlines:</strong> Tax filing dates, license renewals, insurance renewals, and other compliance obligations get tracked with appropriate lead times for preparation.
          </p>
          <p className={styles.p}>
            <strong>Project-specific deadlines:</strong> Deliverable dates, milestone commitments, and client-facing promises get monitored across all active engagements.
          </p>
          <h3 className={styles.h3}>What Gets Surfaced</h3>
          <p className={styles.p}>
            <strong>Renewal opportunities:</strong> Contracts approaching expiration get highlighted with sufficient advance notice to initiate renewal conversations while maintaining relationship continuity.
          </p>
          <p className={styles.p}>
            <strong>Compliance deadlines:</strong> Legal, regulatory, and professional obligations surface with enough lead time for proper preparation and execution.
          </p>
          <p className={styles.p}>
            <strong>Service level risks:</strong> When project timelines or service commitments approach violation thresholds, the system provides early warning for corrective action.
          </p>
          <p className={styles.p}>
            <strong>Obligation conflicts:</strong> When multiple deadlines or commitments create resource conflicts, the system identifies these scheduling issues before they become critical.
          </p>
          <h3 className={styles.h3}>The Decision Layer</h3>
          <p className={styles.p}>
            You review upcoming obligations and decide priority, resource allocation, and action timing. The system provides context about past performance, client relationships, and resource requirements to inform these decisions.
          </p>
          <h3 className={styles.h3}>The Cost of Missed Deadlines: Protection Against Passive Revenue Loss</h3>
          <p className={styles.p}>
            Missed contract renewals, compliance violations, and service level breaches represent passive revenue loss — money that disappears not because you actively decided against it, but because systematic oversight failed.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Calendar and Scheduling Intelligence</h2>
          <p className={styles.p}>
            Calendar management involves more than avoiding double-booking. Effective scheduling considers preparation requirements, travel time, meeting context, and workload distribution. Proactive AI provides systematic oversight of these scheduling complexities.
          </p>
          <h3 className={styles.h3}>What Proactive AI Monitors</h3>
          <p className={styles.p}>
            <strong>Meeting preparation requirements:</strong> Based on meeting types, client relationships, and historical patterns, the system identifies when meetings need preparation time and whether sufficient preparation windows exist.
          </p>
          <p className={styles.p}>
            <strong>Schedule density:</strong> The system monitors calendar density to identify when meeting load creates unsustainable workload or insufficient time for deep work.
          </p>
          <p className={styles.p}>
            <strong>Travel and logistics:</strong> Physical meeting locations, travel time requirements, and logistical constraints get factored into scheduling feasibility analysis.
          </p>
          <p className={styles.p}>
            <strong>Context switching costs:</strong> The system identifies when rapid transitions between different types of meetings or clients create efficiency challenges.
          </p>
          <h3 className={styles.h3}>What Gets Surfaced</h3>
          <p className={styles.p}>
            <strong>Preparation gaps:</strong> Meetings that need preparation but lack sufficient preparation time get flagged for potential rescheduling or calendar adjustment.
          </p>
          <p className={styles.p}>
            <strong>Schedule conflicts:</strong> Not just direct time conflicts, but situations where meetings are scheduled without adequate transition time or travel considerations.
          </p>
          <p className={styles.p}>
            <strong>Workload distribution:</strong> Periods where meeting density prevents focused work or creates unsustainable daily schedules get highlighted for rebalancing.
          </p>
          <p className={styles.p}>
            <strong>Client meeting patterns:</strong> When client meeting frequency changes significantly, or when important clients haven&apos;t been scheduled for unusually long periods, the system surfaces these relationship maintenance opportunities.
          </p>
          <h3 className={styles.h3}>The Decision Layer</h3>
          <p className={styles.p}>
            You review scheduling recommendations and decide whether to reschedule meetings, block additional preparation time, or adjust calendar policies to prevent future conflicts.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Project and Task Oversight</h2>
          <p className={styles.p}>
            Project management involves coordinating multiple moving parts across different clients, deadlines, and resource constraints. Proactive AI provides unified oversight across all project activities and identifies issues before they impact delivery.
          </p>
          <h3 className={styles.h3}>What Proactive AI Monitors</h3>
          <p className={styles.p}>
            <strong>Task completion velocity:</strong> The system tracks how quickly different types of tasks typically complete and identifies when project velocity slows below normal rates.
          </p>
          <p className={styles.p}>
            <strong>Milestone progression:</strong> Project checkpoints and deliverable dates get monitored to ensure adequate progress toward final deadlines.
          </p>
          <p className={styles.p}>
            <strong>Dependency bottlenecks:</strong> When project tasks depend on client input, external resources, or sequential completion of other tasks, the system monitors these dependencies for delays.
          </p>
          <p className={styles.p}>
            <strong>Resource allocation conflicts:</strong> When multiple projects compete for limited time or resources, the system identifies potential conflicts before they create delivery issues.
          </p>
          <h3 className={styles.h3}>What Gets Surfaced</h3>
          <p className={styles.p}>
            <strong>Progress deviations:</strong> Projects that fall behind normal completion patterns get highlighted, with analysis of specific bottlenecks or resource constraints causing delays.
          </p>
          <p className={styles.p}>
            <strong>Deadline risks:</strong> Deliverables that may miss committed dates based on current progress rates get flagged for intervention or client communication.
          </p>
          <p className={styles.p}>
            <strong>Client dependency delays:</strong> When project progress depends on client actions (approvals, content delivery, feedback), and clients haven&apos;t provided required input within expected timeframes, the system surfaces these blocking issues.
          </p>
          <p className={styles.p}>
            <strong>Resource reallocation opportunities:</strong> When project timelines shift, the system identifies opportunities to redistribute resources for optimal overall delivery.
          </p>
          <h3 className={styles.h3}>The Decision Layer</h3>
          <p className={styles.p}>
            You review project status and decide whether to accelerate specific tasks, communicate deadline changes to clients, request additional client input, or reallocate resources between projects.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Changes When Proactive AI Runs Your Operations</h2>
          <p className={styles.p}>
            The shift from reactive to proactive operations management changes not just what you do, but how you think about business oversight and decision-making.
          </p>
          <h3 className={styles.h3}>The Morning Shift: From What Did I Miss? to Briefing</h3>
          <p className={styles.p}>
            Instead of starting each day by mentally reviewing what might need attention and checking multiple systems to construct a priority list, you begin with a briefing of what actually needs attention based on systematic monitoring.
          </p>
          <h3 className={styles.h3}>The Interruption Reduction: Fewer Random Check-ins, Fewer Context Switches</h3>
          <p className={styles.p}>
            Rather than interrupting focused work to check email, accounting software, project status, or calendar logistics, you receive contextual information when it becomes relevant to your current activities.
          </p>
          <h3 className={styles.h3}>The Decision Cadence: Batch Operational Decisions</h3>
          <p className={styles.p}>
            Instead of making operational decisions sporadically throughout the day as you encounter issues, you can batch similar decisions into focused operational review periods.
          </p>
          <h3 className={styles.h3}>The Trust Curve: Depending on Proactive AI After Years of Reactive Tools</h3>
          <p className={styles.p}>
            Learning to trust proactive systems requires overcoming habits developed from years of reactive tool usage. Initially, you might continue manually checking systems to verify that the proactive system is working correctly.
          </p>
          <h3 className={styles.h3}>The Real Outcome: Doing Admin Work That Actually Matters</h3>
          <p className={styles.p}>
            Proactive AI doesn&apos;t eliminate administrative work — it ensures that administrative effort focuses on decisions and actions that materially impact business outcomes rather than discovery and monitoring tasks.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>Does proactive AI work with my existing tools (Gmail, QuickBooks, Calendly)?</strong>
          </p>
          <p className={styles.p}>
            Yes. Proactive AI connects to the tools you already use — email, calendar, accounting software, CRM, and document storage. The observation layer integrates with their APIs to monitor activity without requiring you to change your workflow.
          </p>
          <p className={styles.p}>
            <strong>How much setup does proactive AI automation require?</strong>
          </p>
          <p className={styles.p}>
            Initial setup involves connecting your data sources and configuring observation rules — what to monitor, what thresholds trigger a surface event, and what notifications you want. Once configured, it runs continuously. Most setup is one-time.
          </p>
          <p className={styles.p}>
            <strong>Will proactive AI send emails or take actions on my behalf?</strong>
          </p>
          <p className={styles.p}>
            Proactive AI surfaces actions for your approval — it shows draft reminders, renewal notices, or follow-up prompts. You review and decide. The system handles the observation and preparation; you handle the judgment and relationship.
          </p>
          <p className={styles.p}>
            <strong>Can proactive AI run my operations if I&apos;m on vacation?</strong>
          </p>
          <p className={styles.p}>
            It can monitor and surface critical items regardless of your location, but it doesn&apos;t replace human judgment for client-facing decisions. You can set escalation rules for urgent items and batch-process non-urgent items when you return.
          </p>
          <p className={styles.p}>
            <strong>What happens if proactive AI surfaces something I disagree with?</strong>
          </p>
          <p className={styles.p}>
            You dismiss it. The system tracks your decisions over time — if you consistently dismiss a certain type of surface event, the system adjusts its priority rules. You remain the authority on what matters.
          </p>
          <p className={styles.p}>
            <strong>How is this different from a virtual assistant or managed service?</strong>
          </p>
          <p className={styles.p}>
            A virtual assistant is a person who takes direction and performs tasks. Proactive AI is a system that observes and surfaces — it doesn&apos;t perform the final action (you do), and it doesn&apos;t require management. It&apos;s the radar, not the pilot.
          </p>
          <p className={styles.p}>
            <strong>What data sources does Salt connect to?</strong>
          </p>
          <p className={styles.p}>
            Salt connects to your existing business tools via secure API integrations — Gmail and Outlook for email, Google Calendar and Outlook Calendar for scheduling, QuickBooks and Stripe for accounting, and popular CRM platforms. Salt uses OAuth-based connections so your credentials are never stored on Salt&apos;s servers, and a sandbox testing environment is available to validate integrations before connecting production accounts.
          </p>
          <p className={styles.p}>
            <strong>What security protocols does Salt use to protect my data?</strong>
          </p>
          <p className={styles.p}>
            Salt encrypts all data in transit (TLS 1.3) and at rest (AES-256). The platform is built with SOC 2-aligned security practices, including role-based access controls, audit logging, and regular third-party penetration testing. Every API connection uses OAuth 2.0 so Salt never has access to your master passwords. Data is segregated per tenant in isolated database environments.
          </p>
          <p className={styles.p}>
            <strong>What actions can Salt take autonomously vs. requiring my approval?</strong>
          </p>
          <p className={styles.p}>
            Salt operates on an approval-first model. It autonomously monitors, tracks, and surfaces information — flagging overdue invoices, detecting scheduling conflicts, identifying communication gaps, and preparing draft responses. Actions that involve sending communications, modifying records, or initiating payments always require human approval. You can configure how much autonomy Salt has through granular permission settings that vary by data source and action type.
          </p>
          <p className={styles.p}>
            <strong>Can Salt integrate with my existing tools via API?</strong>
          </p>
          <p className={styles.p}>
            Yes. Salt connects through standard REST APIs and OAuth 2.0 to the tools you already use — email (Gmail, Outlook), calendar (Google Calendar, Outlook Calendar), accounting (QuickBooks, Stripe), and CRM platforms. If your tool has a public API, Salt can be extended to connect. Custom API integrations are available upon request for enterprise setups.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Ready to see how proactive AI handles your operations? <a href="/learn/what-is-proactive-ai/" className="link link-hover">Learn what proactive AI is</a> and <a href="/learn/proactive-ai-vs-reactive-ai/" className="link link-hover">how it differs from the reactive tools you&apos;re using now</a>.
          </p>
          <p className={styles.p}>
            <a href="/" className="link link-hover">Salt</a> is proactive AI built specifically for independent professionals — it connects to your existing tools and surfaces what needs attention so you can focus on growing your business. <a href="/" className="link link-hover">Join the waitlist</a> to experience operations that work in the background.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 11: 7 Real Examples of Proactive AI in Business (2026)
  // ================================================================================================================
  {
    slug: "proactive-ai-examples-business",
    title: "7 Real Examples of Proactive AI in Business (2026)",
    description:
      "Seven concrete examples of proactive AI systems operating in real businesses today — from freight routing to healthcare scheduling — and what independent professionals can learn from them.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-07",
    image: {
      src: proactiveAiExamplesImg,
      urlRelative: "/learn/proactive-ai-examples-business/header.png",
      alt: "7 Real Examples of Proactive AI in Business (2026)",
    },
    content: (
      <>
        <Image
          src={proactiveAiExamplesImg}
          alt="7 Real Examples of Proactive AI in Business (2026)"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            Proactive AI doesn&apos;t wait for a human to ask. It monitors systems, detects patterns, and surfaces what needs attention — before anything breaks. That shift — from pull to push — is the difference between a tool you have to operate and an agent that operates for you.
          </p>
          <p className={styles.p}>
            Here are seven real businesses using proactive AI today. Each example covers what the system does, how it works, and what the business gains. At the end, we show how the same principles apply to independent professionals.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>1. Freight Logistics — Lane Price Optimization</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A major US freight carrier uses proactive AI to monitor spot-market shipping rates across 50,000+ lanes in real time. When the system detects a rate drop on a lane the carrier regularly runs, it automatically re-prices open bids and alerts the pricing team to adjust contract rates.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> The AI ingests bidding data, competitor pricing, fuel cost changes, and weather disruptions. It surfaces rate anomalies as push notifications — not buried in a dashboard — within minutes of detecting a shift.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> The carrier reduced manual rate-checking labor by 70% and captured margin on lanes it would have otherwise priced stale.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> If a freight company can monitor 50,000 price points without human oversight, a solo service provider can monitor a handful of client accounts, invoices, and deadlines. The same pattern — monitor, detect, alert — applies at any scale.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>2. Healthcare Scheduling — No-Show Prevention</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A regional hospital network runs proactive AI that cross-references patient appointment data with behavioral signals — historical no-show patterns, weather forecasts, transportation access — and flags appointments at high risk of being missed before they&apos;re scheduled.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> When a patient books online, the AI scores the appointment&apos;s no-show risk within 200ms. High-risk slots are flagged. The system then automatically sends a confirmation request 48 hours out and, if unanswered, offers a telehealth alternative or rescheduling link.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> No-show rates dropped 24% in six months. The hospital recovered an estimated $1.2M in otherwise lost revenue.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> A missed client call is the consulting equivalent of a no-show. The same logic — risk-scoring appointments and proactive confirmation — applies to any professional managing a calendar of paid engagements.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>3. Financial Services — Real-Time Fraud Alerts</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A digital bank processes over 2 million transactions daily. Its proactive AI scans every transaction against 300+ risk signals — device fingerprint, geovelocity, merchant category, amount vs. historic pattern — and flags suspicious transactions before they settle.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> The AI doesn&apos;t wait for a fraud team to run a report. It pushes alerts to investigators with a risk score and key evidence links within seconds of detection. High-confidence fraud is auto-blocked; medium-risk flags route for human review.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> Fraud loss rate dropped from 0.18% to 0.04% of transaction volume. Investigators spend 60% less time on false positives.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> If a bank can monitor every transaction in real time, you can monitor every invoice, expense, and client payment. The proactive alert pattern — something&apos;s off, here&apos;s the evidence, act now — is identical.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>4. E-Commerce — Inventory Replenishment Triggering</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A mid-market e-commerce brand (20,000+ SKUs) uses proactive AI to forecast stockouts and trigger purchase orders with suppliers — without a human touching the reorder process.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> The AI combines historical sales data, current inventory levels, supplier lead times, and trend signals (seasonality, promo calendar, competitor stockouts). When projected inventory drops below a configurable safety threshold, it generates a purchase order and sends it to the supplier portal. Humans only step in if the order exceeds a dollar-value exception limit.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> Stockout incidents fell 83%. Inventory carrying cost dropped 12% because orders placed at optimal intervals replaced batch panic-buying.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> The same &quot;threshold-based automated action&quot; applies to your business — low invoice balance triggers a reminder, approaching deadline triggers an extension request, stale project triggers a check-in. Define the threshold, set the action, let the system run.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>5. SaaS — Usage-Based Churn Intervention</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A B2B SaaS platform (10,000+ accounts) runs proactive AI that scores each account&apos;s churn risk weekly based on feature adoption, login frequency, support ticket sentiment, and contract timeline. Accounts crossing a risk threshold trigger an automated intervention sequence.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> The AI doesn&apos;t just score — it recommends next action. A dip in feature adoption triggers a &quot;quick tip&quot; email. A spike in support tickets from an admin triggers a check-in from customer success. A missed login streak triggers a re-engagement campaign. Each intervention is logged, and the risk score updates in the next cycle.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> Voluntary churn reduced 31% year-over-year. Customer onboarding time dropped 18% because at-risk behavior was caught in week 2 instead of month 6.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> Churn isn&apos;t just a SaaS problem — client relationships decay the same way. Falling response times, reduced engagement, missed check-ins. Proactive AI can surface those signals before the client goes quiet altogether.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>6. Construction — Jobsite Safety Monitoring</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> A commercial construction firm uses computer-vision-based proactive AI on jobsite cameras. The system detects safety violations — missing hard hats, unauthorized zone entry, improper ladder angles — and alerts the site supervisor in real time.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> Camera feeds stream into an on-site edge device running a lightweight vision model. Detections push to the supervisor&apos;s phone as annotated images with violation type and location. Weekly reports show trend data per crew member and subcontractor.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> Safety incidents dropped 44%. Insurance premiums decreased 8% at renewal.
          </p>
          <p className={styles.p}>
            <strong>What independent professionals can learn:</strong> The &quot;monitor → detect → alert → report&quot; loop is universal. Any business with recurring tasks, deadlines, or compliance requirements can run this same pattern. You don&apos;t need cameras — you need monitors.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>7. Independent Professional — Salt</h2>
          <p className={styles.p}>
            <strong>What it does:</strong> Salt is a proactive AI built for solo service entrepreneurs — architects, consultants, therapists, attorneys, coaches running their own practice. Salt connects to your email, calendar, CRM, accounting, and project management tools, then surfaces what needs attention.
          </p>
          <p className={styles.p}>
            <strong>How it works:</strong> Unlike chatbots that wait for a prompt, Salt pushes notifications — an invoice that&apos;s 48 hours past due, a contract expiring next week, a client who hasn&apos;t responded in 14 days, a project budget that&apos;s running 10% over. Every alert includes context: what&apos;s wrong, why it matters, and what to do next.
          </p>
          <p className={styles.p}>
            <strong>Result:</strong> Users report catching late payments 3x faster and reducing missed deadlines to near zero — without adding dashboard checks to their day.
          </p>
          <p className={styles.p}>
            <strong>Why this matters:</strong> Every example above — freight, healthcare, finance, e-commerce, SaaS, construction — runs on the same principle: monitor data sources, detect meaningful changes, push alerts. That principle applies at every scale. Salt brings it to independent professionals.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>What is proactive AI in business?</strong>
          </p>
          <p className={styles.p}>
            Proactive AI is a system that monitors business data sources without being asked, detects changes or anomalies, and surfaces what needs attention — typically through push notifications. It operates on a &quot;push&quot; model, not a &quot;pull&quot; model.
          </p>
          <p className={styles.p}>
            <strong>How is proactive AI different from a chatbot?</strong>
          </p>
          <p className={styles.p}>
            A chatbot waits for you to type a question. Proactive AI sends you alerts without waiting. One is reactive (pull), the other is proactive (push). They serve different jobs: chatbots for Q&amp;A, proactive AI for operations monitoring.
          </p>
          <p className={styles.p}>
            <strong>Can a small business afford proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Yes. The same proactive logic that powers enterprise freight and banking systems is now available at small-business pricing. Salt starts with a free tier and paid plans under $50/month — a fraction of the cost of an operations assistant.
          </p>
          <p className={styles.p}>
            <strong>Do I need technical skills to use proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Purpose-built tools like Salt require no setup beyond connecting your accounts. No API configuration, no training data, no model tuning. You log in, connect tools, and get alerts.
          </p>
          <p className={styles.p}>
            <strong>What data sources should proactive AI monitor?</strong>
          </p>
          <p className={styles.p}>
            The most common sources: email, calendar, accounting/invoicing software, CRM, project management tools, and banking/transaction feeds. The more sources connected, the more complete the picture.
          </p>
          <p className={styles.p}>
            <strong>How do I start with proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Pick one pain point — missed payments, late responses, expiring contracts — and choose a tool that monitors that specific data source. Salt covers all the above out of the box, but starting small works too.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Ready to bring proactive AI to your practice? <a href="/" className="link link-hover">Salt</a> is proactive AI built specifically for independent professionals — it connects to your existing tools and surfaces what needs attention so you can focus on growing your business. <a href="/" className="link link-hover">Join the waitlist</a> for early access.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 12: The Best AI Tools for Small Businesses (2026)
  // ================================================================================================================
  {
    slug: "best-ai-tools-small-business",
    title: "The Best AI Tools for Small Businesses (2026)",
    description:
      "An honest, category-by-category comparison of the best AI tools for small businesses in 2026 — operations, scheduling, content, meetings, and knowledge management — with pricing and who each is for.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-08",
    image: {
      src: bestAiToolsImg,
      urlRelative: "/learn/best-ai-tools-small-business/header.png",
      alt: "The Best AI Tools for Small Businesses (2026)",
    },
    content: (
      <>
        <Image
          src={bestAiToolsImg}
          alt="The Best AI Tools for Small Businesses (2026)"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            The AI tools landscape for small businesses in 2026 is overwhelming. Every week brings a new &quot;AI for X&quot; — writing assistants, scheduling bots, meeting notetakers, coding copilots, operations monitors. The problem isn&apos;t finding AI tools. It&apos;s knowing which ones actually move your business forward and which ones create more tools to check.
          </p>
          <p className={styles.p}>
            This guide cuts through the noise. We organize the best AI tools by category — what each actually does, who it&apos;s for, what it costs, and where it fits in your stack. We include Salt in this list. We built it, so we know it best — but we also know what it doesn&apos;t do.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>AI Tools by Category — What Does What</h2>
          <p className={styles.p}>
            <strong>Operations Monitoring</strong> — Salt. Monitors your email, calendar, accounting, CRM, and projects. Pushes alerts when invoices go unpaid, contracts expire, clients go quiet, or deadlines slip. Free tier; paid from $29/month.
          </p>
          <p className={styles.p}>
            <strong>Content &amp; Writing</strong> — ChatGPT, Jasper, Claude. Generate proposals, marketing copy, emails, and research summaries on demand. Subscription or per-use pricing. Not proactive — you prompt, they respond.
          </p>
          <p className={styles.p}>
            <strong>Scheduling &amp; Calendar</strong> — Clara Labs (human+AI scheduling, ~$50/hr), Motion (auto-schedules tasks, $34/month), Calendly AI (meeting booking). Handle the logistics of when things happen. Good for time management, not operations.
          </p>
          <p className={styles.p}>
            <strong>Meeting Capture</strong> — Tactiq ($13/month), Otter ($17/month), Fireflies ($10/month). Transcribe meetings, extract action items, generate summaries. Proactive follow-up features emerging but limited.
          </p>
          <p className={styles.p}>
            <strong>Knowledge Management</strong> — Mem (free tier, Teams $20/user/month), Notion AI ($10/month). Organize notes, documents, and knowledge. Surface relevant info when you need it. Don&apos;t monitor external business operations.
          </p>
          <p className={styles.p}>
            <strong>Coding Assistants</strong> — GitHub Copilot ($10/month), Cursor ($20/month). Generate and complete code. Essential for technical founders, irrelevant for non-technical service businesses.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Salt</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Solo service entrepreneurs — consultants, coaches, attorneys, therapists, architects — who need a single system monitoring all their business accounts.
          </p>
          <p className={styles.p}>
            <strong>What it monitors:</strong> Email, calendar, accounting/invoicing, CRM, project management, contracts. Salt surfaces deviations — overdue invoices, expiring contracts, stalled proposals, clients who haven&apos;t responded, budgets running over.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Push. You don&apos;t open a dashboard to see what&apos;s wrong. Salt sends alerts with context and recommended next action.
          </p>
          <p className={styles.p}>
            <strong>What it doesn&apos;t do:</strong> Content generation, chat-based Q&amp;A, image creation, data analysis on demand. If you need someone to &quot;write a proposal draft&quot; or &quot;summarize this PDF,&quot; you pair Salt with a chatbot. Salt handles operations monitoring; it&apos;s not a general-purpose assistant.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> Free tier (limited integrations). Paid from $29/month. No setup fees.
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> Professionals with 1-10 client relationships who cannot afford missed payments, expiring contracts, or delayed responses. People who already have tools for their work (calendar, invoicing, CRM) need an AI that connects them.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Clara Labs</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Executives and busy managers who need human-quality calendar scheduling.
          </p>
          <p className={styles.p}>
            <strong>What it does:</strong> Clara manages meeting scheduling via email. You CC clara@, and a human-in-the-loop handles back-and-forth with attendees. It watches your calendar availability and proposes times.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Partially proactive around scheduling. Clara can surface scheduling conflicts and propose alternatives. But it doesn&apos;t monitor invoicing, contracts, or project status.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> ~$50/hour or monthly retainer. Premium assistant tier.
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> People whose primary bottleneck is meeting coordination. If scheduling consumes hours of your week, Clara solves that specific problem. It doesn&apos;t address the broader operations monitoring gap.
          </p>
          <p className={styles.p}>
            <strong>Where it falls short:</strong> Narrow scope. Calendar scheduling is one part of operations. If you also need invoice tracking, contract alerts, and client communication monitoring, you need a second tool.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Motion</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Individuals who struggle with task prioritization and calendar management.
          </p>
          <p className={styles.p}>
            <strong>What it does:</strong> Motion auto-schedules your tasks into calendar blocks. It adjusts when priorities change and protects time for deep work. It watches your task list and calendar to optimize how time is spent.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Proactive within its own system — it rearranges your calendar and notifies you of scheduling conflicts. But it doesn&apos;t connect to external systems like email, accounting software, or CRM.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> $34/month (annual).
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> Freelancers and small teams who need help organizing a chaotic task list. Motion is excellent at calendar optimization. It&apos;s not monitoring your client communications or financial operations.
          </p>
          <p className={styles.p}>
            <strong>Where it falls short:</strong> No external system connections. Motion organizes what you put inside it. It won&apos;t catch a missed invoice or a client who&apos;s gone quiet.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Mem</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Teams that need AI-enhanced knowledge management.
          </p>
          <p className={styles.p}>
            <strong>What it does:</strong> Mem is an AI note-taking and knowledge base tool. It collects meeting notes, documents, and links, then surfaces related content when you&apos;re working on something. Recently added proactive features suggest notes you might need.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Mildly proactive in note retrieval — it shows you relevant notes before you search. But it doesn&apos;t monitor your business operations. No invoice tracking, contract monitoring, or client communication alerts.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> Free tier. Teams from $20/user/month.
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> People who take a lot of notes and wish they were better organized. If your biggest problem is &quot;I wrote it down somewhere and can&apos;t find it,&quot; Mem helps.
          </p>
          <p className={styles.p}>
            <strong>Where it falls short:</strong> Not an operations tool. It organizes your notes and knowledge. Your invoicing, contracts, and project status live outside Mem.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Tactiq</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Teams that want transcription + action items from meetings.
          </p>
          <p className={styles.p}>
            <strong>What it does:</strong> Tactiq provides live transcription and AI-generated meeting notes. It captures action items and can create summaries. Recent updates include proactive follow-ups — reminders about action items after a meeting.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Limited proactive — it&apos;s primarily reactive (transcribes meetings on demand). The follow-up reminders are a step toward proactive. But it doesn&apos;t monitor non-meeting data.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> Free tier. Pro from $13/month.
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> Heavy meeting takers who want accurate notes without manual capture. It pairs well with proactive AI tools — Tactiq captures what was discussed; Salt monitors what needs to happen.
          </p>
          <p className={styles.p}>
            <strong>Where it falls short:</strong> Meetings only. Tactiq captures what happens inside a call. It doesn&apos;t know about your invoices, contracts, or client emails.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Xembly</h2>
          <p className={styles.p}>
            <strong>Best for:</strong> Knowledge workers who want a single assistant for calendar, tasks, and notes.
          </p>
          <p className={styles.p}>
            <strong>What it does:</strong> Xembly combines scheduling, task management, and note-taking into one interface. It monitors your calendar for conflicts, tracks action items from meetings, and organizes notes.
          </p>
          <p className={styles.p}>
            <strong>Proactive model:</strong> Active within calendar and tasks — it can suggest reschedules and remind you of action items. External integrations exist but are more limited than dedicated operations tools.
          </p>
          <p className={styles.p}>
            <strong>Pricing:</strong> $30/month.
          </p>
          <p className={styles.p}>
            <strong>Who it&apos;s for:</strong> People who want calendar + task + notes in one place. Xembly pulls those three functions together better than using separate tools.
          </p>
          <p className={styles.p}>
            <strong>Where it falls short:</strong> Limited financial and CRM monitoring. Xembly handles what you put into it. It won&apos;t detect that a client hasn&apos;t paid their invoice or that a contract is about to expire.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How to Pick the Right Tool for Your Business</h2>
          <p className={styles.p}>
            The right AI stack depends on where your business actually struggles. Here is how to match the category to the pain:
          </p>
          <p className={styles.p}>
            <strong>If you keep missing client payments, expiring contracts, or deadlines:</strong> Start with operations monitoring — Salt. Financial blind spots compound fast.
          </p>
          <p className={styles.p}>
            <strong>If you spend hours scheduling meetings and managing calendar conflicts:</strong> Start with scheduling — Clara Labs, Motion, or Calendly AI.
          </p>
          <p className={styles.p}>
            <strong>If writing proposals, emails, or marketing copy drains your week:</strong> Start with content AI — ChatGPT or Claude.
          </p>
          <p className={styles.p}>
            <strong>If meeting notes pile up and action items get lost:</strong> Start with meeting capture — Tactiq or Fireflies.
          </p>
          <p className={styles.p}>
            <strong>If you know you wrote something down but can&apos;t find it:</strong> Start with knowledge management — Mem or Notion AI.
          </p>
          <p className={styles.p}>
            <strong>If you juggle multiple clients and none of these alone covers everything:</strong> Start with Salt. Operations monitoring is the least replaceable category for a solo service business. Everything else can wait.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What to Look For in a Proactive AI Tool</h2>
          <p className={styles.p}>
            Not every tool labeled &quot;proactive&quot; is actually proactive. Use this checklist:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>External monitoring:</strong> Does it connect to your existing tools (email, calendar, accounting, CRM) without manual data entry?</li>
            <li className={styles.li}><strong>Push, not pull:</strong> Does it send you alerts, or do you have to open a dashboard to find issues?</li>
            <li className={styles.li}><strong>Context in alerts:</strong> Does the notification tell you what&apos;s wrong, why it matters, and what to do — or just &quot;something changed&quot;?</li>
            <li className={styles.li}><strong>Integration depth:</strong> Can it read enough data from each connected tool to detect meaningful changes, or does it only surface surface-level status?</li>
            <li className={styles.li}><strong>Scope of monitoring:</strong> Does it cover the business functions you actually need — financial, communication, scheduling, contracts?</li>
          </ul>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>How many AI tools does a small business actually need?</strong>
          </p>
          <p className={styles.p}>
            Most solo service businesses need 2-3 tools: one for operations monitoring (Salt), one for content and writing (ChatGPT or Claude), and optionally one for meeting capture (Tactiq or Fireflies). More than that and you&apos;re managing tools instead of running your business.
          </p>
          <p className={styles.p}>
            <strong>What is the best free AI tool for a small business?</strong>
          </p>
          <p className={styles.p}>
            ChatGPT&apos;s free tier handles writing, research, and Q&amp;A. Salt offers a free tier for limited operations monitoring. Tactiq and Otter have free meeting transcription tiers. Start free, upgrade when the free tier starts limiting what you need.
          </p>
          <p className={styles.p}>
            <strong>Can I use ChatGPT to run my business operations?</strong>
          </p>
          <p className={styles.p}>
            Not really. ChatGPT is a reactive chatbot — it waits for you to type something. It doesn&apos;t monitor your email, calendar, or invoices. It doesn&apos;t push alerts when something changes. Use ChatGPT for content and questions. Use an operations tool like Salt for monitoring.
          </p>
          <p className={styles.p}>
            <strong>Should I use one all-in-one AI tool or multiple specialized ones?</strong>
          </p>
          <p className={styles.p}>
            Specialized tools outperform all-in-ones at their specific job. An all-in-one AI that tries to write, schedule, transcribe, and monitor will do none of them well. Pick the best tool for each category and let them complement each other. Salt + ChatGPT + Tactiq covers most of what a solo service business needs.
          </p>
          <p className={styles.p}>
            <strong>How much should I budget for AI tools as a small business?</strong>
          </p>
          <p className={styles.p}>
            A practical budget is $40-80/month for a solo operator: $29 for operations monitoring (Salt), $20 for ChatGPT Plus, and $10-20 for meeting capture (Tactiq or Fireflies). As your business grows, add tools based on the bottleneck — not because a new tool looks interesting.
          </p>
          <p className={styles.p}>
            <strong>Does Salt replace any of these other tools?</strong>
          </p>
          <p className={styles.p}>
            No. Salt connects to tools you already use (Gmail, Outlook, Google Calendar, QuickBooks, Stripe, CRM). It monitors what happens across them and surfaces what needs attention. It doesn&apos;t replace your calendar, your invoicing software, or your CRM. It makes them work together.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Try the proactive AI built for independent professionals. <a href="/" className="link link-hover">Join the waitlist</a>.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 13: What Can Proactive AI Do for Your Business?
  // ================================================================================================================
  {
    slug: "what-can-proactive-ai-do",
    title: "What Can Proactive AI Do for Your Business?",
    description:
      "A practical guide organized by business function — financial monitoring, client communication, schedule management, contract tracking, and project oversight — showing exactly how proactive AI solves each one.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-09",
    image: {
      src: whatCanProactiveAiDoImg,
      urlRelative: "/learn/what-can-proactive-ai-do/header.png",
      alt: "What Can Proactive AI Do for Your Business?",
    },
    content: (
      <>
        <Image
          src={whatCanProactiveAiDoImg}
          alt="What Can Proactive AI Do for Your Business?"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            <strong>Proactive AI monitors your business tools and surfaces what needs attention before you have to go looking for it.</strong> Instead of opening five dashboards and running three reports to find problems, you get a push notification that says: this invoice is overdue, this contract expires next week, this client hasn&apos;t responded in two weeks.
          </p>
          <p className={styles.p}>
            Below is a practical guide organized by business function. Each section covers: the common problem, how proactive AI addresses it, and what Salt specifically does for that function.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Financial Monitoring</h2>
          <p className={styles.p}>
            <strong>The problem:</strong> You send an invoice, it lands in the client&apos;s inbox, and then it disappears into the void. You don&apos;t notice it&apos;s unpaid until you&apos;re reconciling at month-end — or worse, when the client asks you to send it again. Late payments create cash flow gaps that compound. Studies show small businesses wait an average of 27 days past net-30 terms to receive payment.
          </p>
          <p className={styles.p}>
            <strong>How proactive AI helps:</strong> The system connects to your accounting or invoicing platform (QuickBooks, FreshBooks, Xero, etc.) and monitors invoice status in real time. When an invoice passes its due date without payment, the AI surfaces an alert. When a client has viewed the invoice but not paid, the AI flags that too. Some systems can auto-send a reminder sequence based on aging thresholds.
          </p>
          <p className={styles.p}>
            <strong>What Salt does:</strong> Salt connects to your accounting tool and tracks every invoice. When an invoice goes unpaid past its due date, Salt pushes an alert with the client name, invoice amount, days overdue, and a direct link to resend or follow up. If Salt detects a pattern — a client who paid net-30 for six months suddenly 10 days late — it flags that as a risk signal. Salt does not send the reminder for you (you choose how and when to follow up), but it stops you from discovering the problem weeks late.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Client Communication</h2>
          <p className={styles.p}>
            <strong>The problem:</strong> Clients go quiet. A proposal sits sent-but-unread for 10 days. A key stakeholder stops responding to email threads. You don&apos;t notice the silence until a week has passed and the project timeline is at risk. By then, you&apos;re chasing instead of leading.
          </p>
          <p className={styles.p}>
            <strong>How proactive AI helps:</strong> The AI monitors email and CRM activity. It tracks response times, email open rates, and the age of the last communication on each relationship. When a client&apos;s response time drops below their historical baseline, or when an important email goes unread for a set period, the AI surfaces an alert.
          </p>
          <p className={styles.p}>
            <strong>What Salt does:</strong> Salt monitors your email and CRM for communication gaps. If a client hasn&apos;t responded in 7 days (configurable), Salt flags it. If a deal in your pipeline has been sitting at the same stage for 30 days without movement, Salt surfaces it. Each alert includes the last message exchanged, the client&apos;s recent activity (or lack of it), and a suggested next step. Salt does not draft reply emails for you — it tells you who needs a call and why.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Schedule Management</h2>
          <p className={styles.p}>
            <strong>The problem:</strong> Double-bookings happen. Appointments get missed. You agree to a call at a time that conflicts with an existing commitment because you were glancing at your calendar on mobile. Each scheduling error costs you time, credibility, and in some professions, money.
          </p>
          <p className={styles.p}>
            <strong>How proactive AI helps:</strong> The AI monitors your calendar for upcoming conflicts, gaps that need filling, and appointments that lack preparation time. It can also detect if you&apos;ve scheduled back-to-back client calls without a buffer — a common cause of burnout. Some systems can suggest optimal meeting times based on your work patterns.
          </p>
          <p className={styles.p}>
            <strong>What Salt does:</strong> Salt connects to your calendar and surfaces scheduling issues proactively. When a new event creates a conflict, Salt alerts you before the conflict becomes a problem. When a recurring client call hasn&apos;t been scheduled for the current week, Salt reminds you. When your calendar shows five consecutive days of internal work but a client milestone is approaching, Salt flags the mismatch. Salt does not auto-schedule — you remain in control of your calendar — but you never discover a conflict the minute the call starts.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Contract Tracking</h2>
          <p className={styles.p}>
            <strong>The problem:</strong> Contracts auto-renew. Retainers expire unnoticed. Licenses lapse. You find out about a contract expiration when the client mentions they&apos;ve signed with someone else or when you realize you&apos;ve been working outside the terms for three weeks. Missing contract milestones exposes you to liability, lost revenue, and awkward conversations.
          </p>
          <p className={styles.p}>
            <strong>How proactive AI helps:</strong> The AI monitors your contract management tool or scans email for contract documents. It tracks key dates: start date, end date, auto-renewal window, notice period, and milestone dates. When a date approaches, the AI sends an alert with enough lead time to act.
          </p>
          <p className={styles.p}>
            <strong>What Salt does:</strong> Salt tracks contract dates from connected tools and surfaces alerts at configurable intervals. A contract expiring in 30 days? Salt flags it with the client name, terms summary, and renewal instructions. A retainer that auto-renews next week if not canceled? Salt tells you. A milestone payment due upon completion of a phase? Salt reminds you. Salt does not negotiate contracts — it ensures you never miss a date that matters.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Project Oversight</h2>
          <p className={styles.p}>
            <strong>The problem:</strong> You&apos;re juggling multiple client projects. Each has its own timeline, budget, deliverables, and stakeholders. Without constant manual checking, one project drifts off course — scope creep goes unnoticed, budgets run over, deadlines slip. By the time you catch it, the damage is done.
          </p>
          <p className={styles.p}>
            <strong>How proactive AI helps:</strong> The AI connects to your project management tool (Asana, Monday, ClickUp, Notion, etc.) and monitors project health. It tracks: tasks approaching due dates, budgets nearing thresholds, projects without recent activity, and milestones at risk of missing their target. The AI surfaces only the projects and tasks that need attention — not a full status report.
          </p>
          <p className={styles.p}>
            <strong>What Salt does:</strong> Salt reads your project management tool and surfaces alerts by exception. A project budget that&apos;s 80% consumed with only 50% of the work done? Salt flags it. A task assigned to you that&apos;s due in 48 hours with zero progress? Salt surfaces it. A project that hasn&apos;t been touched in 14 days? Salt reminds you. Salt does not re-prioritize your task list — it points you to the projects that need your attention right now.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Why One System Covers All Five</h2>
          <p className={styles.p}>
            Most business owners solve each of the five functions above with a separate approach. You check QuickBooks manually for payments. You scan email for missed messages. You review your calendar for conflicts. You dig through contracts for renewal dates. You visit project dashboards for status updates.
          </p>
          <p className={styles.p}>
            That&apos;s five separate monitoring loops, all running in your head.
          </p>
          <p className={styles.p}>
            <strong>Proactive AI replaces the manual checking with a single monitoring layer.</strong> Connect your tools once. The system watches all of them. When something needs attention anywhere across the five functions, you get an alert. You stop running loops and start acting on what matters.
          </p>
          <p className={styles.p}>
            <strong>Salt is built specifically for this.</strong> It connects to the tools independent professionals already use — QuickBooks, Gmail, Outlook, Google Calendar, Calendly, Asana, Notion, HubSpot, and others — and surfaces issues across all five functions in one interface. No dashboard required. The alerts come to you.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>Can proactive AI replace my bookkeeper or project manager?</strong>
          </p>
          <p className={styles.p}>
            No. Proactive AI doesn&apos;t perform the work — it monitors the work and tells you when something needs attention. You still need a bookkeeper to reconcile accounts and a project manager to coordinate deliverables. Proactive AI makes them more effective by surfacing issues early.
          </p>
          <p className={styles.p}>
            <strong>Does proactive AI work with my existing tools?</strong>
          </p>
          <p className={styles.p}>
            It depends on the tool. Salt connects directly to QuickBooks, FreshBooks, Xero, Gmail, Outlook, Google Calendar, Calendly, Asana, Monday.com, ClickUp, Notion, HubSpot, and others. Check the tool&apos;s integration list before committing.
          </p>
          <p className={styles.p}>
            <strong>Do I need to train the AI on my business?</strong>
          </p>
          <p className={styles.p}>
            No. Purpose-built proactive AI tools like Salt connect to your accounts and start monitoring immediately. You configure alert thresholds and notification preferences — you don&apos;t train models or provide sample data.
          </p>
          <p className={styles.p}>
            <strong>How many alerts will I get per day?</strong>
          </p>
          <p className={styles.p}>
            It depends on your business activity. Most Salt users receive 3-8 alerts per day across all five functions. The goal is signal, not noise. You can adjust thresholds — if you don&apos;t want to hear about invoices until they&apos;re 7 days overdue instead of 1, set that preference.
          </p>
          <p className={styles.p}>
            <strong>What happens if I ignore an alert?</strong>
          </p>
          <p className={styles.p}>
            Alerts persist until the issue is resolved. Most systems escalate — a gentle reminder on day 1, a stronger alert on day 7, and an &quot;overdue&quot; flag if the issue passes a critical threshold. Salt surfaces ignored alerts in your feed and includes them in daily summaries.
          </p>
          <p className={styles.p}>
            <strong>Can I set up proactive AI for just one function, like financial monitoring?</strong>
          </p>
          <p className={styles.p}>
            Yes. You connect only the tools you want monitored. If you only need invoice tracking, connect your accounting platform and skip the rest. Salt respects your scope.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Start monitoring your business the way enterprise teams do — without the enterprise overhead. <a href="/" className="link link-hover">Join the waitlist</a>.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 14: The Future of Proactive AI: Trends Every Business Owner Should Know
  // ================================================================================================================
  {
    slug: "future-of-proactive-ai-trends",
    title: "The Future of Proactive AI: Trends Every Business Owner Should Know",
    description:
      "Three emerging trends in proactive AI — agent-to-agent commerce, autonomous procurement, and AI-as-customer — and how independent professionals should prepare for them.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-10",
    image: {
      src: futureProactiveAiTrendsImg,
      urlRelative: "/learn/future-of-proactive-ai-trends/header.png",
      alt: "The Future of Proactive AI: Trends Every Business Owner Should Know",
    },
    content: (
      <>
        <Image
          src={futureProactiveAiTrendsImg}
          alt="The Future of Proactive AI: Trends Every Business Owner Should Know"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            <strong>Proactive AI is evolving from &quot;monitor and alert&quot; to &quot;monitor, decide, and act.&quot;</strong> The next wave won&apos;t just tell you something needs attention — it will handle the response within defined boundaries and escalate only when the decision requires a human.
          </p>
          <p className={styles.p}>
            This article covers three trends that will shape proactive AI over the next 2-3 years. None of them are science fiction. All of them are already in motion inside enterprise systems and forward-thinking platforms. The question for independent professionals is: how do you prepare?
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Trend 1: Agent-to-Agent Commerce</h2>
          <p className={styles.p}>
            <strong>What it is:</strong> Agent-to-agent (A2A) commerce describes transactions where one AI agent negotiates and executes with another AI agent on behalf of their respective humans. No dashboards. No email chains. Two systems talk, agree, and complete the transaction.
          </p>
          <p className={styles.p}>
            <strong>What it looks like in practice:</strong> A freelance designer&apos;s AI agent detects that a recurring retainer payment hasn&apos;t arrived. It queries the client&apos;s AI agent, confirms the invoice was received, identifies a processing delay, and accepts the client agent&apos;s proposed new settlement date — all without either human checking their inbox.
          </p>
          <p className={styles.p}>
            <strong>Why this matters:</strong> A2A commerce eliminates the latency of human-to-human transactional communication. The average invoice takes 37 days to pay in the US. Much of that time is dead air — invoice sent but unread, invoice read but unchecked, payment queued but unconfirmed. A2A agents collapse that timeline.
          </p>
          <p className={styles.p}>
            <strong>The limiting factor:</strong> Trust and standardization. Two agents need compatible protocols and both parties need to authorize agent-level authority. Early implementations are within single-platform ecosystems (marketplaces, agency management platforms) before expanding to cross-platform.
          </p>
          <p className={styles.p}>
            <strong>How independent professionals should prepare:</strong> Choose tools that offer API access and webhook support. The more connected your systems are today, the easier you can plug into agent-to-agent workflows tomorrow. Salt&apos;s integration architecture is designed for this — each connected tool exposes data that an agent layer can act on.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Trend 2: Autonomous Procurement</h2>
          <p className={styles.p}>
            <strong>What it is:</strong> Autonomous procurement means an AI system manages the entire purchase cycle — from identifying a need to selecting a vendor to placing an order — with human approval only at exception thresholds.
          </p>
          <p className={styles.p}>
            <strong>What it looks like in practice:</strong> An independent IT consultant has a monthly software stack budget of $500. Their proactive AI agent monitors tool usage across all connected subscriptions. When a tool goes unused for 60 days, the agent flags it for review. When a renewal comes up, the agent compares the current price against historical benchmarks and suggests an alternative if the price increased beyond a threshold. The human approves or rejects. The agent executes.
          </p>
          <p className={styles.p}>
            <strong>Why this matters:</strong> Small businesses and independent professionals accumulate an average of 10-20 SaaS subscriptions. Most of them auto-renew. Most go underutilized. Autonomous procurement doesn&apos;t just save money — it removes the cognitive load of tracking each subscription individually.
          </p>
          <p className={styles.p}>
            <strong>The limiting factor:</strong> Authorization boundaries. Most business owners want their AI to spend money on their behalf only within strict limits. The technology exists. The trust frameworks are still developing.
          </p>
          <p className={styles.p}>
            <strong>How independent professionals should prepare:</strong> Start auditing your subscriptions today. Know what you&apos;re paying monthly, what you actually use, and what renews when. The data layer matters more than the AI layer — clean subscription data makes autonomous procurement possible. Salt surfaces subscription and contract renewals proactively, giving you the awareness needed before you hand off execution.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Trend 3: AI-as-Customer</h2>
          <p className={styles.p}>
            <strong>What it is:</strong> Greg Isenberg popularized the concept of &quot;AI-as-customer&quot; — an AI agent that acts as a buyer of services on behalf of a human or organization. Instead of a human filling out a contact form, an AI agent shops for services, evaluates providers, negotiates terms, and purchases.
          </p>
          <p className={styles.p}>
            <strong>What it looks like in practice:</strong> A coach offers a 6-week group program for $1,200 per participant. A corporate training manager has tasked their AI agent with finding group coaching programs that match specific criteria: synchronous sessions, max 12 participants, curriculum including leadership communication, delivered over 6-8 weeks. The AI agent evaluates the coach&apos;s website against those criteria, identifies a match, and initiates a booking request — all without the training manager visiting 15 websites.
          </p>
          <p className={styles.p}>
            <strong>Why this matters:</strong> As more organizations deploy purchasing agents, your business needs to be discoverable by AI agents — not just by humans searching Google. This shifts SEO from &quot;write content humans want to read&quot; to &quot;structure data machines can parse.&quot; Your pricing, availability, deliverables, and credentials need to exist in machine-readable formats.
          </p>
          <p className={styles.p}>
            <strong>The limiting factor:</strong> AI agents are only as good as the structured data they can access. A website with beautiful prose but no structured data (schema markup, clear pricing pages, machine-readable service descriptions) is invisible to AI agents.
          </p>
          <p className={styles.p}>
            <strong>How independent professionals should prepare:</strong> Three steps:
          </p>
          <ol className={styles.ul}>
            <li className={styles.li}>Add structured data markup to your website — pricing, services, availability, credentials.</li>
            <li className={styles.li}>Ensure your business information is consistent across all platforms (Google Business Profile, LinkedIn, your website, directories).</li>
            <li className={styles.li}>Make your service packages clear and specific. &quot;I offer coaching&quot; is human-friendly but machine-ambiguous. &quot;6-week group coaching program, $1,200, synchronous sessions, max 12 participants&quot; is agent-ready.</li>
          </ol>
          <p className={styles.p}>
            Salt&apos;s proactive alert model is already structured data-friendly — it tracks facts about your business (invoice status, contract dates, client activity) in ways that map cleanly to agent-to-agent and AI-as-customer workflows.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>What Stays the Same</h2>
          <p className={styles.p}>
            Amid all the trends, one thing doesn&apos;t change: <strong>business operations are about signals.</strong> Money coming in. Money going out. Commitments made. Commitments kept. People communicated with. Work delivered.
          </p>
          <p className={styles.p}>
            Proactive AI started as a monitoring layer. It will evolve into an action layer. But the core function — watching your business and telling you what needs attention — remains the same regardless of whether the response is handled by you or by your agent.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How Independent Professionals Should Prepare (Checklist)</h2>
          <p className={styles.p}>
            <strong>Connect your business tools to a monitoring layer:</strong> Creates the data foundation for future agent workflows. Do this this month.
          </p>
          <p className={styles.p}>
            <strong>Audit your subscriptions and contracts:</strong> Autonomous procurement requires clean subscription data. Do this this quarter.
          </p>
          <p className={styles.p}>
            <strong>Add structured data to your website:</strong> AI-as-customer depends on machine-readable service info. Do this this quarter.
          </p>
          <p className={styles.p}>
            <strong>Define your service packages clearly:</strong> Ambiguous services are invisible to purchasing agents. Do this this quarter.
          </p>
          <p className={styles.p}>
            <strong>Understand your authority boundaries:</strong> Decide now: what decisions will you delegate? Do this this year.
          </p>
          <p className={styles.p}>
            <strong>Monitor tool API access and webhook support:</strong> Agent-to-agent commerce requires integration points. Do this ongoing.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>Will proactive AI replace business owners?</strong>
          </p>
          <p className={styles.p}>
            No. Proactive AI replaces the monitoring and notification layer — the part of running a business that involves manually checking tools for issues. Decision-making, client relationships, and creative work remain human.
          </p>
          <p className={styles.p}>
            <strong>When will agent-to-agent commerce be mainstream for small businesses?</strong>
          </p>
          <p className={styles.p}>
            Most analysts estimate 2-4 years for cross-platform agent-to-agent transactions. Single-platform implementations (within one ecosystem) are already live.
          </p>
          <p className={styles.p}>
            <strong>Do I need to learn to code to participate in these trends?</strong>
          </p>
          <p className={styles.p}>
            No. You need to choose tools that expose structured data and offer integrations. That&apos;s a product decision, not a technical skill. Salt handles the integration layer so you don&apos;t have to.
          </p>
          <p className={styles.p}>
            <strong>Is AI-as-customer already happening?</strong>
          </p>
          <p className={styles.p}>
            Yes, in limited form. Some enterprise procurement systems already use AI agents to evaluate vendors. The consumer-facing version (an AI agent shopping for services on your behalf) is earlier but growing fast.
          </p>
          <p className={styles.p}>
            <strong>What happens if I ignore these trends?</strong>
          </p>
          <p className={styles.p}>
            Nothing immediately. Your business continues operating. But you&apos;ll gradually become harder to find (AI-as-customer won&apos;t discover you), slower to settle transactions (no agent-to-agent), and carrying more overhead than peers who adopt procurement automation. The trends are additive, not punitive.
          </p>
          <p className={styles.p}>
            <strong>Will Salt support agent-to-agent transactions?</strong>
          </p>
          <p className={styles.p}>
            Salt&apos;s architecture — connected tools monitoring meaningful business data — is the foundation for agent-to-agent workflows. As the ecosystem matures, Salt will extend from monitoring into bounded action execution. The alert layer comes first, followed by the action layer.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Stay ahead of the curve without getting distracted by hype. <a href="/" className="link link-hover">Join the waitlist</a>.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 15: Why Proactive AI Is Better Than Chatbots for Business Operations
  // ================================================================================================================
  {
    slug: "proactive-ai-vs-chatbot",
    title: "Why Proactive AI Is Better Than Chatbots for Business Operations",
    description:
      "A direct comparison between chatbots (ChatGPT, Claude, Copilot) and proactive AI for business operations. Why the pull model fails for operations, and why push is the only model that works.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-11",
    image: {
      src: proactiveAiVsChatbotImg,
      urlRelative: "/learn/proactive-ai-vs-chatbot/header.png",
      alt: "Why Proactive AI Is Better Than Chatbots for Business Operations",
    },
    content: (
      <>
        <Image
          src={proactiveAiVsChatbotImg}
          alt="Why Proactive AI Is Better Than Chatbots for Business Operations"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <p className={styles.p}>
            <strong>Chatbots answer questions. Proactive AI finds problems.</strong> These are fundamentally different jobs, and they require different tools.
          </p>
          <p className={styles.p}>
            ChatGPT, Claude, and Microsoft Copilot are excellent tools for content generation, data analysis, research, and conversation. They are not tools for monitoring your business operations. A chatbot will never tell you an invoice is overdue unless you ask it. A chatbot will never flag a dead client relationship unless you specifically request a review. Chatbots operate on a pull model. You pull information from them by asking a question.
          </p>
          <p className={styles.p}>
            Proactive AI operates on a push model. It monitors your connected tools, detects meaningful changes, and sends you alerts without being asked.
          </p>
          <p className={styles.p}>
            This distinction matters because operations — the day-to-day running of a business — is a monitoring problem, not a Q&amp;A problem.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Push vs. Pull Model</h2>
          <p className={styles.p}>
            <strong>Pull model (chatbots):</strong> You have a question. You type it into a text box. The AI processes your query and returns a response. If you don&apos;t ask, you don&apos;t get. The AI has no awareness of your business unless you feed it context in the current conversation. Each session starts from zero.
          </p>
          <p className={styles.p}>
            <strong>Push model (proactive AI):</strong> The AI has ongoing access to your business tools — email, calendar, accounting, CRM, project management. It monitors these sources continuously. When it detects something that needs attention (an overdue invoice, an expiring contract, a stalled project), it sends you an alert. You don&apos;t ask. The system brings the information to you.
          </p>
          <p className={styles.p}>
            <strong>Pull (Chatbot):</strong> Initiation by user typing a question. Context is per-session, manual. Coverage only what you ask about. Timing when you think to ask. Best for content, research, analysis.
          </p>
          <p className={styles.p}>
            <strong>Push (Proactive AI):</strong> Initiation by system detecting an event. Context is persistent, always connected. Coverage of all connected data sources. Timing when the event happens. Best for operations monitoring.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>When to Use a Chatbot</h2>
          <p className={styles.p}>
            Chatbots excel at three things:
          </p>
          <p className={styles.p}>
            <strong>Content and writing.</strong> You need a draft email, a blog post outline, or a social media caption. You describe what you want, the chatbot generates it, you edit. This is a pull interaction — you initiate, you define the prompt, you evaluate the output.
          </p>
          <p className={styles.p}>
            <strong>Research and analysis.</strong> You upload a document and ask for a summary. You paste financial data and ask for trends. You need to explore a topic. Chatbots handle these well because the value comes from the response to your specific query.
          </p>
          <p className={styles.p}>
            <strong>General Q&amp;A.</strong> You have a question about a topic. The chatbot has been trained on broad knowledge. You ask, it answers. The interaction ends when you stop asking.
          </p>
          <p className={styles.p}>
            For these use cases, chatbots are the right tool. Use them.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Why Chatbots Fail at Operations Monitoring</h2>
          <p className={styles.p}>
            <strong>They don&apos;t know what you don&apos;t know.</strong>
          </p>
          <p className={styles.p}>
            An operations problem is, by definition, something you haven&apos;t noticed yet. You don&apos;t know the invoice is overdue. You don&apos;t know the contract is expiring. You don&apos;t know the client hasn&apos;t responded in 10 days. A chatbot can&apos;t alert you to a problem you haven&apos;t asked about, because the entire interaction depends on you initiating the conversation.
          </p>
          <p className={styles.p}>
            You would need to ask your chatbot every morning: &quot;Any overdue invoices? Any expiring contracts? Any stalled projects? Any clients who haven&apos;t responded?&quot; That&apos;s not a monitoring system. That&apos;s a daily checklist you&apos;re offloading to a conversation interface. It requires you to remember to ask, know exactly what to ask, and process the answer each time.
          </p>
          <p className={styles.p}>
            <strong>They lack persistent context.</strong>
          </p>
          <p className={styles.p}>
            Every conversation with a chatbot is a new session (or relies on sporadic memory). The chatbot doesn&apos;t wake up at 3 AM when a payment fails. It doesn&apos;t track that a proposal has been sitting unread for two weeks. It doesn&apos;t know that the project budget crossed 80% consumption yesterday — unless you tell it, and even then, it forgets once the conversation ends.
          </p>
          <p className={styles.p}>
            Operations monitoring requires persistent, always-on awareness. That&apos;s not how chatbots are built.
          </p>
          <p className={styles.p}>
            <strong>They are pull tools in a push world.</strong>
          </p>
          <p className={styles.p}>
            Operations don&apos;t wait for you to ask. Invoices age every day. Contracts approach expiration continuously. Clients go quiet gradually. These are time-sensitive signals that lose value the later you discover them. A pull model means you discover problems at your next scheduled check-in, not at the moment they become actionable.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>When to Use Proactive AI</h2>
          <p className={styles.p}>
            Proactive AI handles the monitoring part of your business. The specific capabilities:
          </p>
          <p className={styles.p}>
            <strong>Financial monitoring.</strong> Tracks invoice status, payment timing, expense patterns. Alerts when invoices go past due. Flags clients whose payment behavior changes. Surfaces cash flow risks before they become emergencies.
          </p>
          <p className={styles.p}>
            <strong>Communication monitoring.</strong> Tracks email and CRM activity. Alerts when a key client stops responding. Flags proposals and quotes that have been sent but not opened. Surfaces stalled deals in your pipeline.
          </p>
          <p className={styles.p}>
            <strong>Schedule monitoring.</strong> Monitors calendar for conflicts, gaps, and missed appointments. Alerts when a recurring meeting hasn&apos;t been scheduled. Flags scheduling patterns that indicate overload.
          </p>
          <p className={styles.p}>
            <strong>Contract monitoring.</strong> Tracks contract start and end dates, renewal windows, and milestone dates. Alerts before deadlines pass. Surfaces auto-renewals that need action.
          </p>
          <p className={styles.p}>
            <strong>Project monitoring.</strong> Tracks project progress against budget and timeline. Alerts when a project goes idle. Flags tasks approaching their due date with no movement.
          </p>
          <p className={styles.p}>
            <strong>Proactive AI doesn&apos;t do the work — it tells you what needs attention.</strong> That&apos;s the distinction. Salt surfaces the signal. You take the action. The chatbot can help you draft the email you send in response. The two tools complement each other.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>How Salt and a Chatbot Work Together</h2>
          <p className={styles.p}>
            The best setup uses both tools for what each does best:
          </p>
          <p className={styles.p}>
            <strong>Proactive AI (Salt):</strong> Monitors your business around the clock. Connects to your tools. Sends you push alerts when something needs attention. You wake up to a summary of what&apos;s happened since yesterday. Throughout the day, Salt surfaces issues as they arise.
          </p>
          <p className={styles.p}>
            <strong>Chatbot (ChatGPT/Claude):</strong> You use it for the follow-up. Salt alerts you that a client has gone quiet. You use the chatbot to draft the re-engagement email. Salt tells you a contract needs negotiation. You use the chatbot to analyze market rates and suggest terms.
          </p>
          <p className={styles.p}>
            Salt handles the discovery. The chatbot handles the execution support. One without the other leaves a gap. Salt without a chatbot means you know what&apos;s wrong but still have to write every follow-up from scratch. A chatbot without Salt means you can draft great emails but don&apos;t know when to send them.
          </p>
          <p className={styles.p}>
            <strong>Invoice overdue:</strong> Salt alerts you with amount, client, days late. Chatbot drafts the reminder email.
          </p>
          <p className={styles.p}>
            <strong>Client went quiet:</strong> Salt alerts with last contact date, context. Chatbot drafts the re-engagement message.
          </p>
          <p className={styles.p}>
            <strong>Contract expiring:</strong> Salt alerts with terms and renewal instructions. Chatbot drafts negotiation talking points.
          </p>
          <p className={styles.p}>
            <strong>Project behind:</strong> Salt alerts with specific tasks and budget. Chatbot drafts status update to client.
          </p>
          <p className={styles.p}>
            <strong>Schedule conflict:</strong> Salt alerts with conflicting events. Chatbot drafts rescheduling email.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>The Test: Do You Have to Ask?</h2>
          <p className={styles.p}>
            Here&apos;s a simple test to determine whether you need proactive AI for your business operations:
          </p>
          <p className={styles.p}>
            <strong>Can you go one full business day without opening any tool or dashboard and still know what needs your attention?</strong>
          </p>
          <p className={styles.p}>
            If the answer is no — if there are overdue invoices, expiring contracts, stalled projects, or silent clients you would miss — you need push notifications, not a prompt box. You need proactive AI.
          </p>
          <p className={styles.p}>
            If the answer is yes — if your operations are fully visible without any tool checks — you may not need proactive AI yet. Most independent professionals and small business owners answer no.
          </p>
        </section>
        <section>
          <h2 className={styles.h2}>Frequently Asked Questions</h2>
          <p className={styles.p}>
            <strong>Is ChatGPT a proactive AI tool?</strong>
          </p>
          <p className={styles.p}>
            No. ChatGPT is a reactive chatbot. It waits for you to type a prompt. It has no persistent access to your business accounts and no ongoing monitoring capability. It answers questions you ask; it doesn&apos;t surface problems you haven&apos;t noticed.
          </p>
          <p className={styles.p}>
            <strong>Can I make a chatbot proactive by giving it API access?</strong>
          </p>
          <p className={styles.p}>
            Not effectively. You would need to build a custom integration layer that monitors your accounts, stores state, runs detection logic, and triggers alerts. At that point, you&apos;ve built a proactive AI system and are using the chatbot only as the response generator. Use a purpose-built tool instead.
          </p>
          <p className={styles.p}>
            <strong>Do I need both a chatbot and proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Yes, if you want full coverage. Use proactive AI for monitoring and alerts. Use a chatbot for content generation, analysis, and research. They solve different problems. A comparison is not a competition — they work best together.
          </p>
          <p className={styles.p}>
            <strong>Does Microsoft Copilot count as proactive AI?</strong>
          </p>
          <p className={styles.p}>
            Copilot embedded in Microsoft 365 has some proactive features (email summarization, meeting recaps), but it does not monitor your operations cross-tool. Copilot won&apos;t tell you a QuickBooks invoice is overdue or that a HubSpot deal is stalled. Its proactive scope is limited to the Microsoft ecosystem.
          </p>
          <p className={styles.p}>
            <strong>How much time does proactive AI save compared to a chatbot?</strong>
          </p>
          <p className={styles.p}>
            Chatbots save time on specific tasks — drafting, summarizing, analyzing. Proactive AI saves time on discovery — the time you spend checking tools to find problems. Most Salt users report 30-60 minutes per day in reduced tool-checking. The two savings add up.
          </p>
          <p className={styles.p}>
            <strong>Can I use proactive AI without replacing my chatbot subscription?</strong>
          </p>
          <p className={styles.p}>
            Yes. Salt works alongside ChatGPT, Claude, or any chatbot. They don&apos;t compete. Salt monitors. You act. Your chatbot helps you execute.
          </p>
        </section>
        <hr />
        <section>
          <p className={styles.p}>
            Stop finding problems late. Start getting alerts, not answers. <a href="/" className="link link-hover">Join the waitlist</a>.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 10: Salt vs Lindy
  // ================================================================================================================
  {
    slug: "salt-vs-lindy",
    title: "Salt vs Lindy: Building Agents vs Getting the Work Done",
    description:
      "Lindy lets you build AI agents. Salt arrives already knowing what to build. An honest comparison for independent professionals.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltVsLindyImg,
      urlRelative: "/learn/salt-vs-lindy/header.png",
      alt: "Salt vs Lindy: Building Agents vs Getting the Work Done",
    },
    content: (
      <>
        <Image
          src={saltVsLindyImg}
          alt="Salt vs Lindy: Building Agents vs Getting the Work Done"
          width={700}
          height={500}
          priority={true}
          className="compare-legacy-hero-image rounded-lg"
          placeholder="blur"
        />
        <section className="compare-legacy-intro-section">
          <h2 className={styles.h2}>Salt vs Lindy: Building Agents vs Getting the Work Done</h2>
          <p className={styles.p}>
            Lindy is one of the most capable AI agent platforms available, and if you compare feature lists, Lindy&apos;s is longer. This page exists because feature lists answer the wrong question. The right question is: <strong>after you pay, who does the thinking?</strong>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What Lindy is</h3>
          <p className={styles.p}>
            Lindy is a platform for building AI agents. You pick triggers, connect tools, design the workflow, and your agent runs it: an email triager, a meeting scheduler, a bot that enriches leads. People who love systems genuinely love Lindy, and the platform deserves its reputation. It is flexible, deep, and powerful.
          </p>
          <p className={styles.p}>
            But notice the verbs in that paragraph: pick, connect, design, build. <strong>Lindy is a workshop.</strong> A very good one. And a workshop assumes a builder.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>The builder assumption is where it breaks</h3>
          <p className={styles.p}>
            Here is the pattern we heard over and over from independent professionals before building Salt: they sign up for an automation platform, set up one or two obvious workflows, and stall. Not from laziness. From the knowledge gap: <strong>you cannot automate a workflow you do not know you need.</strong>
          </p>
          <p className={styles.p}>
            Which reminder sequence saves a silent deal? What should happen automatically when a contract is signed? What is the play when a good client goes quiet for three weeks? The owners of those answers are operations people, and the entire point of being an independent professional is that you did not hire one. The blank canvas is the obstacle. A bigger canvas does not help.
          </p>
          <p className={styles.p}>
            There is also the meter. Lindy&apos;s pricing runs on credits: usage drains a balance. We priced Salt at one flat monthly rate with no credits, because an assistant you ration is an assistant you stop using. (Our full pricing philosophy is <a href="/pricing" className="link link-primary">here</a>.)
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What Salt is instead</h3>
          <p className={styles.p}>
            Salt is not a workshop. It arrives already knowing what to build:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>It connects to your email, calendar, meetings, payments, and files, and learns how your business actually runs.</li>
            <li className={styles.li}>It proposes the plays, including the ones you would never have thought to set up: scope creep inside a client thread, a lead going cold that needs a nudge, the invoice that should have gone out yesterday.</li>
            <li className={styles.li}>It does the work and brings it back finished. You review in about 90 seconds a day, and routine plays you have approved before run on their own.</li>
          </ul>
          <p className={styles.p}>
            With Lindy, the product is the ability to automate. <strong>With Salt, the product is the work, done.</strong> You never see a canvas.
          </p>
        </section>
        <section className="compare-legacy-table-section">
          <h3 className={styles.h3}>Side by side</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Lindy</th>
                  <th>Salt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Core product</td>
                  <td>Platform to build AI agents</td>
                  <td>The work, done and waiting for your okay</td>
                </tr>
                <tr>
                  <td className="font-medium">Who designs the workflows</td>
                  <td>You</td>
                  <td>Salt proposes them from your real business</td>
                </tr>
                <tr>
                  <td className="font-medium">Setup</td>
                  <td>Per agent, per workflow</td>
                  <td>Connect your tools once</td>
                </tr>
                <tr>
                  <td className="font-medium">Finds work you did not assign</td>
                  <td>No, agents run what you built</td>
                  <td>Yes, that is the core of the product</td>
                </tr>
                <tr>
                  <td className="font-medium">Pricing model</td>
                  <td>Runs on usage credits</td>
                  <td>Flat monthly, no credits</td>
                </tr>
                <tr>
                  <td className="font-medium">Built for</td>
                  <td>Builders and teams who want control of the machinery</td>
                  <td>Independent professionals who want the machinery invisible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={styles.h3}>The bottom line</h3>
          <p className={styles.p}>
            If your idea of a great Saturday is designing automation flows, Lindy will make you happy, sincerely. But if you are a photographer, coach, consultant, or agent whose bottleneck is operations and follow through, the workshop is not the gift it looks like. It is one more system to design, babysit, and debug, and one more meter to watch.
          </p>
          <p className={styles.p}>
            Salt was built on a different bet: you should not have to become an automation engineer to get the benefits of one. Connect your tools, and the plays start coming to you.
          </p>
          <p className={styles.p}>
            Salt launches June 29, 2026. <a href="/" className="link link-primary">Join the waitlist</a> and lock in launch pricing.
          </p>
        </section>
        <section className="compare-legacy-faq-section">
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>Is Salt more powerful than Lindy?</strong>
          </p>
          <p className={styles.p}>
            They optimize for different things. Lindy maximizes what a motivated builder can construct. Salt maximizes what gets done with no builder at all. For an independent professional without ops staff, the second number is usually the one that matters.
          </p>
          <p className={styles.p}>
            <strong>Can Salt do custom workflows like Lindy?</strong>
          </p>
          <p className={styles.p}>
            Yes. Salt&apos;s Playbooks let you define repeatable workflows once and let Salt run them. The difference is the starting point: Salt proposes plays from your real business first, so you are editing suggestions instead of staring at a blank canvas.
          </p>
          <p className={styles.p}>
            <strong>Does Salt use credits like Lindy?</strong>
          </p>
          <p className={styles.p}>
            No. Salt is one flat monthly price with no credit system. Nothing stops working mid-month and there is no balance to watch.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 11: Salt vs Viktor
  // ================================================================================================================
  {
    slug: "salt-vs-viktor",
    title: "Salt vs Viktor: The AI Coworker vs the AI That Runs the Business",
    description:
      "Viktor is an AI coworker that lives in your team chat. Salt is a proactive system that runs your whole business while you are out. An honest comparison.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltVsViktorImg,
      urlRelative: "/learn/salt-vs-viktor/header.png",
      alt: "Salt vs Viktor: The AI Coworker vs the AI That Runs the Business",
    },
    content: (
      <>
        <Image
          src={saltVsViktorImg}
          alt="Salt vs Viktor: The AI Coworker vs the AI That Runs the Business"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Salt vs Viktor: The AI Coworker vs the AI That Runs the Business</h2>
          <p className={styles.p}>
            Viktor and Salt make a similar promise: AI that does real work, not AI that just answers questions. That makes this the most useful comparison on our site, because the difference between the two products is subtle on a feature list and enormous in your actual week.
          </p>
          <p className={styles.p}>
            Credit first: Viktor&apos;s &quot;AI coworker&quot; framing is honest and well-executed. It does work, not just chat about work. If every AI product had that bar, the category would be in better shape.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>The same promise, two different shapes</h3>
          <p className={styles.p}>
            <strong>Viktor is built around chat.</strong> It lives where your messages live, and it shines when work arrives as a message: someone asks for something, Viktor handles it. You can also assign it tasks directly. Think of a capable colleague sitting in your team channel, waiting to be useful.
          </p>
          <p className={styles.p}>
            <strong>Salt is built around your business.</strong> It connects to email, calendar, meetings, payments, and files, and works from the actual state of all of it. There is no channel to summon it in, because it is not waiting to be summoned.
          </p>
          <p className={styles.p}>
            Both products respond when work comes in. Salt also reacts to incoming requests, and honestly, on that slice of the job the two products are more alike than different. The separation is everything that never arrives as a message.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Most of what costs you money never sends a message</h3>
          <p className={styles.p}>
            Walk through a real month in a one-person business and count what hurt:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>The proposal that sat silent for six days while the prospect cooled off.</li>
            <li className={styles.li}>The &quot;small extra request&quot; inside a long email thread that was actually $4,000 of unbilled scope.</li>
            <li className={styles.li}>The invoice that went out two weeks late because the milestone slipped your mind.</li>
            <li className={styles.li}>The great client from last year you never re-contacted.</li>
          </ul>
          <p className={styles.p}>
            None of those pinged anyone. There was no message to react to, no task anyone thought to assign. They are exactly the things a busy owner does not notice, which means <strong>a tool that waits for messages or assignments inherits your blind spots.</strong> With a chat coworker, you still have to think: notice the problem, decide it matters, and hand it over. The thinking is the bottleneck, and it is still yours.
          </p>
          <p className={styles.p}>
            This is the line between the products: <strong>Viktor does what you tell it. Salt also does what nobody told it.</strong> It catches the silent proposal on day five, flags the scope drift mid-thread, preps the invoice on the milestone, and drafts the re-engagement to last year&apos;s client, then brings it all to you finished, waiting on a 90-second review.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Side by side</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Viktor</th>
                  <th>Salt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Home</td>
                  <td>Your team chat</td>
                  <td>Standalone system across your whole business</td>
                </tr>
                <tr>
                  <td className="font-medium">Strongest when</td>
                  <td>Work arrives as a message or assignment</td>
                  <td>Work needs to be found, decided, and done</td>
                </tr>
                <tr>
                  <td className="font-medium">Finds problems nobody raised</td>
                  <td>Not its job</td>
                  <td>The core of the product</td>
                </tr>
                <tr>
                  <td className="font-medium">Who does the thinking</td>
                  <td>You decide, it executes</td>
                  <td>Salt proposes, you approve</td>
                </tr>
                <tr>
                  <td className="font-medium">Sees email, calendar, payments, files as one picture</td>
                  <td>Chat-centered view</td>
                  <td>Yes, that is the foundation</td>
                </tr>
                <tr>
                  <td className="font-medium">Built for</td>
                  <td>Teams living in Slack or Teams</td>
                  <td>Independent professionals who ARE the business</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={styles.h3}>The bottom line</h3>
          <p className={styles.p}>
            If your work life happens inside a team chat and you want a capable executor for what you already know needs doing, Viktor is a credible product. But if you are a one-person business, your problem is rarely execution speed on known tasks. It is the unknown ones: the things going quietly wrong while you are with clients. You do not need a coworker waiting in a channel. You need the part of the business that notices.
          </p>
          <p className={styles.p}>
            That is what Salt is. It thinks for you, builds what you never asked for as well as what you do ask for, and hands it back finished.
          </p>
          <p className={styles.p}>
            Salt launches June 29, 2026. <a href="/" className="link link-primary">Join the waitlist</a> and lock in launch pricing.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>Is Salt a Viktor alternative?</strong>
          </p>
          <p className={styles.p}>
            Yes, in the sense that both do real work with AI. They differ in shape: Viktor is a chat-native coworker that executes what arrives or what you assign; Salt is a standalone proactive system that monitors your whole business and initiates work on its own, with your approval before anything goes out.
          </p>
          <p className={styles.p}>
            <strong>Does Salt require Slack or Teams?</strong>
          </p>
          <p className={styles.p}>
            No. Salt is a standalone product. It connects to your email, calendar, meetings, payments, and files directly, so businesses that do not run on team chat lose nothing.
          </p>
          <p className={styles.p}>
            <strong>Can Salt handle assigned tasks like Viktor?</strong>
          </p>
          <p className={styles.p}>
            Yes. You can ask Salt for anything directly. The proactive plays are an addition to that, not a replacement for it.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 12: Salt vs ChatGPT
  // ================================================================================================================
  {
    slug: "salt-vs-chatgpt",
    title: "Salt vs ChatGPT: The Difference Between Answering and Doing",
    description:
      "ChatGPT answers what you ask. Salt does the work you never knew to ask for, across your whole business, while you are out. Here is the real difference.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltVsChatgptImg,
      urlRelative: "/learn/salt-vs-chatgpt/header.png",
      alt: "Salt vs ChatGPT: The Difference Between Answering and Doing",
    },
    content: (
      <>
        <Image
          src={saltVsChatgptImg}
          alt="Salt vs ChatGPT: The Difference Between Answering and Doing"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Salt vs ChatGPT: The Difference Between Answering and Doing</h2>
          <p className={styles.p}>
            Let us start where most comparison pages will not: ChatGPT is extraordinary. It writes, reasons, plans, and explains better than any tool in history, and we use it constantly. If this page tried to convince you ChatGPT is bad, you should close the tab.
          </p>
          <p className={styles.p}>
            The comparison is not about quality. It is about a structural limit that no amount of model improvement fixes: <strong>reactive AI only gives you what you already know how to ask for.</strong>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>The knowledge gap nobody talks about</h3>
          <p className={styles.p}>
            Here is what actually happens with ChatGPT and your business. You open a chat. The cursor blinks. And everything that comes next depends on you:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>You</strong> have to notice the problem (&quot;the Meridian proposal has been quiet for six days&quot;).</li>
            <li className={styles.li}><strong>You</strong> have to know what to ask (&quot;write a follow-up that gives them a reason to reply&quot;).</li>
            <li className={styles.li}><strong>You</strong> have to feed it the context (paste the thread, explain the client, describe your voice).</li>
            <li className={styles.li}><strong>You</strong> have to take the output and go do something with it (paste into Gmail, send, log it, remember to check back).</li>
          </ul>
          <p className={styles.p}>
            ChatGPT performed brilliantly for thirty seconds in the middle of that chain. You did everything else. And the chain has a weaker link than effort: most people do not know which workflows are possible, which automations would change their business, or what to ask for in the first place. Infinite time with a blank chat box does not close that gap. That is why the most capable AI in history is, for most independent professionals, a very smart typing assistant.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What Salt does instead</h3>
          <p className={styles.p}>
            Salt does not wait for a prompt. It connects to the tools your business runs on (email, calendar, meetings, payments, files) and works from the actual state of your business:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}>It <strong>notices</strong> the proposal that went silent, the scope that crept, the invoice that is ready, the client who is going quiet.</li>
            <li className={styles.li}>It <strong>decides</strong> what should happen next, including plays you would never have thought to ask for.</li>
            <li className={styles.li}>It <strong>does the work</strong>: the follow-up drafted in your voice, the change order with your pricing, the kickoff brief, the invoice.</li>
            <li className={styles.li}>It <strong>brings it back finished.</strong> You glance, you approve, it goes. About 90 seconds of your day.</li>
          </ul>
          <p className={styles.p}>
            The difference shows up the first morning. ChatGPT starts every session knowing nothing about your business. Salt starts every morning having already worked on it.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Side by side</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>ChatGPT</th>
                  <th>Salt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Knows your business</td>
                  <td>Only what you paste in</td>
                  <td>Connected to your real tools and history</td>
                </tr>
                <tr>
                  <td className="font-medium">Starts work</td>
                  <td>When you ask</td>
                  <td>When the business needs it</td>
                </tr>
                <tr>
                  <td className="font-medium">Finds problems you missed</td>
                  <td>No</td>
                  <td>Yes, that is the core of the product</td>
                </tr>
                <tr>
                  <td className="font-medium">Sends, files, schedules, invoices</td>
                  <td>No, you copy and paste</td>
                  <td>Yes, in your tools, after your quick okay</td>
                </tr>
                <tr>
                  <td className="font-medium">What you need to know</td>
                  <td>What to ask and how to ask it</td>
                  <td>Nothing, Salt proposes the play</td>
                </tr>
                <tr>
                  <td className="font-medium">Between sessions</td>
                  <td>Forgets</td>
                  <td>Keeps working</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={styles.h3}>Keep ChatGPT. That is not the question.</h3>
          <p className={styles.p}>
            Plenty of Salt users will keep a ChatGPT subscription for thinking, drafting, and exploring ideas. The question this page answers is narrower: who is running the operations of your business while you are with clients, on a shoot, in a session, or on a plane?
          </p>
          <p className={styles.p}>
            A chat window cannot do that, no matter how smart it gets, because it is waiting for you to come back and ask. Salt was built so the work does not wait for you.
          </p>
          <p className={styles.p}>
            Salt launches June 29, 2026. <a href="/" className="link link-primary">Join the waitlist</a> and lock in launch pricing.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>Can ChatGPT do what Salt does?</strong>
          </p>
          <p className={styles.p}>
            ChatGPT can produce similar text if you notice the need, supply all the context, and send the result yourself. It cannot watch your business, catch what you missed, act inside your tools, or work while you are away. That is the difference between a reactive assistant and a proactive system.
          </p>
          <p className={styles.p}>
            <strong>Is Salt built on the same AI technology?</strong>
          </p>
          <p className={styles.p}>
            Salt uses leading AI models as one layer of a larger system. The product is the layers around the model: a memory of your business, connections to your tools, and an engine that decides what needs doing and prepares it for your approval.
          </p>
          <p className={styles.p}>
            <strong>I am good at prompting. Do I still need Salt?</strong>
          </p>
          <p className={styles.p}>
            Prompting skill narrows the gap but does not close it. The constraint is not phrasing, it is awareness: you cannot prompt about the silent lead you have not noticed or the workflow you do not know exists. Salt&apos;s job is to see those for you.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 13: Salt vs Hiring a VA
  // ================================================================================================================
  {
    slug: "salt-vs-hiring-a-va",
    title: "Salt vs Hiring a Virtual Assistant",
    description:
      "A part-time VA runs $800 to $1,500 a month plus hiring, training, and managing. Here is an honest comparison of what a VA and Salt each actually cover.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltVsHiringAVaImg,
      urlRelative: "/learn/salt-vs-hiring-a-va/header.png",
      alt: "Salt vs Hiring a Virtual Assistant",
    },
    content: (
      <>
        <Image
          src={saltVsHiringAVaImg}
          alt="Salt vs Hiring a Virtual Assistant"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Salt vs Hiring a Virtual Assistant</h2>
          <p className={styles.p}>
            Sooner or later every successful independent professional has the same thought: &quot;I need help.&quot; And the default answer for twenty years has been a virtual assistant. This page is the honest comparison, including the parts where a human wins, because a comparison that pretends humans are obsolete is selling you something.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What a great VA actually costs</h3>
          <p className={styles.p}>
            The sticker price is the small part. A capable part-time VA runs <strong>$800 to $1,500 a month</strong>. Around it sits everything else:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Hiring:</strong> sorting candidates, interviews, trial tasks. Weeks of your attention.</li>
            <li className={styles.li}><strong>Training:</strong> your tools, your clients, your voice, your judgment calls. Months before they are genuinely useful.</li>
            <li className={styles.li}><strong>Managing:</strong> assigning work, reviewing it, answering questions, being the boss. This is a permanent tax, and it is the exact job you were trying to get rid of.</li>
            <li className={styles.li}><strong>Turnover risk:</strong> when a trained VA leaves, the training and the context leave too, and you start over.</li>
            <li className={styles.li}><strong>Hours:</strong> part-time help is awake and working a few hours a day. Your business generates work around the clock.</li>
          </ul>
          <p className={styles.p}>
            None of that makes VAs a bad idea. It makes them a bigger commitment than the sticker price suggests, and it makes the order of operations matter.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What a VA does that Salt does not</h3>
          <p className={styles.p}>
            Straight answer: a human assistant makes phone calls, handles physical-world errands, charms a difficult client on a video call, and exercises judgment in genuinely novel situations. If your week is full of those, you may need a human, and Salt will not talk you out of it.
          </p>
          <p className={styles.p}>
            But audit an actual week of &quot;I need help&quot; tasks for most independent professionals and that is not what fills it. What fills it: triaging the inbox, answering inquiries, sending follow-ups, chasing silent proposals, preparing briefs, invoicing on time, filing documents, keeping the calendar sane, remembering what every client said last time. That list has two properties: it is the bulk of the load, and it is exactly what Salt does.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What Salt does that a VA cannot</h3>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Already trained.</strong> Salt connects to your email, calendar, meetings, payments, and files and learns your business from its actual history. No onboarding months, and the knowledge never resigns.</li>
            <li className={styles.li}><strong>Never off shift.</strong> The inquiry that arrives at 11:42 PM on a Saturday gets a reply with your real availability before your competitor wakes up.</li>
            <li className={styles.li}><strong>No managing.</strong> Salt does not need tasks assigned. It finds the work: the silent lead, the scope creep, the unbilled milestone, and brings it to you finished. Your management duty is a 90-second review with your coffee.</li>
            <li className={styles.li}><strong>Flat cost, no payroll.</strong> One predictable monthly price. No contracts, no turnover, no replacement search. (Pricing philosophy <a href="/pricing" className="link link-primary">here</a>.)</li>
          </ul>
        </section>
        <section>
          <h3 className={styles.h3}>Side by side</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Part-time VA</th>
                  <th>Salt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Monthly cost</td>
                  <td>$800 to $1,500 plus your management time</td>
                  <td>Flat monthly software price</td>
                </tr>
                <tr>
                  <td className="font-medium">Ramp-up</td>
                  <td>Weeks to hire, months to train</td>
                  <td>Connect your tools, useful the first week</td>
                </tr>
                <tr>
                  <td className="font-medium">Coverage</td>
                  <td>Their working hours</td>
                  <td>Around the clock</td>
                </tr>
                <tr>
                  <td className="font-medium">Needs you to assign work</td>
                  <td>Yes</td>
                  <td>No, it proposes the plays</td>
                </tr>
                <tr>
                  <td className="font-medium">Phone calls, physical tasks, human charm</td>
                  <td>Yes</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td className="font-medium">Quits or gets sick</td>
                  <td>Yes</td>
                  <td>No</td>
                </tr>
                <tr>
                  <td className="font-medium">Knowledge when they leave</td>
                  <td>Walks out the door</td>
                  <td>Stays in your Memory</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={styles.h3}>The honest recommendation</h3>
          <p className={styles.p}>
            Do it in this order. <strong>Salt first, human later, if ever.</strong> Let Salt absorb the operational load that makes you feel like you need help: the inbox, the follow-ups, the invoicing, the noticing. For most solo businesses, that removes the reason to hire at all, at a fraction of the cost.
          </p>
          <p className={styles.p}>
            And if your business grows to where you do hire a human, you will hire a better job: not an inbox janitor, but someone for the calls, the relationships, and the judgment work, with Salt running the machine underneath both of you. That first hire gets later, cheaper, and more valuable. That is the whole trade.
          </p>
          <p className={styles.p}>
            Salt launches June 29, 2026. <a href="/" className="link link-primary">Join the waitlist</a> and lock in launch pricing.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>Is Salt a replacement for a virtual assistant?</strong>
          </p>
          <p className={styles.p}>
            For the digital-operations bulk of a VA&apos;s job (inbox, follow-ups, scheduling, invoicing, briefs, filing), yes, at a fraction of the cost and with no management. For phone calls, physical tasks, and human-judgment situations, no. Most solo businesses find the first list is what they actually needed help with.
          </p>
          <p className={styles.p}>
            <strong>How much does Salt cost compared to a VA?</strong>
          </p>
          <p className={styles.p}>
            A part-time VA runs $800 to $1,500 a month before your time spent managing. Salt is a flat monthly software price, announced at launch on June 29, 2026, at a fraction of that.
          </p>
          <p className={styles.p}>
            <strong>Can Salt and a VA work together?</strong>
          </p>
          <p className={styles.p}>
            Yes, and it is a strong combination at scale: Salt runs the always-on operational layer and surfaces the work; your human handles the calls and high-touch moments. Several of our design conversations are exactly this shape.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 14: Salt Alternatives
  // ================================================================================================================
  {
    slug: "salt-alternatives",
    title: "Salt Alternatives: An Honest Guide",
    description:
      "Looking at alternatives to Salt? Here is an honest breakdown of agent builders, chat coworkers, client CRMs, ChatGPT, and hiring help, and where each one fits.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltAlternativesImg,
      urlRelative: "/learn/salt-alternatives/header.png",
      alt: "Salt Alternatives: An Honest Guide",
    },
    content: (
      <>
        <Image
          src={saltAlternativesImg}
          alt="Salt Alternatives: An Honest Guide"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Salt Alternatives: An Honest Guide</h2>
          <p className={styles.p}>
            If you are researching Salt, you are probably weighing it against everything else that promises to take work off your plate. Good. You should. This page is our honest map of the landscape, written by the team that builds Salt. We will tell you what each alternative genuinely does well, because pretending competitors are useless would insult your intelligence and would not survive your first demo anyway.
          </p>
          <p className={styles.p}>
            First, one sentence on what Salt is, so the comparisons make sense: <strong>Salt connects to the tools your business already runs on, figures out what needs to happen next, does the work, and brings it back finished while you are out.</strong> You glance at the result before it goes anywhere. That is the whole product.
          </p>
          <p className={styles.p}>
            Here are your real alternatives.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>1. AI agent builders (Lindy, Zapier AI, Make)</h3>
          <p className={styles.p}>
            <strong>What they do well:</strong> enormous flexibility. If you can imagine an automation, you can probably build it. Deep integration catalogs, mature platforms, real automation power.
          </p>
          <p className={styles.p}>
            <strong>The gap:</strong> you are the architect. These tools wait for you to know which workflow to build, design it, test it, and maintain it when it breaks. Most independent professionals do not know which automations would move the needle, and that knowledge gap, not the tooling, is why most automation projects stall. You cannot ask a blank canvas what to paint.
          </p>
          <p className={styles.p}>
            Salt ships with the judgment built in. It reads your actual business and proposes the plays, including the ones you would never have thought to ask for.
          </p>
          <p className={styles.p}>
            <a href="/compare/salt-vs-lindy" className="link link-primary">Full comparison: Salt vs Lindy</a>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>2. Chat-based AI coworkers (Viktor and similar)</h3>
          <p className={styles.p}>
            <strong>What they do well:</strong> a clear &quot;AI that does work&quot; promise, and a comfortable home inside the chat tools teams already use.
          </p>
          <p className={styles.p}>
            <strong>The gap:</strong> they are built around chat, and they are strongest when work arrives as a message. Your business does not happen inside a chat window. It happens across email, calendar, payments, contracts, and client relationships, and most of what costs you money (the silent lead, the unbilled scope creep, the deadline nobody flagged) never shows up as a message to react to.
          </p>
          <p className={styles.p}>
            Salt is a standalone system that watches the whole business and starts work nobody assigned.
          </p>
          <p className={styles.p}>
            <a href="/compare/salt-vs-viktor" className="link link-primary">Full comparison: Salt vs Viktor</a>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>3. Client management platforms (HoneyBook, Dubsado, 17hats)</h3>
          <p className={styles.p}>
            <strong>What they do well:</strong> solid pipelines, proposals, contracts, and invoicing in one place. Mature products with big communities.
          </p>
          <p className={styles.p}>
            <strong>The gap:</strong> they are filing cabinets with workflows. Well-organized places where you still do the work. The follow-up email still gets written by you. The scope creep still gets caught by you, or it does not get caught.
          </p>
          <p className={styles.p}>
            Salt is not a place to do work. It is the thing that does the work. Many early Salt users keep their CRM and let Salt drive it.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>4. ChatGPT and general AI assistants</h3>
          <p className={styles.p}>
            <strong>What they do well:</strong> almost anything you ask, brilliantly. We use them daily.
          </p>
          <p className={styles.p}>
            <strong>The gap:</strong> they only do what you ask. Reactive AI gives you exactly what you already know how to request, and nothing else. It does not know your clients, does not see your inbox, does not notice the proposal that has been silent for six days, and does not act in your tools. The bottleneck is not the AI&apos;s capability. It is that you have to be the one who notices, decides, asks, and then pastes the result where it belongs.
          </p>
          <p className={styles.p}>
            <a href="/compare/salt-vs-chatgpt" className="link link-primary">Full comparison: Salt vs ChatGPT</a>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>5. Hiring a virtual assistant</h3>
          <p className={styles.p}>
            <strong>What they do well:</strong> human judgment, phone calls, and tasks that need hands. A great VA is genuinely great.
          </p>
          <p className={styles.p}>
            <strong>The gap:</strong> $800 to $1,500 a month for part-time help, plus hiring, training, managing, and the context that walks out the door if they leave. You become a manager, which is the job you were trying to escape.
          </p>
          <p className={styles.p}>
            <a href="/compare/salt-vs-hiring-a-va" className="link link-primary">Full comparison: Salt vs hiring a VA</a>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>The honest bottom line</h3>
          <p className={styles.p}>
            Every alternative above shares one assumption: <strong>you are the engine.</strong> You design the automation, send the chat message, work the CRM, write the prompt, or manage the assistant. The tools differ; the assumption does not.
          </p>
          <p className={styles.p}>
            Salt is built on the opposite assumption. The business state comes first, the thinking comes from Salt, and the work arrives finished, waiting for your quick okay. If you want a tool to use, any of the products above is a reasonable choice. If you want the work done while you are out, that is Salt, and that is the entire reason we built it.
          </p>
          <p className={styles.p}>
            Salt launches publicly on June 29, 2026. Waitlist members get launch pricing locked in.
          </p>
          <p className={styles.p}>
            <a href="/" className="link link-primary">Join the waitlist</a>
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>What is the best alternative to Salt?</strong>
          </p>
          <p className={styles.p}>
            It depends on what you want to keep doing yourself. Lindy if you enjoy building automations. HoneyBook or Dubsado if you want an organized place to do client admin manually. ChatGPT if you want answers on demand. A VA if you need a human. If you want the work itself done proactively across your whole business, there is no direct equivalent to Salt today; the closest categories are agent builders and chat coworkers, compared above.
          </p>
          <p className={styles.p}>
            <strong>Is Salt a CRM replacement?</strong>
          </p>
          <p className={styles.p}>
            No. Salt connects to your existing tools, including CRMs, and does the work inside them. Some users simplify their stack after adopting Salt, but replacing your CRM is not required.
          </p>
          <p className={styles.p}>
            <strong>Does Salt act without my permission?</strong>
          </p>
          <p className={styles.p}>
            Salt prepares the work and routine items run on rails you approve once. Anything outward-facing waits for your quick review, which takes about 90 seconds a day. You stay in control without doing the work.
          </p>
        </section>
      </>
    ),
  },

  // ================================================================================================================
  // ARTICLE 15: Salt Pricing
  // ================================================================================================================
  {
    slug: "salt-pricing",
    title: "Salt Pricing: Flat, No Credits, No Surprises",
    description:
      "How Salt pricing works: flat monthly plans, no credits, no usage anxiety, nothing ever stops working. Final launch prices announced June 29, 2026.",
    categories: [
      categories.find((category) => category.slug === categorySlugs.business)!,
    ].filter(Boolean) as categoryType[],
    author: authors.find((author) => author.slug === authorSlugs.matt)!,
    publishedAt: "2026-06-12",
    image: {
      src: saltPricingImg,
      urlRelative: "/learn/salt-pricing/header.png",
      alt: "Salt Pricing: Flat, No Credits, No Surprises",
    },
    content: (
      <>
        <Image
          src={saltPricingImg}
          alt="Salt Pricing: Flat, No Credits, No Surprises"
          width={700}
          height={500}
          priority={true}
          className="rounded-lg"
          placeholder="blur"
        />
        <section>
          <h2 className={styles.h2}>Salt Pricing</h2>
          <p className={styles.p}>
            <strong>Final prices go live at launch on June 29, 2026. Waitlist members see them first and lock them in.</strong> What we can tell you today is the part that will not change: how Salt pricing works.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Flat. No credits. No surprise bills.</h3>
          <p className={styles.p}>
            Most AI tools charge in credits. You get a bucket, every action drains it, and somewhere in week three you start rationing your own assistant, wondering what each request costs. We think that model is broken. An assistant you are afraid to use is not an assistant.
          </p>
          <p className={styles.p}>
            Salt is priced the opposite way:
          </p>
          <p className={styles.p}>
            <strong>Flat monthly plans.</strong> One number. You always know what Salt costs this month, next month, and the month after.
          </p>
          <p className={styles.p}>
            <strong>No credits, ever.</strong> You will never see a credit balance in Salt, never do mental math before letting it work, and never watch a meter while it handles your inbox.
          </p>
          <p className={styles.p}>
            <strong>Nothing stops working.</strong> Plans have soft limits sized so that normal use never touches them. If you have an unusually heavy month, Salt keeps working. No lockouts, no mid-month paywalls, no held-hostage drafts.
          </p>
          <p className={styles.p}>
            <strong>Unlimited means unlimited.</strong> On plans with unlimited usage, unlimited means one human operator running one business, used as hard as one human can use it. The only thing it excludes is reselling Salt&apos;s capacity or pooling multiple businesses into one account. We will never silently throttle you.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Priced against the work, not against software</h3>
          <p className={styles.p}>
            We do not price Salt against other software, because Salt does not compete with a place to organize your work. It competes with how the work gets done today:
          </p>
          <ul className={styles.ul}>
            <li className={styles.li}><strong>Doing it yourself:</strong> 10 to 15 hours a month of admin, follow-up, and triage. At your billable rate, that is the most expensive assistant you will ever hire.</li>
            <li className={styles.li}><strong>A part-time virtual assistant:</strong> $800 to $1,500 a month, plus recruiting, training, and managing.</li>
            <li className={styles.li}><strong>An ops hire:</strong> $4,000 or more a month, plus payroll.</li>
          </ul>
          <p className={styles.p}>
            Salt will cost a fraction of any of those, with none of the management. The exact number lands June 29. The promise above is the part we are committing to in writing now.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>Why we have not published numbers yet</h3>
          <p className={styles.p}>
            Honest answer: we are finishing the unit-cost work. Salt does real work, and real work has real costs behind it (AI inference, meeting transcription, storage). We are setting final prices from those real costs so the plans we announce are plans we never have to walk back, raise suddenly, or hedge with fine print. We would rather launch with a price that holds than impress you today and surprise you in January.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>What launch customers get</h3>
          <ul className={styles.ul}>
            <li className={styles.li}>Launch pricing locked in for as long as you remain a customer</li>
            <li className={styles.li}>Founder access: direct input into what gets built next</li>
            <li className={styles.li}>No countdown timers, no fake scarcity, no games</li>
          </ul>
          <p className={styles.p}>
            <a href="/" className="link link-primary">Join the waitlist</a> and you will see the numbers before anyone else.
          </p>
        </section>
        <section>
          <h3 className={styles.h3}>FAQ</h3>
          <p className={styles.p}>
            <strong>How much does Salt cost?</strong>
          </p>
          <p className={styles.p}>
            Final plans are announced at launch on June 29, 2026. There will be multiple flat monthly tiers sized for solo professionals, priced well below the cost of part-time help. Waitlist members see prices first and lock in launch pricing permanently.
          </p>
          <p className={styles.p}>
            <strong>Does Salt use credits?</strong>
          </p>
          <p className={styles.p}>
            No. Salt has no credit system. Plans are flat monthly prices with soft limits that normal single-business use does not reach, and nothing ever stops working mid-month.
          </p>
          <p className={styles.p}>
            <strong>Will there be a free trial?</strong>
          </p>
          <p className={styles.p}>
            Salt launches with a money-back guarantee, so you can try it risk-free. Details at launch.
          </p>
          <p className={styles.p}>
            <strong>Is there a discount for annual billing?</strong>
          </p>
          <p className={styles.p}>
            Yes, annual plans will carry a meaningful discount, announced with launch pricing.
          </p>
        </section>
      </>
    ),
  },

];

const compareSlugSet = new Set<string>(COMPARE_ARTICLE_SLUGS);

/** Removed from /compare hub and routes; not listed on /learn. */
const retiredCompareSlugs = new Set<string>(["salt-pricing"]);

/** Comparison guides — served at /compare/:slug only, not on /learn. */
export const compareArticles = allArticles.filter((article) =>
  compareSlugSet.has(article.slug)
);

/** Learn articles only (excludes comparison content). */
export const articles = allArticles.filter(
  (article) =>
    !compareSlugSet.has(article.slug) && !retiredCompareSlugs.has(article.slug)
);