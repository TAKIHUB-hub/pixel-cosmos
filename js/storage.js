const KEY = "pixel-cosmos-v2";
const OLD_KEY = "pixel-cosmos-v1";

export function emptyState() {
  return {
    accounts: {},
    session: null,
    deeds: {},
    legacy: null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {},
        session: typeof parsed.session === "string" ? parsed.session : null,
        deeds: parsed.deeds && typeof parsed.deeds === "object" ? parsed.deeds : {},
        legacy: parsed.legacy || null,
      };
    }
  } catch {
    /* fall through */
  }

  const state = emptyState();
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const parsed = JSON.parse(old);
      state.legacy = {
        balance: Number(parsed.balance) || 0,
        owned: parsed.owned && typeof parsed.owned === "object" ? parsed.owned : {},
        redeemed: Array.isArray(parsed.redeemed) ? parsed.redeemed : [],
      };
    }
  } catch {
    /* ignore */
  }
  return state;
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function hashPassword(username, password) {
  let h = 2166136261;
  const s = `${username.toLowerCase()}::${password}::pixel-cosmos`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function currentUser(state) {
  if (!state.session || !state.accounts[state.session]) return null;
  return state.session;
}

export function accountOf(state) {
  const user = currentUser(state);
  return user ? state.accounts[user] : null;
}
