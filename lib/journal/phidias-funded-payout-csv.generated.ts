/**
 * Phidias — funded payout (buffer, mini, max par retrait).
 * Source: `CSV Propfirm Rules/Phidias Rules.csv` (consistency / min trading days exclus de la logique app).
 * Le CSV ne distingue pas les paliers 1er–4e+ : même plafond pour chaque retrait (répété 4× pour le moteur runway).
 */
export type PhidiasFundedPayoutCsvRow = {
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMax1stUsd: number;
  payoutMax2ndUsd: number;
  payoutMax3rdUsd: number;
  payoutMax4thPlusUsd: number;
};

export const PHIDIAS_FUNDED_FROM_CSV: Record<string, PhidiasFundedPayoutCsvRow> = {
  "Phidias Static|25k": {
    bufferUsd: 1500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 1000,
    payoutMax2ndUsd: 1000,
    payoutMax3rdUsd: 1000,
    payoutMax4thPlusUsd: 1000,
  },
  "Phidias Static OTP|25k": {
    bufferUsd: 1500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 1000,
    payoutMax2ndUsd: 1000,
    payoutMax3rdUsd: 1000,
    payoutMax4thPlusUsd: 1000,
  },
  "Phidias Fundamental OTP|50k": {
    bufferUsd: 2600,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2000,
    payoutMax4thPlusUsd: 2000,
  },
  "Phidias Fundamental|50k": {
    bufferUsd: 2600,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2000,
    payoutMax4thPlusUsd: 2000,
  },
  "Phidias Fundamental OTP|100k": {
    bufferUsd: 3700,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2500,
    payoutMax4thPlusUsd: 2500,
  },
  "Phidias Fundamental|100k": {
    bufferUsd: 3700,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2500,
    payoutMax4thPlusUsd: 2500,
  },
  "Phidias Fundamental OTP|150k": {
    bufferUsd: 4500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2750,
    payoutMax2ndUsd: 2750,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 2750,
  },
  "Phidias Fundamental|150k": {
    bufferUsd: 4500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2750,
    payoutMax2ndUsd: 2750,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 2750,
  },
  "Phidias Swing OTP|50k": {
    bufferUsd: 2600,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2000,
    payoutMax4thPlusUsd: 2000,
  },
  "Phidias Swing|50k": {
    bufferUsd: 2600,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2000,
    payoutMax2ndUsd: 2000,
    payoutMax3rdUsd: 2000,
    payoutMax4thPlusUsd: 2000,
  },
  "Phidias Swing OTP|100k": {
    bufferUsd: 3700,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2500,
    payoutMax4thPlusUsd: 2500,
  },
  "Phidias Swing|100k": {
    bufferUsd: 3700,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2500,
    payoutMax2ndUsd: 2500,
    payoutMax3rdUsd: 2500,
    payoutMax4thPlusUsd: 2500,
  },
  "Phidias Swing OTP|150k": {
    bufferUsd: 4500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2750,
    payoutMax2ndUsd: 2750,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 2750,
  },
  "Phidias Swing|150k": {
    bufferUsd: 4500,
    payoutMiniUsd: 500,
    payoutMax1stUsd: 2750,
    payoutMax2ndUsd: 2750,
    payoutMax3rdUsd: 2750,
    payoutMax4thPlusUsd: 2750,
  },
};
