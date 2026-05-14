export const getParticipantIds = (split) => {
  if (!Array.isArray(split?.participants)) return [];
  return split.participants.filter((value) => typeof value === 'string' && value.trim().length > 0);
};

export const getParticipantNames = (split, players = []) => {
  if (Array.isArray(split?.participant_names) && split.participant_names.length > 0) {
    return split.participant_names;
  }

  return getParticipantIds(split)
    .map((entry) => players.find((player) => player.id === entry)?.player || entry)
    .filter(Boolean);
};

export const splitIncludesPlayer = (split, linkedPlayer) => {
  if (!split || !linkedPlayer) return false;

  const participantIds = getParticipantIds(split);
  const participantNames = getParticipantNames(split);

  return participantIds.includes(linkedPlayer.id) || participantNames.includes(linkedPlayer.player);
};
