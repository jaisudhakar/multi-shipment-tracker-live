export const MONTHLY_PLAN = "Monthly Pro Plan";

export const billingConfig = {
  [MONTHLY_PLAN]: {
    amount: 9.99,
    currencyCode: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 7,
    replacementBehavior: "APPLY_ON_NEXT_BILLING_CYCLE",
  },
};