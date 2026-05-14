export const REGEAR_ROLES = [
  { id: 'Tank', icon: 'shield', color: 'text-sky-400' },
  { id: 'Sup', icon: 'bolt', color: 'text-violet-400' },
  { id: 'Looter', icon: 'handshake', color: 'text-amber-400' },
  { id: 'BM', icon: 'skull', color: 'text-rose-400' },
  { id: 'DPS', icon: 'swords', color: 'text-red-400' },
  { id: 'Healer', icon: 'medical_services', color: 'text-emerald-400' },
];

export const buildDefaultRegearAmounts = () =>
  Object.fromEntries(REGEAR_ROLES.map((role) => [role.id, 0]));

export const normalizeRegearAmounts = (value) => {
  const defaults = buildDefaultRegearAmounts();

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  return REGEAR_ROLES.reduce((acc, role) => {
    const nextValue = Number(value[role.id]);
    acc[role.id] = Number.isFinite(nextValue) && nextValue >= 0 ? Math.floor(nextValue) : 0;
    return acc;
  }, defaults);
};
