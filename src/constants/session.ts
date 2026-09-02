/**
 * Stand-in for a real auth/session lookup. There is no login flow yet — the
 * signed-in worker is fixed to this id. Replace with a real session read
 * once auth is wired in; nothing else should need to change.
 */
export const CURRENT_WORKER_ID = 'sy';
