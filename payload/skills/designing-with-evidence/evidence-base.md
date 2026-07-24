# Evidence base

Findings verified against fetched sources. Tiers: `[peer]` peer-reviewed · `[industry]` industry
study with data · `[expert]` expert opinion · `[folklore]` unsupported.

**Re-verify before betting anything large on a number.** These were checked mid-2026.

---

## Habit, retention and abandonment

- **Cost of collection is the #1 killer.** `[peer]` Epstein et al., CHI 2016 (N=193 + interviews):
  financial trackers abandoned primarily due to **cost of collection (57.1%)**, especially manual
  entry. Life changes drove only 10.7%. Verbatims include _"I didn't like being so aware of how
  little money I had"_ and _"I felt guilty every time I tracked an expense that was not a
  necessity."_ The paper also names **"happy abandonment"** — stopping because the habit
  internalised, which is success, not churn. Instrument it separately.
- **Habits take months, with enormous variance.** `[peer]` Lally et al.: median **66 days**, range
  **18–254 days**. The range matters more than the median — any design that punishes a gap is
  designed to fail for most users.
- **Habits are cue-triggered, not motivation-triggered.** `[peer]` Wood & Neal. Anchor prompts to a
  real-world cue, not a generic daily push.
- **Completion is required for ownership.** `[peer]` Norton, Mochon & Ariely: the IKEA effect
  _"dissipates"_ when the task is abandoned or destroyed. A half-finished setup generates nothing.
- **Fresh Start Effect.** `[peer]` Dai, Milkman & Riis: 33% more likely to act at the start of a
  week, 47% at a semester start. Offer re-onboarding at natural boundaries.
- **Streaks are weaker than their reputation.** Best available number is vendor first-party data
  (streak-freeze users 17.19 vs 11.62 days). The _what-the-hell effect_ is real `[peer]`, and
  self-forgiveness messaging mitigated it (28g vs 70g of candy after a lapse). If a streak ships,
  it ships with forgiveness from day one.
- **Retention benchmarks** `[industry]`: fintech median D1 28% / D7 12% / D30 7%; 7% D7 is roughly
  top-quartile across products.

---

## Money psychology

- **The ostrich effect is measured, not theoretical.** `[peer]` Olafsson & Pagel (NBER w23945),
  real fintech login data: attention correlates **positively with cash holdings, negatively with
  consumer debt**, and rises when balances turn positive. The users who most need the app stop
  opening it exactly when they need it.
- **Shame withdraws, guilt corrects.** `[peer]` N=212 savings-goal experiment: high-shame condition
  produced **0.23** predicted probability of the corrective choice vs **0.69** for
  low-shame/high-guilt (p=0.02–0.03). The manipulation was counterfactual phrasing — _"if only I
  weren't [a bad person]"_ vs _"if only I hadn't [done that]"_. Ban trait nouns; use
  behaviour-level, specific, time-bound phrasing.
- **Category budgets did not reduce spending.** `[industry, N=1,944, 13 weeks]` Irrational Labs:
  **$673.25 vs $675.97 control (p > 0.4)**. Budgeters spent **1.3–1.4×** what they intended, and
  spending _inside_ budgeted categories ran **~$30 higher**. Engagement rose; behaviour did not.
- **Goal-gradient explains why.** `[peer]` Kivetz/Urminsky/Zheng; Nunes & Drèze: an artificial
  head-start raised loyalty-card redemption **19% → 34%** for identical real effort. A visible
  "₹3,000 left" bar is structurally a stamped loyalty card — it accelerates spending toward the line.
  **So: progress bars fill for savings goals, deplete for spending limits.**
- **Loss aversion is contested.** `[peer]` Meta-analytic λ ≈ 1.96, but Gal & Rucker (2018) and
  Yechiam & Zeifa (2025) find the effect weak-to-absent for **small routine losses** — which is most
  of a tracker's content. Reserve loss framing for genuinely large, threshold-crossing events.
- **Feedback valence must match expertise.** `[peer]` Finkelstein & Fishbach: novices seek and
  respond to _positive_ feedback; experts to negative. Tenure-gate tone — encouragement only for
  the first weeks.
- **"Safe-to-spend" framing** is industry-converged practice (Monzo × UK Behavioural Insights Team)
  but **no controlled comparison of "spent" vs "remaining" vs "on track" was found.** `[expert]`

---

## Cognitive load and choice

- **Germane load failed instrument validation** `[peer]` — only intrinsic and extraneous load are
  meaningfully measurable. Stop using it as a design target.
- **7±2 is misapplied.** Miller called the prevalence of seven _"a pernicious, Pythagorean
  coincidence"_. Menus are recognition, not recall. Cowan's stricter k ≈ 4.22 applies only to
  holding items **without** visual support.
- **Hick's Law does not govern menu scanning.** `[peer]` Searching a visible randomly-ordered list
  rises **linearly**; for saccades, more options can _decrease_ reaction time.
- **Choice overload largely fails to replicate.** `[peer]` Scheibehenne et al., 50 studies / 5,000+
  participants: mean effect _"effectively zero"_. The jam study does not reliably replicate.
- **Field-count reduction is a weaker lever than field clarity.** `[industry]` Unbounce: cutting 9
  fields → 6 produced a **14% conversion drop**; keeping all 9 and clarifying descriptions and
  optionality produced a **19% lift**.
- **Tesler's Law, verbatim:** _"Every application has an inherent amount of irreducible complexity.
  The only question is: Who will have to deal with it — the user, the application developer, or the
  platform developer?"_ Make that choice explicitly.

**Testable substitute for "reduce cognitive load":** count the decisions between opening the app and
completing the core action. Target ≤2.

---

## Trust and credibility

- **Visual design carries the most credibility weight in finance.** `[peer]` Fogg et al. (N=2,684,
  100 sites): "design look" cited in **46.1%** of credibility comments overall, **54.6% for
  finance** — highest of ten categories. Boring visual design in a money product is a _trust_
  failure, not a cosmetic one.
- **Stanford's 10 credibility guidelines** never mention colour or theme. Error-freedom does — one
  wrong-looking number is unrecoverable.
- **Measured trust antecedents in mobile banking are security, reliability and structural
  assurance** `[peer]` (perceived security → trust, β = 0.793). No fetched study lists theme or
  palette as an antecedent.
- **"Blue = trust" is a learned category convention**, per the field's own leading researcher — not
  innate psychology.
- **Aesthetic-usability effect is real but bounded** `[peer]`: it _"cannot compensate for major
  usability problems"_ and masks defects during research. Aesthetic judgements form in **~50 ms**.
- **Precision cuts both ways.** Precise numbers read as credible in lab settings, but a
  1,505-person applied study found **no convincing precision effect**, and precise-but-wrong damages
  trust more than round-and-hedged. Be precise where data is precise, honestly rounded where
  estimated, and never fake precision on a projection.

---

## Light vs dark

- **Light wins on legibility, and the margin grows as type shrinks.** `[peer]` Piepenbrock et al.:
  positive polarity beat dark across measured dimensions for both young and older normal-vision
  adults, **and the advantage increased linearly as font size decreased** — while participants
  reported _no subjective difference_. Dense small numerals are the worst case for dark mode.
- **"Dark = less trustworthy" is not established.** One study found lower trust ratings for dark
  e-commerce, but used _auto-converted_ dark mode (a confound its authors flag). A pre-registered
  study found dark UI did **not** increase dishonest behaviour.

**Practical:** if dark is chosen for brand or audience fit — a legitimate call — pay the legibility
cost explicitly: no weight below 400, numerals a step larger and at 500+, target 7:1 contrast on
critical figures, never pure white on pure black, elevation by surface tone rather than shadow, and
step down large accent fills so they don't vibrate.

---

## Onboarding

- **Tours fall off a cliff.** `[industry]` 4-step tours complete at **40.5%**, 5-step at just over
  **21%**. Approximately **92% of users close welcome tours immediately.**
- **Mobile overlays backfire** `[expert, usability-tested]`: users dismiss fast, don't read, and
  sequential coach marks make an app _"appear overly complicated and daunting to new users"_ — some
  users try to interact with the overlay itself.
- **No credible evidence that sample data hurts** was found. But writing demo rows into a real
  account creates a deletion chore, which is the same class of friction that drives abandonment —
  prefer a populated _preview_.

---

## AI / conversational interfaces

- **Editability is the highest-leverage lever.** `[peer]` Dietvorst et al. (2018, _Management
  Science_): letting people modify an algorithm's output raised adoption **32% → 76%** and
  **47% → 70%**, and adoption was **insensitive to how much** adjustment was allowed. It is the
  _presence_ of control. Users who could adjust also **performed better**.
- **But error is costly.** `[peer]` Dietvorst et al. (2015): after seeing an algorithm err, choosing
  it dropped **65% → 26%**, even when it was ~2× more accurate than the human.
- **Aversion vs appreciation is a moderator problem.** `[peer]` Qin et al. 2025 meta-analysis (442
  effects, N=82,078): **appreciation (d=0.27)** when the AI is seen as capable and personalisation
  isn't needed; **aversion (d=−0.50)** otherwise.
- **Confidence scores don't help.** `[peer]` Zhang/Liao/Bellamy: a numeric confidence score
  **calibrates trust but does not reliably improve joint accuracy.** Goddard et al. `[peer]`
  (74-study review) found **per-item** treatment beats one system-level score, **prominent placement
  of advice increases following _wrong_ advice**, and giving _information_ rather than a
  _recommendation_ reduces over-reliance.
- **Amershi et al. (CHI 2019), the six that govern a parse-and-confirm flow:** G2 make clear how
  well it performs · G8 support efficient dismissal · G9 **support efficient correction** · G10
  **scope services when in doubt** (disambiguate rather than guess) · G11 explain why · G16 convey
  consequences.
- **Editing beats re-prompting.** `[peer]` STEPS (EMNLP 2023): editing the system's stated
  interpretation got **2×–4× more tasks completed correctly** than accept/reject. SmartEdit:
  targeted single-field correction gave **54.1% lower failure rate** than restating the whole entry.
- **Natural language is an accelerator, not a replacement.** `[peer]` JMIR 2021 (n=20): a
  **single-page form beat both a multipage form and a chatbot** on completion time and every
  usability metric; the chatbot's top complaint was **inability to go back and edit**. NL wins on
  _retrieval_, loses on _bounded data entry_.
- **Don't optimise for instant.** `[preprint, N=240 RCT]` 2-second responses were rated
  significantly **less thoughtful and useful** than 9–20 s ones.

---

## Data visualization

- **Cleveland & McGill accuracy ordering** `[peer]`, replicated by Heer & Bostock: position on a
  common scale → position on non-aligned scales → length/direction/angle → area → volume/curvature
  → shading/saturation. Length carried **40–250% larger error** than position.
- **Pie charts are not read by angle.** `[peer]` Skau & Kosara: angle is the **least** accurate cue
  (log error 1.967 vs 1.032 for a full pie); arc length and area do the work. **A donut is
  statistically indistinguishable from a pie.** A **larger-radius slice is overestimated ~1.6×** —
  never vary radius for emphasis, never explode a slice.
- **There is no evidenced maximum slice count.** Practitioner values range 4–10 with no basis.
- **Truncated bars mislead 83.5%** `[peer]`, the effect **persists after explicit warning**, and
  **graph literacy does not predict resistance**. Zero baseline, always.
- **~1 in 5 read a mean bar's tip as the data's outer limit** `[peer]`, independent of education.
  Print averages as text.
- **Stacked/unaligned comparisons score roughly half** the correct-response rate of aligned ones
  `[peer]`, holding across age, gender, education and income.
- **Graph literacy is low and correlates with numeracy (r=.51)** `[peer]`, with **~1 in 3 low on
  both**. You cannot route around weak numbers by drawing a chart.
- **Titles do the work.** `[peer]` Kong, Liu & Karahalios: a slanted title significantly shifted the
  perceived message (χ²=27.06, p<.001), **65% of viewers echoed the title back** as the main
  message, and its framing persists after they forget reading it. So an auto-generated title must be
  validated against the actual data direction — a wrong title is worse than none.
- **Squarified treemaps optimise toward the perceptually worst case** — square (1:1) rectangles were
  the worst-decoded aspect ratio.

---

## Mobile interaction

- **Target size, from 120,626,225 real touch events** `[peer]` (Henze, Rukzio & Boll): error rises
  sharply below **15 mm** and **exceeds 40% below 8 mm**. **Border targets carry ~2× the error of
  centre targets** (31.68% vs 17.59%).
- **The Fitts formula does not quantitatively fit mobile touch data** `[peer]` — direction holds,
  the model does not.
- **Dominant error cause is a perceived-input-point offset**, not fat-finger occlusion `[peer]`.
- **Gesture-nav phones reclaim the edges** — the classic "infinite edge target" advantage is gone;
  apps recover at most ~200 dp per edge.
- **Swipe discovery is unreliable** `[peer]`: baseline gesture-execution error up to **~50%**, still
  **~18–20% with cueing**, and adding visual signifiers to transition animations produced **no
  significant improvement** (CHI 2025). Always provide a visible fallback.
- **Reachability features are a situational fallback, not a habit** `[peer]` — plain regrip gave
  lower completion time overall.
- **Keyboard behaviour:** iOS Safari resizes the **visual viewport only**; Android Chrome converged
  on this in Chrome 108. `window.visualViewport` is the correct mechanism on both.

---

## Motion and perceived performance

- **Skeleton screens are contested-to-negative.** `[industry, N=136, randomised, identical real load
times]` The skeleton performed **worst on every metric**: 59% agreed "loaded quickly" vs **74% for
  a spinner**; perceived wait 2.82 s vs 2.41 s. The peer-reviewed study (N=14) found **no
  difference** and stated the claimed benefit **could not be proven**. What every study agrees on is
  that _something_ beats nothing.
- **Progress-bar manipulation works — at 5–15 s.** `[peer]` Harrison et al.: backwards-decelerating
  ribbing made a 5 s bar feel like 5.61 s (**+12%**). **Do not extrapolate to 1–3 s waits.**
- **The labour illusion reverses on a bad outcome.** `[peer]` Buell & Norton: showing effort raised
  perceived value, and 62–63% chose a transparent wait over instant results — **but the benefit
  decays with wait length and reverses hard when the outcome disappoints**, rating worse than doing
  nothing at all. So: no "Thinking…" theatre in front of a result that might be wrong.
- **Animation for comprehension is a negative result.** `[peer]` Tversky, Morrison & Bétrancourt:
  _"the research on the efficacy of animated over static graphics is not encouraging… The apparent
  successes turned out not to be successes."_ Where animation appeared to win, the animated version
  conveyed more information or added interactivity. **This paper is routinely cited backwards** —
  automated summaries of it are unreliable.
- **Countdowns increase frustration** vs elapsed-time displays, and are contraindicated for
  indeterminate waits `[peer, CHI 2026, N=425]`.
- **Optimistic UI has no study** `[folklore]`. Convention: show pending state visibly distinct from
  confirmed, reconcile in place, never silently revert.

---

## Accessibility (normative, W3C)

- **2.5.8** target size 24×24 CSS px (AA); **2.5.5** 44×44 (AAA)
- **1.4.3** contrast 4.5:1 text / 3:1 large; **1.4.11** 3:1 non-text and graphical objects
- **3.3.7 Redundant Entry (Level A)** — previously entered information must be auto-populated or
  selectable. _This is a conformance rule against re-asking, which is also the most common
  friction bug._
- **3.3.8 Accessible Authentication (AA)** — no cognitive-function test as the sole gate. **A
  recalled password is such a test**; pasteable OTP, passkeys and federated sign-in conform.
- **1.4.1 Use of Color (A)** — colour never the sole carrier. ~8% of men are red-green colour blind.
- **1.4.4** resize to 200%; **1.4.10** reflow at 320 CSS px; **2.4.11** focus not obscured

---

## India-specific

- **`Intl.NumberFormat('en-IN')` grouping is correct** (`1,23,456.78`), but **compact notation is
  broken** — renders 100000 as `"100K"` instead of `"1L"`. Hand-roll short forms.
- **UPI is the dominant mental model** — NPCI mid-2026: ~22.7 **billion** transactions/month. Model
  capture as payer-initiated push ("I paid X to Y"), not classification into an account structure.
- **Financial literacy is 24%** `[industry, S&P Global]` — lowest among BRICS. Assume it as the
  default, not the edge case.
- **English proficiency is a minority position** — Census 2011 ~10.6%; a 2019 nationally
  representative survey found **6%**. English-only v1 is a defensible _scope decision_, not a market
  assumption. Centralise strings so localisation is a data change.
- **Device and network reality:** Android ~92%; 4–8 GB RAM the largest segment; **5G upload is only
  ~7.5% of throughput** with ~52 ms latency. Design for slow uploads and useful-offline capture.
- **Dark patterns are regulated.** India's CCPA guidelines name **13 specified patterns** —
  including confirm-shaming, subscription traps, drip pricing and nagging — with penalties to
  ₹20 lakh. Cancellation must be symmetric with subscription; all charges disclosed before payment.
- **SMS-parsing for budgeting is permitted narrowly** under platform policy, financial senders only,
  with an approved permissions declaration.

---

## Do not cite — verified false or untraceable

- **"Doherty Threshold: 400 ms."** The figure appears **nowhere** in the 1982 IBM report. It traces
  to a 2015 blog whose author says he learned it _"while watching AMC's Halt and Catch Fire"_. A
  popular UX-law site inserted "(<400ms)" into a direct quotation that does not contain it. The real
  finding is **sub-one-second**, and it measured mainframe **transaction throughput**.
- **"Nielsen's 0.1/1/10 s comes from Miller 1968."** Miller explicitly rejects a universal number
  and gives seventeen task-contingent categories; his 0.1 s refers to **mechanical key-click
  feedback**.
- **The thumb-zone heat map.** Its author **publicly retracted the framing in 2017**; the famous
  49/36/15 split was of 780 observations (not 1,333); the circulating heat map is a later
  third-party illustration; and people **centre-bias** and readily hit corners.
- **"63% more likely to abandon a habit after one missed day."** Not in its supposed source.
- **"Chime cut support calls 22% by simplifying jargon"** and **"3× more likely to abandon on
  unfamiliar financial terms."** Not on the page they circulate from.
- **Jakob's Law "95–99% of their time."** Not on the source page.
- **Apple 44pt / Material 48dp** could not be verified against primary docs — cite the WCAG numbers
  and the ~1 cm empirical floor instead.
- **Any `prefers-reduced-motion` prevalence figure.** All trace to blogs citing blogs.
- **Bottom-sheet vs full-screen conversion lifts.** No such data exists; the circulating percentages
  match the fabricated-stat pattern exactly.
