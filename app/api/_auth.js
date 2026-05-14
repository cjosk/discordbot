import { ROLES } from '../src/roles.js';
import { getLiveGuildMember } from './_discordMember.js';
import { HttpError } from './_error.js';
import { resolveServerUserRole } from './_roleResolver.js';
import { verifySessionToken } from './_session.js';

const shouldVerifyLiveMembership = () =>
  String(process.env.DISCORD_LIVE_MEMBERSHIP_CHECK || '').trim().toLowerCase() === 'true';

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const authenticateRequest = async (req, allowedRoles = [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN]) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new HttpError(401, 'Missing authorization token.');
  }

  const tokenUser = verifySessionToken(token);
  const useLiveMembership = shouldVerifyLiveMembership();
  const liveMember = useLiveMembership
    ? await getLiveGuildMember(tokenUser.id)
    : null;
  const effectiveRoleIds = liveMember?.roles || tokenUser.member_role_ids || [];
  const role = await resolveServerUserRole({
    discordId: tokenUser.id,
    memberRoleIds: effectiveRoleIds,
    fallbackRole: liveMember?.resolvedRole || tokenUser.role || ROLES.MEMBER,
  });

  const user = {
    ...tokenUser,
    role,
    member_role_ids: effectiveRoleIds,
  };

  if (!allowedRoles.includes(role)) {
    throw new HttpError(403, 'Insufficient permissions.');
  }

  return {
    token,
    user,
  };
};
