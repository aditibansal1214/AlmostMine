# AlmostMine Analytics Specification

## 1. Architectural Principles
- **Separation of Concerns**: Pure, deterministic calculations reside in `src/analytics/` with strict TypeScript types, pure inputs, and deterministic outputs.
- **Privacy & Security**: Pure functions never make direct network or Firestore calls and never receive raw private user records.
- **Grounded AI Explanations**: Server-side `/api/ai/explain` receives only aggregated result metrics (never raw records) and returns concise, calm explanations.
- **Sufficiency Gates**: Every calculation reports sample size `n`, sufficiency status (`Sufficient`, `Limited`, `Insufficient`), and minimum thresholds.

---

## 2. The Eight Analytics Use Cases

### 1. Marketplace Performance (Descriptive)
- **Question**: How actively is our community sharing, requesting, and completing gear exchanges?
- **KPIs**: Active listings, Requests received, Approved bookings, Completed exchanges, Completion rate, Booked value, Completed value, Recorded earnings, Commission, Category distribution.
- **Visualizations**: Weekly trend line and category volume bar chart.
- **Data Requirements**: Minimum 10 completed or terminal bookings for category breakdown.

### 2. Idle Asset and Community Savings (Descriptive)
- **Question**: How effectively are idle personal items being converted into community utility and avoided consumer spend?
- **KPIs**: Completed exchanges, Average reuse count per listing, Zero-booking listings (active > 14 days with 0 requests), Estimated borrower savings (Upper-bound estimate based on replacement spend avoided), Recorded owner earnings, Community idle share.
- **Visualizations**: Reuse count distribution histogram, Idle vs used comparison by category.

### 3. Booking Drop-off Investigator (Diagnostic)
- **Question**: Where and why do borrow requests drop off before completion?
- **Funnel Stages**: Requested → Responded → Approved → Completed (with Rejected and Cancelled branches).
- **Segmentation**: Category, Price quartile within category, Response delay (<2h, 2–24h, 1–3d, >3d), Lead time (<2d, 2–7d, >7d), Trip length.
- **Methodology**: Segment rates with sample size `n` and 95% Wilson score confidence intervals. Flagged only when `n >= 10` and interval does not overlap the overall rate. Wording strictly states "associated with", never "caused by".

### 4. Demand and Pricing Gap (Diagnostic)
- **Question**: Where are community supply shortages or oversupplies occurring?
- **Metrics**: Per category and community cluster: Active listings, Open wishes, Requests, Approval rate, Median daily price, Supply-demand ratio `(requests + open wishes) / active listings`.
- **Labels**: "Possible shortage" (high demand, low active supply) and "Possible oversupply". Includes standard correlation caveat.

### 5. Seven-Day Category Demand Forecast (Predictive)
- **Question**: How many requests are expected across gear categories over the next 7 days?
- **Methodology**: Trailing 7-day rolling mean baseline; day-of-week seasonality index applied only with >= 6 full weeks of history. Refuses to forecast with under 28 days of history. Backtested against last 14 days held out; reports MAE against naive same-day-last-week baseline.
- **Display**: Solid line for observed history, dashed line with shaded uncertainty band for forecast.

### 6. Booking Cancellation Risk (Predictive)
- **Question**: What is the indicative cancellation risk of an incoming request?
- **Methodology**: Empirical Bayes smoothed segment rate: `(cancelled + k * global_rate) / (terminal + k)` with smoothing factor `k = 10`. Features: lead time, trip length, category, price tier, response delay, prior cancellations.
- **Output**: Categorical `Low`, `Medium`, or `High` risk with top contributing feature factors (not a calibrated probability).
- **Badge**: "Illustrative baseline, not a validated model" unless 200+ terminal live bookings exist and holdout validation (AUC & Brier score) is verified.

### 7. Smart Listing and Pricing Recommendations (Prescriptive)
- **Question**: How can owners improve listing discoverability and booking frequency?
- **Rules Engine**: Deterministic rules in `src/analytics/rules/`:
  - `R-PRICE-HIGH`: Zero requests after 14 days and price > 75th percentile of category (with >= 5 comparables).
  - `R-PHOTOS`: Fewer than 3 photos uploaded.
  - `R-RESPONSE`: Median response time > 24 hours with elevated rejection.
  - `R-AVAIL`: Availability gaps on days with highest community request volume.
  - `R-REPRICE-LOW`: High approval rate and price below category median.
- **Actionability**: Each item shows rule ID, quantitative evidence, assumptions, suggested action, and allows "Dismiss" or "Mark Done".

### 8. Growth Action Planner (Prescriptive, Admin)
- **Question**: What targeted interventions should community leads execute this week?
- **Intervention Categories**: Recruit supply, Improve existing listings, Follow up with slow responders, Close supply-demand gaps.
- **Priority Algorithm**: Weighted sum of normalized demand gap size, affected requests, ease of action, and data sufficiency. Configurable sliders that sum to 100.
