#!/usr/bin/env node
// One-shot import of beta phase 2 contacts into auth.users.
// Run with: SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-beta-list.mjs

const SUPABASE_URL = "https://qitxinguabvjuoeyhkcv.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY env var is required");
  process.exit(1);
}

const CONTACTS = [
  { name: "Kameron Carter", email: "twoxyz@gmail.com", phase: null },
  { name: "Colton Kelly", email: "Coltondavidkelly@icloud.com", phase: 2 },
  { name: "TJ", email: "akatj333@gmail.com", phase: 2 },
  { name: "Nicholas Davis", email: "nickdavis11@gmail.com", phase: 2 },
  { name: "Branden", email: "btuckv@gmail.com", phase: 2 },
  { name: "Ted", email: "tedfred320@gmail.com", phase: 2 },
  { name: "Tyrique Parkes", email: "tradewithfutures@gmail.com", phase: 2 },
  { name: "Evan McNeil", email: "evenmcneil43@gmail.com", phase: 2 },
  { name: "Jlesip Garcia", email: "jlesip62@gmail.com", phase: 2 },
  { name: "Alan Tucker", email: "Alantucker77@gmail.com", phase: 2 },
  { name: "Kalani Fitzhugh", email: "kalanifitz@gmail.com", phase: 2 },
  { name: "Kenny", email: "peinuzu12@gmail.com", phase: 2 },
  { name: "Maddy", email: "maddyshed@gmail.com", phase: 2 },
  { name: "Isaiah Jones", email: "isaiahgjones@gmail.com", phase: 2 },
  { name: "Jivany Laureno", email: "jivanylaureno@gmail.com", phase: 2 },
  { name: "Tabitha", email: "astendash89@gmail.com", phase: 2 },
  { name: "Jessica Shepple", email: "jshepple17@gmail.com", phase: 2 },
  { name: "Marty Lacerte", email: "martylacerte@icloud.com", phase: 2 },
  { name: "Twon Wicks", email: "twonwicksfx@gmail.com", phase: 2 },
  { name: "Ryan", email: "bankrollbronllc@gmail.com", phase: 2 },
  { name: "Tim", email: "tim@alphaflowtrader.com", phase: 2 },
  { name: "Jesus Hernandez", email: "chuy08227@gmail.com", phase: 2 },
  { name: "Jacob", email: "jacobpotucek1@gmail.com", phase: 2 },
  { name: "Brandon", email: "brandono171@gmail.com", phase: 2 },
  { name: "Zack", email: "lecroyzack@gmail.com", phase: 2 },
  { name: "Muse Trades", email: "blazeplump9b@icloud.com", phase: 2 },
  { name: "Elliott Endsley", email: "eends549@gmail.com", phase: 2 },
  { name: "Tina Burns", email: "tradertea01@gmail.com", phase: 2 },
  { name: "Keyton Johnson", email: "keytonjohnson@gmail.com", phase: 2 },
  { name: "Luise", email: "ljruth0217@gmail.com", phase: 2 },
  { name: "Kevin", email: "kcanny@students.stonehill.edu", phase: 2 },
  { name: "Ariel Edmonds", email: "arieledmonds8@gmail.com", phase: 2 },
  { name: "Eric", email: "theicebergtrader@gmail.com", phase: 2 },
  { name: "Erik Stephan", email: "erik@flowtraderlive.com", phase: 2 },
  { name: "William Bishop", email: "william.r.bishop2@gmail.com", phase: 2 },
  { name: "Katrina Quichocho", email: "katrinaquichocho@gmail.com", phase: 2 },
  { name: "Synbad", email: "synv2k@gmail.com", phase: 2 },
  { name: "Andrea Nason", email: "andreanason21@gmail.com", phase: 2 },
  { name: "Brendan Fuller", email: "bfuller021@gmail.com", phase: 2 },
  { name: "Angel Williams", email: "angelw1014.pmtsh@gmail.com", phase: 2 },
  { name: "Skyler", email: "skyisdrunk@yahoo.com", phase: 2 },
  { name: "Joshua Davis", email: "joshuad20065@gmail.com", phase: 2 },
];

async function createUser(contact) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: contact.email.toLowerCase().trim(),
      email_confirm: false,
      user_metadata: {
        full_name: contact.name,
        phase: contact.phase,
        source: "beta_phase_2",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const results = { created: [], duplicate: [], failed: [] };
for (const contact of CONTACTS) {
  const result = await createUser(contact);
  if (result.ok) {
    results.created.push(contact.email);
    console.log(`OK    ${contact.email}`);
  } else if (
    result.status === 422 ||
    String(result.body?.msg || result.body?.message || "")
      .toLowerCase()
      .includes("already")
  ) {
    results.duplicate.push(contact.email);
    console.log(`DUP   ${contact.email}`);
  } else {
    results.failed.push({ email: contact.email, ...result });
    console.log(`FAIL  ${contact.email}  [${result.status}]  ${JSON.stringify(result.body)}`);
  }
}

console.log("\n--- Summary ---");
console.log(`Created:   ${results.created.length}`);
console.log(`Duplicate: ${results.duplicate.length}`);
console.log(`Failed:    ${results.failed.length}`);
if (results.failed.length) {
  console.log("\nFailures:");
  for (const f of results.failed) console.log(`  ${f.email}: ${JSON.stringify(f.body)}`);
}
