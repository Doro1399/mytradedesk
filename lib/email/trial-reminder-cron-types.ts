/** Success JSON from `GET /api/cron/trial-reminder-emails` (stable shape for monitoring / clients). */
export type TrialReminderEmailsCronSuccess = {
  ok: true;
  route: "trial-reminder-emails";
  now: string;
  scanned: number;
  countsInBucket: {
    day7: number;
    day11: number;
    day14: number;
  };
  emailsSent: {
    day7: number;
    day11: number;
    day14: number;
  };
  emailsSkipped: {
    total: number;
    alreadySent: number;
    invalidEmail: number;
    claimFailed: number;
  };
  errors: string[];
};

export type TrialReminderEmailsCronError = {
  ok: false;
  error: string;
};
