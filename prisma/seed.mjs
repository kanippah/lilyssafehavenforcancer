// Idempotent bootstrap seed. Safe to run on every boot:
//  1. Ensures the settings row exists.
//  2. Ensures an admin account exists (ADMIN_EMAIL / ADMIN_PASSWORD env).
//  3. First boot only (no products yet, SEED_SAMPLE_DATA !== "false"):
//     creates the sample catalog, pages, stories, discounts, demo customer,
//     and a handful of demo orders so the dashboard has life in it.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  await db.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      announcement: "Free U.S. shipping over $75 — every order funds care kits",
    },
  });

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@lilyssafehavenforcancer.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me-please";
  const adminName = process.env.ADMIN_NAME || "Lily Admin";
  const adminCount = await db.user.count({ where: { role: "ADMIN" } });
  if (adminCount === 0) {
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: {
        email: adminEmail,
        name: adminName,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
    console.log(`[seed] admin account ready: ${adminEmail}`);
    if (adminPassword === "change-me-please") {
      console.warn("[seed] WARNING: using the default admin password — set ADMIN_PASSWORD and change it after first login.");
    }
  }

  if (process.env.SEED_SAMPLE_DATA === "false") return;
  const productCount = await db.product.count();
  if (productCount > 0) return;

  console.log("[seed] first boot — creating sample catalog…");

  // ---------- Collections ----------
  const [comfort, apparel, kitchen, keepsakes] = await Promise.all(
    [
      {
        title: "Comfort & Care",
        slug: "comfort-and-care",
        description: "The softest, most useful things for treatment days — tested and loved by survivors.",
        imageUrl: "/seed/collection-comfort.svg",
        position: 0,
      },
      {
        title: "Kind Apparel",
        slug: "kind-apparel",
        description: "Shirts and layers that say what matters, in fabrics gentle enough for sensitive skin.",
        imageUrl: "/seed/collection-apparel.svg",
        position: 1,
      },
      {
        title: "Mugs & Kitchen",
        slug: "mugs-and-kitchen",
        description: "For the tea that settles a stomach and the coffee that fuels a caregiver.",
        imageUrl: "/seed/collection-kitchen.svg",
        position: 2,
      },
      {
        title: "Keepsakes & Accessories",
        slug: "keepsakes-and-accessories",
        description: "Small tokens of solidarity to carry, wear, and give.",
        imageUrl: "/seed/collection-keepsakes.svg",
        position: 3,
      },
    ].map((data) => db.collection.create({ data }))
  );

  // ---------- Products ----------
  const SIZES = ["S", "M", "L", "XL", "2XL"];
  const sizeVariants = (base, upcharge2xl = 200) =>
    SIZES.map((size, i) => ({
      title: size,
      priceCents: size === "2XL" ? base + upcharge2xl : base,
      stock: 18 + ((i * 7) % 20),
      position: i,
    }));

  const products = [
    {
      title: "Hope Blooms Mug",
      slug: "hope-blooms-mug",
      description:
        "A generous ceramic mug with our pressed-lily mark and the words 'hope blooms' where your thumb rests. Dishwasher and microwave safe, with a satin-matte glaze that feels like a river stone.",
      story:
        "Warm drinks are small medicine. Every mug funds ginger tea and anti-nausea comforts inside our care kits.",
      featured: true,
      tags: ["mug", "gift", "bestseller"],
      image: "/seed/mug.svg",
      collections: [kitchen.id],
      variants: [
        { title: "Standard · 11 oz", priceCents: 1800, stock: 42, position: 0 },
        { title: "Large · 15 oz", priceCents: 2200, stock: 25, position: 1 },
      ],
    },
    {
      title: '"Still Here" Tee',
      slug: "still-here-tee",
      description:
        "Ring-spun combed cotton, pre-washed so it arrives already soft. The 'still here' typeset is printed small over the heart — a quiet flag, not a billboard.",
      story: "Designed with survivors who told us they wanted words that felt like theirs. Each tee funds a full care kit.",
      featured: true,
      tags: ["apparel", "tee", "survivor"],
      image: "/seed/tee.svg",
      collections: [apparel.id],
      variants: sizeVariants(2800),
    },
    {
      title: "Safe Haven Hoodie",
      slug: "safe-haven-hoodie",
      description:
        "Heavyweight fleece with a scuba hood, flat drawstrings (no cold metal tips), and a kangaroo pocket sized for hand-warming. Tagless neck for sensitive skin.",
      story: "Hospital waiting rooms are cold. This is the hoodie we wish every caregiver had.",
      featured: true,
      tags: ["apparel", "hoodie", "cozy"],
      image: "/seed/hoodie.svg",
      collections: [apparel.id, comfort.id],
      variants: sizeVariants(5400, 300),
    },
    {
      title: "Warrior Garden Tote",
      slug: "warrior-garden-tote",
      description:
        "A structured 12-oz canvas tote that stands open on its own — sized for chemo-day essentials: blanket, thermos, tablet, snacks. Interior zip pocket for meds and cards.",
      story: "Patients told us the right bag makes treatment days feel organized instead of scattered.",
      featured: true,
      tags: ["bag", "gift"],
      image: "/seed/tote.svg",
      collections: [keepsakes.id],
      variants: [{ title: "Default", priceCents: 2200, compareAtCents: 2600, stock: 38, position: 0 }],
    },
    {
      title: "Calm Waters Candle",
      slug: "calm-waters-candle",
      description:
        "Lavender, sea salt, and a whisper of chamomile in a reusable amber jar. Coconut-soy wax, 45-hour burn, and deliberately gentle — scent sensitivity is real during treatment.",
      story: "Blended with an oncology nurse's advice: calming, never overwhelming.",
      featured: true,
      tags: ["home", "calm", "gift"],
      image: "/seed/candle.svg",
      collections: [comfort.id],
      variants: [{ title: "Default", priceCents: 2400, stock: 30, position: 0 }],
    },
    {
      title: "Softest Chemo-Day Blanket",
      slug: "softest-chemo-day-blanket",
      description:
        "An oversized 50×70 plush blanket that packs into its own tote. Machine washable, static-free, and warm without weight — infusion chairs run cold.",
      story: "Our most-requested item, full stop. One blanket purchase funds two full care kits.",
      featured: true,
      tags: ["comfort", "bestseller", "gift"],
      image: "/seed/blanket.svg",
      collections: [comfort.id],
      variants: [{ title: "Default", priceCents: 4800, compareAtCents: 5800, stock: 26, position: 0 }],
    },
    {
      title: "Little Victories Journal",
      slug: "little-victories-journal",
      description:
        "A guided journal with one small prompt per day: 'today's small win', 'a question for my care team', 'something that made me laugh'. Lies flat; pen loop included.",
      story: "Built with a counselor who works with patients in treatment — celebrating small wins is a skill.",
      tags: ["journal", "mindfulness", "gift"],
      image: "/seed/journal.svg",
      collections: [keepsakes.id],
      variants: [{ title: "Default", priceCents: 1600, stock: 44, position: 0 }],
    },
    {
      title: "Gentle Days Beanie",
      slug: "gentle-days-beanie",
      description:
        "Bamboo-blend knit with zero interior seams — designed for scalps made sensitive by treatment. Breathable enough to sleep in, pretty enough to live in.",
      story: "Made to a checklist written by people who lost their hair and told us exactly what a good hat is.",
      featured: false,
      tags: ["apparel", "chemo", "soft"],
      image: "/seed/beanie.svg",
      collections: [apparel.id, comfort.id],
      variants: [
        { title: "Dove", priceCents: 2000, stock: 25, position: 0 },
        { title: "Rose", priceCents: 2000, stock: 22, position: 1 },
        { title: "Pine", priceCents: 2000, stock: 18, position: 2 },
      ],
    },
    {
      title: "Lily Bead Bracelet",
      slug: "lily-bead-bracelet",
      description:
        "Matte glass beads with a single rose-gold lily charm on a stretch cord — wearable solidarity for patients, caregivers, and friends. Comes carded with a note to give.",
      story: "The bracelet we hand every new person the Haven helps. Buy one, and we tuck a second into a care kit.",
      tags: ["jewelry", "keepsake", "gift"],
      image: "/seed/bracelet.svg",
      collections: [keepsakes.id],
      variants: [
        { title: "One size", priceCents: 1400, stock: 60, position: 0 },
      ],
    },
    {
      title: "Chemo Care Kit",
      slug: "chemo-care-kit",
      description:
        "The kit our volunteers pack by hand: ginger chews, unscented lip balm and lotion, grippy socks, a soft sleep cap, mints for metal-mouth, and a handwritten note. Give it, or fund one for a stranger.",
      story: "This is the actual kit your purchases fund — buying one puts a second one straight into a hospital's hands.",
      featured: true,
      tags: ["kit", "bestseller", "give"],
      image: "/seed/kit.svg",
      collections: [comfort.id],
      variants: [
        { title: "Send to me", priceCents: 4500, stock: 40, position: 0 },
        { title: "Donate to a patient", priceCents: 4500, stock: 999, position: 1, trackStock: false },
      ],
    },
    {
      title: "Cozy Hospital Socks · 2-pack",
      slug: "cozy-hospital-socks",
      description:
        "Fleece-lined slipper socks with full-sole grips — infusion floors are slippery and cold. One pair in rose, one in pine.",
      story: "The number-one 'small thing that helped' in our patient surveys, three years running.",
      tags: ["comfort", "socks"],
      image: "/seed/socks.svg",
      collections: [comfort.id],
      variants: [
        { title: "S/M", priceCents: 1200, stock: 50, position: 0 },
        { title: "L/XL", priceCents: 1200, stock: 35, position: 1 },
      ],
    },
    {
      title: "Hydration Reminder Bottle",
      slug: "hydration-reminder-bottle",
      description:
        "A 24-oz bottle with gentle time markings and a straw lid (easier when sitting back in an infusion chair). Insulated, condensation-free, fits cup holders.",
      story: "Hydration is homework during chemo. This makes it a little easier to pass.",
      tags: ["hydration", "kitchen"],
      image: "/seed/bottle.svg",
      collections: [kitchen.id, comfort.id],
      variants: [{ title: "Default", priceCents: 2600, stock: 28, position: 0 }],
    },
    {
      title: "Caregiver's Coffee Mug",
      slug: "caregivers-coffee-mug",
      description:
        "For the drivers, the appointment-note-takers, the 3 a.m. water-fetchers. 15 oz, because caregivers don't do small coffees. 'Someone's whole team' printed on the base.",
      story: "Caregivers get overlooked. This one's for them — and it funds respite care hours.",
      tags: ["mug", "caregiver", "gift"],
      image: "/seed/mug-2.svg",
      collections: [kitchen.id],
      variants: [{ title: "15 oz", priceCents: 1800, stock: 33, position: 0 }],
    },
    {
      title: '"In My Corner" Supporter Tee',
      slug: "in-my-corner-supporter-tee",
      description:
        "The shirt for the people who show up: rides, meals, silly texts on scan days. Same buttery cotton as our survivor tee, with 'in my corner' printed on the sleeve.",
      story: "Wear it to an appointment and watch someone smile. Funds a care kit, same as everything here.",
      tags: ["apparel", "supporter", "tee"],
      image: "/seed/tee-2.svg",
      collections: [apparel.id],
      variants: sizeVariants(2800),
    },
  ];

  const createdProducts = {};
  for (const p of products) {
    const created = await db.product.create({
      data: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        story: p.story ?? "",
        status: "ACTIVE",
        featured: Boolean(p.featured),
        tags: p.tags,
        images: { create: [{ url: p.image, alt: p.title, position: 0 }] },
        variants: { create: p.variants },
        collections: { create: p.collections.map((collectionId) => ({ collectionId })) },
      },
      include: { variants: { orderBy: { position: "asc" } }, images: true },
    });
    createdProducts[p.slug] = created;
  }
  console.log(`[seed] ${products.length} products created`);

  // ---------- Reviews ----------
  const reviews = [
    ["softest-chemo-day-blanket", 5, "Went straight into the chemo bag", "Bought for my mom's first infusion. The nurse asked where it was from because three other patients wanted one.", "Danielle R."],
    ["softest-chemo-day-blanket", 5, "Softer than it has any right to be", "Washes beautifully. My husband steals it between appointments.", "Priya"],
    ["hope-blooms-mug", 5, "The mug that started her mornings", "My sister said the ginger tea tasted braver in it. That's the whole review.", "Marcus T."],
    ["chemo-care-kit", 5, "Sent one to a stranger", "I picked 'donate to a patient'. Got a note two weeks later that it landed. Crying, 10/10.", "Jess"],
    ["gentle-days-beanie", 4, "Finally, no seams", "Every other 'chemo beanie' had a seam right at the crown. This one is actually seamless. Wish it came in more colors.", "Ana"],
    ["still-here-tee", 5, "Quiet in the best way", "Small print over the heart, not a slogan across the chest. Exactly right.", "Sam W."],
    ["cozy-hospital-socks", 5, "Grippy and warm", "Infusion floors are ICE. These fixed it. Buy two packs.", "Ruth"],
    ["warrior-garden-tote", 4, "Chemo-day command center", "Stands open on its own, fits a blanket, thermos and iPad. Zip pocket holds the med list.", "Kevin O."],
  ];
  for (const [slug, rating, title, body, name] of reviews) {
    await db.review.create({
      data: { productId: createdProducts[slug].id, rating, title, body, name, status: "APPROVED" },
    });
  }
  await db.review.create({
    data: {
      productId: createdProducts["calm-waters-candle"].id,
      rating: 5,
      title: "Gentle scent, long burn",
      body: "Scent sensitivity made every other candle unbearable. This one is a whisper, not a shout.",
      name: "Elena",
      status: "PENDING",
    },
  });

  // ---------- Discounts ----------
  await db.discountCode.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10 },
      { code: "FREESHIP", type: "FREE_SHIPPING", value: 0, minSubtotalCents: 2500 },
    ],
  });

  // ---------- Pages ----------
  const pages = [
    {
      slug: "about",
      title: "Our mission",
      body: `Lily's Safe Haven for Cancer began at a kitchen table, with one family learning how many small, practical things a diagnosis suddenly demands — and how few of them insurance thinks about.

We sell comfort: blankets warm enough for infusion suites, hats kind enough for sensitive scalps, mugs that make hospital tea taste like home. Every product is designed with patients, survivors, and oncology nurses, and every purchase funds our care kits — packed by volunteers and delivered free to treatment centers.

## What your money does

- **$25 funds one care kit** — ginger chews, unscented balm and lotion, grippy socks, a soft cap, and a handwritten note.
- **Merch margins go to care**, not marketing. We publish our impact in plain numbers in our monthly letter.
- **Donated kits ship within the week** to our partner infusion centers.

## Who we are

We're a small team of survivors, caregivers, and friends of Lily — the person whose treatment days taught us what a safe haven actually needs to contain. We would rather be specific and small than vague and big.`,
    },
    {
      slug: "faq",
      title: "Questions, answered plainly",
      body: `## Orders

**When will my order ship?** Within 2 business days. You'll get a tracking email the moment it leaves our hands.

**Can I track without an account?** Yes — use Track an order with your order number and email.

**Returns?** 30 days, no interrogation. If something isn't right, write to us and we'll fix it.

## The cause

**How much actually goes to care?** After product and shipping costs, everything. We publish totals monthly in Letters from the Haven.

**What's in a care kit?** Ginger chews, unscented lip balm and lotion, grippy socks, a soft sleep cap, mints, and a handwritten note. About $25 to fund one.

**Can I donate without buying merch?** Yes — the Donate page takes direct gifts of any size, or add a round-up at checkout.

## Products

**Are fabrics safe for sensitive skin during chemo?** That's the design brief for everything we sell: tagless, seam-conscious, pre-washed, unscented.`,
    },
    {
      slug: "privacy",
      title: "Privacy policy",
      body: `We collect what a shop needs to work and nothing more: your account details, orders, and addresses. We do not sell your data. We do not run third-party ad trackers.

Payment details go directly to our payment processor and never touch our servers. Emails are used for order updates and, only if you opted in, our monthly letter — unsubscribe anytime with one click.

Want your account and data deleted? Email us and it's done within 30 days.`,
    },
    {
      slug: "terms",
      title: "Terms of service",
      body: `By shopping here you agree to the ordinary things: accurate information at checkout, lawful use of the site, and patience with a small team doing its best.

Prices are in U.S. dollars. We may correct obvious pricing errors before shipment. Returns are accepted within 30 days of delivery; refunds go to the original payment method.

This site is run by Lily's Safe Haven for Cancer. Questions about these terms: care@lilyssafehavenforcancer.com.`,
    },
    {
      slug: "shipping-returns",
      title: "Shipping & returns",
      body: `**Shipping.** Flat-rate U.S. shipping, free over $75. Orders leave within 2 business days; tracking is emailed automatically.

**Returns.** 30 days from delivery, any reason. Start one by replying to your order email or via the contact page. Care-kit donations ("Donate to a patient") are delivered on your behalf and aren't returnable.`,
    },
  ];
  for (const page of pages) await db.page.create({ data: page });

  // ---------- Stories ----------
  const stories = [
    {
      slug: "why-lily",
      title: "Why Lily",
      excerpt: "The person behind the name, and the kitchen table where this all started.",
      body: `Lily is real. She's a sister, a lab tech, a person who kept a running list titled "things nobody tells you" through fourteen months of treatment.

The list was practical to the point of comedy: the infusion suite is cold (bring a real blanket, not a nice one — a warm one). Hospital socks are slippery. Metal spoons taste like batteries during chemo week. Unscented everything. A hat without seams.

When she reached the other side, we did the obvious thing: we turned the list into a shop, and pointed every dollar back at the people still in the chair. The products here aren't merchandising — they're the list, item by item, made properly.`,
      coverUrl: "/seed/collection-keepsakes.svg",
      publishedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    },
    {
      slug: "whats-in-a-care-kit",
      title: "What's inside a care kit (and why)",
      excerpt: "Every item earned its place. Here's the reasoning, straight from patients and nurses.",
      body: `**Ginger chews** — the most requested item, full stop. Nausea is the constant companion.

**Unscented lip balm and lotion** — treatment dries everything out, and scent sensitivity makes "lightly fragranced" a threat.

**Grippy socks** — infusion floors are cold and polished. Falls are a real risk.

**A soft sleep cap** — for scalps that suddenly feel everything.

**Mints** — chemo's metallic taste, meet peppermint.

**A handwritten note** — written by volunteers, and according to our surveys, the item people keep longest.

$25 funds one kit. Our volunteers pack them monthly, and partner infusion centers hand them to patients starting their first cycle.`,
      coverUrl: "/seed/kit.svg",
      publishedAt: new Date(Date.now() - 18 * 24 * 3600 * 1000),
    },
    {
      slug: "spring-impact-letter",
      title: "Your spring, in care kits",
      excerpt: "212 kits funded, three new partner centers, and the note that made us cry.",
      body: `Short version: you funded **212 care kits** this spring. Two hundred and twelve first-cycle patients got a warm bag of practical kindness from a stranger.

We added three partner infusion centers this quarter, which means kits now reach patients in four states. The blanket remains your favorite way to help (no surprise — it's the best thing we make).

One note back from a patient, shared with permission: *"I've been trying to explain to my family what I need. Someone I've never met packed it into a bag."*

That's the whole model. Thank you for being the someone.`,
      coverUrl: "/seed/collection-comfort.svg",
      publishedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  ];
  for (const story of stories) await db.post.create({ data: story });

  // ---------- Demo customer + orders ----------
  const customer = await db.user.create({
    data: {
      email: "customer@example.com",
      name: "Dana Whitfield",
      passwordHash: await bcrypt.hash("customer123", 12),
      addresses: {
        create: {
          label: "Home",
          fullName: "Dana Whitfield",
          line1: "418 Meadowlark Lane",
          city: "Asheville",
          state: "NC",
          postalCode: "28801",
          country: "United States",
          isDefault: true,
        },
      },
    },
  });

  const address = {
    fullName: "Dana Whitfield",
    line1: "418 Meadowlark Lane",
    city: "Asheville",
    state: "NC",
    postalCode: "28801",
    country: "United States",
  };

  const demoOrders = [
    { slugs: [["softest-chemo-day-blanket", 0, 1], ["hope-blooms-mug", 0, 2]], status: "DELIVERED", daysAgo: 21, donation: 500, user: true },
    { slugs: [["chemo-care-kit", 1, 2]], status: "DELIVERED", daysAgo: 16, donation: 0 },
    { slugs: [["still-here-tee", 1, 1], ["lily-bead-bracelet", 0, 2]], status: "SHIPPED", daysAgo: 6, donation: 200 },
    { slugs: [["safe-haven-hoodie", 2, 1]], status: "FULFILLED", daysAgo: 3, donation: 0, user: true },
    { slugs: [["calm-waters-candle", 0, 2], ["cozy-hospital-socks", 0, 1]], status: "PAID", daysAgo: 1, donation: 1000 },
    { slugs: [["warrior-garden-tote", 0, 1]], status: "PENDING", daysAgo: 0, donation: 0 },
  ];

  let orderIndex = 1001;
  for (const spec of demoOrders) {
    const items = spec.slugs.map(([slug, variantIdx, qty]) => {
      const product = createdProducts[slug];
      const variant = product.variants[variantIdx] ?? product.variants[0];
      return { product, variant, qty };
    });
    const subtotal = items.reduce((s, i) => s + i.variant.priceCents * i.qty, 0);
    const shipping = subtotal >= 7500 ? 0 : 599;
    const total = subtotal + shipping + spec.donation;
    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 3600 * 1000);
    await db.order.create({
      data: {
        number: `LSH-${orderIndex++}`,
        userId: spec.user ? customer.id : null,
        email: spec.user ? customer.email : "friend@example.com",
        status: spec.status,
        shippingName: address.fullName,
        shippingAddress: address,
        subtotalCents: subtotal,
        shippingCents: shipping,
        donationCents: spec.donation,
        totalCents: total,
        paymentMethod: "test",
        createdAt,
        items: {
          create: items.map((i) => ({
            variantId: i.variant.id,
            title: i.product.title,
            variantTitle: i.variant.title === "Default" ? "" : i.variant.title,
            imageUrl: i.product.images[0]?.url ?? null,
            unitCents: i.variant.priceCents,
            quantity: i.qty,
          })),
        },
        events: {
          create: [{ message: "Order placed (demo data).", createdAt }],
        },
      },
    });
  }
  console.log("[seed] demo customer + 6 demo orders created");
  console.log("[seed] done");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
