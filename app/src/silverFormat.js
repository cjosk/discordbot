export const parseSilverInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export const formatSilver = (value) =>
  new Intl.NumberFormat('tr-TR').format(Math.floor(Number(value) || 0));

export const formatSilverInput = (value) => {
  const parsed = parseSilverInput(value);
  return parsed ? formatSilver(parsed) : '';
};
