// ─────────────────────────────────────────────────────────────────────────────
//  NexCRM — Node.js / Express / MongoDB Backend
//  Run: npm install && node server.js
// ─────────────────────────────────────────────────────────────────────────────
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const Anthropic  = require("@anthropic-ai/sdk");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT    = process.env.PORT    || 5000;
const MONGO   = process.env.MONGODB_URI || "mongodb://localhost:27017/nexcrm";
const AI_KEY  = process.env.ANTHROPIC_API_KEY;

/* ─── MongoDB Connection ─────────────────────────────────────────────────── */
mongoose.connect(MONGO)
  .then(() => console.log("✓ MongoDB connected:", MONGO))
  .catch(err => { console.error("✗ MongoDB error:", err.message); process.exit(1); });

/* ─── Schemas ────────────────────────────────────────────────────────────── */
const interactionSchema = new mongoose.Schema({
  type:    { type: String, enum: ["call", "email", "meeting", "note", "other"], default: "note" },
  content: { type: String, required: true },
  date:    { type: Date, default: Date.now },
});

const contactSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  company:     { type: String, required: true, trim: true },
  email:       { type: String, lowercase: true, trim: true },
  phone:       { type: String, trim: true },
  stage:       { type: String, enum: ["new", "contacted", "proposal", "won", "lost"], default: "new" },
  value:       { type: Number, default: 0, min: 0 },
  notes:       { type: String, default: "" },
  interactions: [interactionSchema],
  assignedTo:  { type: String, default: "Sales Rep" },
  tags:        [String],
  lastContact: { type: Date, default: Date.now },
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  contact:  { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  type:     { type: String, required: true },
  action:   { type: String, required: true },
  detail:   { type: String, default: "" },
}, { timestamps: true });

const Contact  = mongoose.model("Contact",  contactSchema);
const Activity = mongoose.model("Activity", activitySchema);

/* ─── Seed data (runs once if DB empty) ─────────────────────────────────── */
const seedDB = async () => {
  const count = await Contact.countDocuments();
  if (count > 0) return;
  await Contact.insertMany([
    { name: "Sarah Chen",      company: "TechVentures Inc.",  email: "sarah@techventures.com",    phone: "+1 555-0101", stage: "proposal",  value: 45000, notes: "Enterprise plan interest. Board approval pending.", interactions: [{ type: "call", content: "Discussed pricing" }, { type: "email", content: "Sent proposal" }] },
    { name: "Marcus Williams", company: "Global Retail Co.",  email: "mwilliams@globalretail.com", phone: "+1 555-0102", stage: "contacted", value: 28000, notes: "Warm lead via LinkedIn.", interactions: [{ type: "email", content: "Initial outreach" }] },
    { name: "Priya Patel",     company: "FinEdge Solutions",  email: "priya@finedge.io",           phone: "+1 555-0103", stage: "won",       value: 72000, notes: "Annual contract signed.", interactions: [{ type: "meeting", content: "Full product demo" }, { type: "email", content: "Contract executed" }] },
    { name: "James Okafor",    company: "StartupXYZ",         email: "james@startupxyz.com",       phone: "+1 555-0104", stage: "new",       value: 12000, notes: "Inbound from website.", interactions: [{ type: "note", content: "Website form submission" }] },
  ]);
  console.log("✓ Database seeded with sample contacts");
};
mongoose.connection.once("open", seedDB);

/* ─── Helper: log activity ──────────────────────────────────────────────── */
const logActivity = (contactId, type, action, detail = "") =>
  Activity.create({ contact: contactId, type, action, detail }).catch(console.error);

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT ROUTES
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/contacts — list all, with optional filters */
app.get("/api/contacts", async (req, res) => {
  try {
    const query = {};
    if (req.query.stage && req.query.stage !== "all") query.stage = req.query.stage;
    if (req.query.search) {
      const re = new RegExp(req.query.search, "i");
      query.$or = [{ name: re }, { company: re }, { email: re }];
    }
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/contacts/:id — single contact */
app.get("/api/contacts/:id", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/contacts — create */
app.post("/api/contacts", async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    await logActivity(contact._id, "new", "New lead created", `${contact.name} at ${contact.company}`);
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* PATCH /api/contacts/:id — update */
app.patch("/api/contacts/:id", async (req, res) => {
  try {
    const before = await Contact.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: "Contact not found" });

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastContact: new Date() },
      { new: true, runValidators: true }
    );

    /* Log stage changes */
    if (req.body.stage && req.body.stage !== before.stage) {
      await logActivity(contact._id, "stage", `Stage changed: ${before.stage} → ${req.body.stage}`, contact.name);
    }
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* DELETE /api/contacts/:id */
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/contacts/:id/interactions — add interaction */
app.post("/api/contacts/:id/interactions", async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $push: { interactions: req.body }, lastContact: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });
    await logActivity(contact._id, req.body.type || "note", "Interaction logged", req.body.content);
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE / DASHBOARD ROUTES
═══════════════════════════════════════════════════════════════════════════ */

/* GET /api/dashboard — aggregated stats */
app.get("/api/dashboard", async (req, res) => {
  try {
    const contacts = await Contact.find();
    const byStage = {};
    let pipelineValue = 0, wonRevenue = 0;

    for (const c of contacts) {
      byStage[c.stage] = (byStage[c.stage] || { count: 0, value: 0 });
      byStage[c.stage].count++;
      byStage[c.stage].value += c.value;
      if (!["won", "lost"].includes(c.stage)) pipelineValue += c.value;
      if (c.stage === "won") wonRevenue += c.value;
    }

    const wonCount = (byStage.won || {}).count || 0;
    const convRate = contacts.length ? Math.round((wonCount / contacts.length) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalContacts: contacts.length,
        pipelineValue,
        wonRevenue,
        conversionRate: convRate,
        byStage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/activities — recent activity log */
app.get("/api/activities", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity.find()
      .populate("contact", "name company")
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   AI ROUTES  (Anthropic SDK)
═══════════════════════════════════════════════════════════════════════════ */
const anthropic = new Anthropic({ apiKey: AI_KEY });

/* POST /api/ai/insight — get AI insight for a contact */
app.post("/api/ai/insight", async (req, res) => {
  if (!AI_KEY) return res.status(400).json({ success: false, error: "ANTHROPIC_API_KEY not configured" });
  try {
    const { contactId } = req.body;
    const contact = await Contact.findById(contactId);
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });

    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a sales AI. Analyze this CRM contact and give actionable advice.

Contact: ${contact.name} | ${contact.company}
Stage: ${contact.stage} | Value: $${contact.value.toLocaleString()}
Notes: ${contact.notes}
Interactions: ${contact.interactions.map(i => `${i.type}: ${i.content}`).join(", ")}

Return ONLY valid JSON:
{
  "summary": "2-sentence situation assessment",
  "urgency": "high|medium|low",
  "nextAction": "specific concrete next step",
  "winProbability": 0-100,
  "risks": ["risk1", "risk2"],
  "emailDraft": "short 3-sentence follow-up email body"
}`,
      }],
    });

    const text = msg.content[0].text;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/ai/chat — general sales assistant chat */
app.post("/api/ai/chat", async (req, res) => {
  if (!AI_KEY) return res.status(400).json({ success: false, error: "ANTHROPIC_API_KEY not configured" });
  try {
    const { messages, pipelineContext } = req.body;

    const contacts = await Contact.find().select("name company stage value");
    const stats = contacts.reduce((acc, c) => {
      if (!["won","lost"].includes(c.stage)) acc.pipeline += c.value;
      if (c.stage === "won") acc.won += c.value;
      return acc;
    }, { pipeline: 0, won: 0 });

    const systemPrompt = `You are a CRM AI sales assistant with live pipeline access.
Pipeline: $${stats.pipeline.toLocaleString()} active | Won: $${stats.won.toLocaleString()}
Contacts: ${contacts.map(c => `${c.name} (${c.company}, ${c.stage}, $${c.value})`).join("; ")}
Be concise, data-driven, and give specific actionable advice.`;

    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system:     systemPrompt,
      messages:   messages,
    });

    res.json({ success: true, data: { reply: response.content[0].text } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ─── Health check ───────────────────────────────────────────────────────── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected", ai: !!AI_KEY });
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 NexCRM API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
