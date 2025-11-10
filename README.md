<img width="806" height="488" alt="image" src="https://github.com/user-attachments/assets/3a7d6345-185a-4670-aaab-c9c0f42f70af" />

# EarthWise
**AI-Powered Sustainability + Wellness Coach**

EarthWise transforms everyday purchasing behavior into personalized eco-friendly habit building.  
Instead of generic reminders — EarthWise analyzes **SKU-level purchases** and generates actionable tasks that improve both personal wellness and environmental sustainability.

---

## 🚀 Inspiration
Most habit trackers tell everybody the same thing:

> “drink more water” • “walk more” • “save energy”

But your receipts and transactions tell a deeper story about your lifestyle.  

We asked:
**What if we used Purchase Data + AI to create truly personalized tasks?**

That’s what EarthWise does — powered by Knot SDK.

---

## 🧱 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui |
| Backend / Data | Supabase (Auth + Postgres) |
| Transaction Intelligence | Knot SDK → transformed via `/api/knot/sync` |
| AI Planning | `{ goals, purchases }` → multi-step plan (Gemini/OpenAI ready) |
| Impact Engine | points → trees / liters of water / kg CO₂ |

---

## ⚙️ How It Works

1. User links accounts via the Knot SDK *(future live modal flow)*
2. `/api/knot/sync` proxies to Knot dev endpoint  
   → solves CORS + domain allow-listing during hackathon  
3. Transactions are normalized into SKU-level behavioural signals
4. AI planning endpoint turns `{ goals, purchases }` into habit steps
5. Completed tasks generate “impact points” → mapped to real-world metrics

---

## 📊 Impact Metrics Example
treesPlanted = floor(points / 120)
waterLiters = round(points * 2.75)
co2AvoidedKg = round(points * 0.42, 2)


These coefficients can later be tied to verified environmental datasets.

---

## 🔍 Challenges

| Challenge | Solution |
|---|---|
| Knot allow-listing / CORS blocking | Built server-side proxy fallback |
| State not syncing between pages | Moved persistence into Supabase |
| No time for full LLM integration | Mock steps, but real production API shape |

---

## 🎯 What’s Next

- Enable full Knot web-modal connection (production)
- Replace mock planner with Gemini (user-selectable model choice)
- Deploy to Vercel + track historic task completion
- Power a Predictive Intelligence dashboard based on user behaviour trends

---

## 🧠 Why It Matters

**Creativity:** Purchase data → habit recommendations  
**Utility:** Real behaviour, not generic self-reported goals  
**Impact:** Points convert into measurable climate benefit  
**Execution:** Polished UI + backend + sponsor integration in ~36 hours

---

## 🙏 Thank You

EarthWise shows how much impact can come from everyday actions —  
when data is used thoughtfully, and AI guides people toward better choices.

> We can’t wait for you to test it and see your impact in real time.

