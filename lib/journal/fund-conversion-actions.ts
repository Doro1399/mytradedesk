import { findEvalCompareRow, findFundedCompareRow } from "@/lib/journal/compare-account-helpers";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import { nowIso, type JournalAction } from "@/lib/journal/reducer";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { resolvePassedFundedRules } from "@/lib/journal/passed-funded-rules";

export type FundConversionPayload = {
  newDisplayName: string;
  activationFeeUsd: number;
  fundedConversionDate: string;
  tradeifySelectFundedVariant?: "daily" | "flex";
};

/** Même logique que la page Accounts — conversion challenge → funded + frais d’activation. */
export function dispatchFundConversion(params: {
  dispatch: (a: JournalAction) => void;
  state: JournalDataV1;
  challenge: JournalAccount;
  payload: FundConversionPayload;
  getAutoLabel: (accountId: string) => string | undefined;
}): void {
  const { dispatch, state, challenge, payload, getAutoLabel } = params;
  const fundedRow = findFundedCompareRow(challenge);
  const t = nowIso();
  const startDate =
    /^\d{4}-\d{2}-\d{2}$/.test(payload.fundedConversionDate) &&
    !Number.isNaN(Date.parse(payload.fundedConversionDate))
      ? payload.fundedConversionDate
      : isoDateLocal();
  const name = payload.newDisplayName.trim();
  const auto = getAutoLabel(challenge.id);
  const displayAccountCode: string | undefined =
    !name
      ? challenge.displayAccountCode
      : auto != null && name === auto
        ? undefined
        : name;
  const prevProgram = challenge.compareProgramName?.trim();
  const fundedAccountName = fundedRow?.accountName?.trim();
  let compareProgramAfterConvert =
    fundedAccountName === "LucidDirect" &&
    (prevProgram === "LucidFlex" || prevProgram === "LucidPro")
      ? prevProgram
      : fundedAccountName ?? challenge.compareProgramName;
  if (
    challenge.propFirm.name.trim() === "Tradeify" &&
    prevProgram === "Tradeify Select" &&
    payload.tradeifySelectFundedVariant === "daily"
  ) {
    compareProgramAfterConvert = "Tradeify Select Daily";
  } else if (
    challenge.propFirm.name.trim() === "Tradeify" &&
    prevProgram === "Tradeify Select" &&
    payload.tradeifySelectFundedVariant === "flex"
  ) {
    compareProgramAfterConvert = "Tradeify Select Flex";
  }
  const pnlAtFundedConvert = getAccountFinancialMetrics(state, challenge.id).totalPnlCents;
  const converted: JournalAccount = {
    ...challenge,
    accountType: "funded",
    compareProgramName: compareProgramAfterConvert,
    status: "passed",
    startDate,
    evaluationStartedDate: challenge.evaluationStartedDate ?? challenge.startDate,
    passedEvaluationDate: challenge.passedEvaluationDate ?? startDate,
    fundedConvertedDate: startDate,
    fundedProgressBaselinePnlCents: pnlAtFundedConvert,
    rulesSnapshot: { ...challenge.rulesSnapshot },
    displayAccountCode,
    profitTargetLabel: fundedRow?.target ?? challenge.profitTargetLabel,
    updatedAt: t,
  };
  const ddRow = findFundedCompareRow(converted) ?? findEvalCompareRow(converted);
  if (ddRow) {
    converted.rulesSnapshot = {
      ...converted.rulesSnapshot,
      maxDrawdownCents: Math.round(ddRow.maxDrawdownLimitUsd * 100),
    };
  }
  const passedFundedRules = resolvePassedFundedRules(converted);
  if (passedFundedRules) {
    converted.profitTargetLabel = passedFundedRules.profitTargetLabel;
  }
  dispatch({ type: "account/upsert", payload: converted });
  if (payload.activationFeeUsd > 0) {
    dispatch({
      type: "fee/upsert",
      payload: {
        id: `${challenge.id}-activation`,
        accountId: challenge.id,
        date: startDate,
        type: "activation_fee",
        amountCents: Math.round(payload.activationFeeUsd * 100),
        currency: "USD",
        note: "Funded activation (converted from evaluation)",
        createdAt: t,
        updatedAt: t,
      },
    });
  }
}

export function dispatchIntroPassedMaybeLater(params: {
  dispatch: (a: JournalAction) => void;
  state: JournalDataV1;
  accountId: string;
}): void {
  const { dispatch, state, accountId } = params;
  const acc = state.accounts[accountId];
  if (!acc) return;
  const d = isoDateLocal();
  const pnlAtPass = getAccountFinancialMetrics(state, accountId).totalPnlCents;
  dispatch({
    type: "account/upsert",
    payload: {
      ...acc,
      status: "passed",
      passedEvaluationDate: acc.passedEvaluationDate ?? d,
      fundedProgressBaselinePnlCents: pnlAtPass,
      updatedAt: nowIso(),
    },
  });
}
