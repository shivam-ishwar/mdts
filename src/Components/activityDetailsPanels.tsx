import dayjs from "dayjs";
import { Spin } from "antd";
import type { ActivityBudget, ActivityCost, RevisionEntry } from "../Utils/dataStorege";

/** Align with ActivityBudget page: revisions live in revisionHistory; legacy rows may only have revisedBudget + date. */
export function normalizeActivityBudgetRevisions(b: ActivityBudget): RevisionEntry[] {
  if (b.revisionHistory && Array.isArray(b.revisionHistory) && b.revisionHistory.length > 0) {
    return b.revisionHistory;
  }
  if (b.revisedBudget != null && b.revisedBudgetDate) {
    return [{ amount: Number(b.revisedBudget), date: String(b.revisedBudgetDate) }];
  }
  return [];
}

export function ActivityDetailsBudgetBody({
  budget,
  loading,
}: {
  budget: ActivityBudget | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="activity-details-tab-body activity-details-tab-body--center">
        <Spin />
      </div>
    );
  }
  if (!budget) {
    return (
      <div className="activity-details-empty">
        No budget information available for this activity.
      </div>
    );
  }

  const revisions = normalizeActivityBudgetRevisions(budget);
  const lastRev = revisions.length > 0 ? revisions[revisions.length - 1] : null;
  const originalAmount =
    typeof budget.originalBudget === "number" ? budget.originalBudget : null;
  const originalDate = budget.originalBudgetDate ?? null;
  const hasRevisions = revisions.length > 0;

  const currentAmount = lastRev?.amount ?? originalAmount;
  const currentDateStr = lastRev?.date ?? originalDate ?? null;

  return (
    <div className="activity-details-budget">
      <div className="activity-details-budget__hero">
        <div className="activity-details-budget__hero-label">
          {hasRevisions ? "Current budget (after revisions)" : "Budget"}
        </div>
        <div className="activity-details-budget__hero-value">
          {currentAmount != null ? `₹${currentAmount.toLocaleString("en-IN")}` : "—"}
        </div>
        {currentDateStr ? (
          <div className="activity-details-budget__hero-meta">
            {hasRevisions ? "Last revised on " : "Budgeted on "}
            {dayjs(currentDateStr).format("DD-MM-YYYY")}
          </div>
        ) : null}
      </div>

      {hasRevisions && lastRev ? (
        <div className="activity-details-budget__card">
          <div className="activity-details-budget__card-title">Latest revision</div>
          <div className="activity-details-budget__row">
            <span className="activity-details-budget__label">Revised amount</span>
            <span className="activity-details-budget__strong">
              ₹{lastRev.amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="activity-details-budget__row">
            <span className="activity-details-budget__label">Revised on</span>
            <span className="activity-details-budget__strong">
              {dayjs(lastRev.date).format("DD-MM-YYYY")}
            </span>
          </div>
          {revisions.length > 1 ? (
            <div className="activity-details-budget__hint">{revisions.length} revisions on record</div>
          ) : null}
        </div>
      ) : null}

      {hasRevisions && (originalAmount != null || originalDate) ? (
        <div className="activity-details-budget__card activity-details-budget__card--muted">
          <div className="activity-details-budget__card-title">Original budget</div>
          <div className="activity-details-budget__row">
            <span className="activity-details-budget__label">Amount</span>
            <span className="activity-details-budget__value">
              {originalAmount != null ? `₹${originalAmount.toLocaleString("en-IN")}` : "—"}
            </span>
          </div>
          <div className="activity-details-budget__row">
            <span className="activity-details-budget__label">Budgeted on</span>
            <span className="activity-details-budget__value">
              {originalDate ? dayjs(originalDate).format("DD-MM-YYYY") : "—"}
            </span>
          </div>
        </div>
      ) : null}

      {budget.updatedAt ? (
        <div className="activity-details-budget__record-updated">
          Record updated {dayjs(budget.updatedAt).format("DD-MM-YYYY")}
        </div>
      ) : null}
    </div>
  );
}

export function ActivityDetailsCostBody({
  cost,
  loading,
  showOpportunityCode = true,
}: {
  cost: ActivityCost | null;
  loading: boolean;
  /** Timeline view historically omitted opportunity code; Status Update includes it. */
  showOpportunityCode?: boolean;
}) {
  if (loading) {
    return (
      <div className="activity-details-tab-body activity-details-tab-body--center">
        <Spin />
      </div>
    );
  }
  if (!cost) {
    return (
      <div className="activity-details-empty">
        No cost information available for this activity.
      </div>
    );
  }

  return (
    <div className="activity-details-cost">
      <div className="activity-details-cost__card">
        <div className="activity-details-cost__row">
          <span className="activity-details-cost__label">Activity cost</span>
          <span className="activity-details-cost__value">
            {cost.projectCost != null ? `₹${cost.projectCost.toLocaleString("en-IN")}` : "—"}
          </span>
        </div>
        {showOpportunityCode ? (
          <div className="activity-details-cost__row">
            <span className="activity-details-cost__label">Opportunity code</span>
            <span className="activity-details-cost__value">
              {cost.opportunityCode?.trim() ? cost.opportunityCode : "—"}
            </span>
          </div>
        ) : null}
        {cost.opportunityCost != null ? (
          <div className="activity-details-cost__row">
            <span className="activity-details-cost__label">Opportunity cost</span>
            <span className="activity-details-cost__value">
              ₹{cost.opportunityCost.toLocaleString("en-IN")}
            </span>
          </div>
        ) : null}
      </div>
      {cost.updatedAt ? (
        <div className="activity-details-cost__footer">
          Last updated {dayjs(cost.updatedAt).format("DD-MM-YYYY")}
        </div>
      ) : null}
    </div>
  );
}
