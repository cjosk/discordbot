import { useMemo, useState } from 'react';
import { Link, Search } from 'lucide-react';

import { useStore } from '../store';
import './AccountLinkModal.css';

const copy = {
  tr: {
    confirm: (playerName) =>
      `Discord hesabini "${playerName}" oyun ici karakteri ile eslestirmek istedigine emin misin? Bu islem kolayca geri alinmaz.`,
    welcome: 'Hos geldin',
    subtitle: 'Devam etmeden once Discord hesabini oyun ici karakterin ile eslestirmelisin.',
    searchPlaceholder: 'Oyun ici ismini ara...',
    select: 'Sec',
    noResults: (query) => `"${query}" ile eslesen karakter bulunamadi`,
  },
  en: {
    confirm: (playerName) =>
      `Are you sure you want to link your Discord account with the in-game character "${playerName}"? This action is not easily reversible.`,
    welcome: 'Welcome',
    subtitle: 'Before continuing, you need to link your Discord account to your in-game character.',
    searchPlaceholder: 'Search your in-game name...',
    select: 'Select',
    noResults: (query) => `No character matched "${query}"`,
  },
};

export function AccountLinkModal({ language = 'tr' }) {
  const {
    user,
    players,
    discordLinks,
    setDiscordLink,
    isLoadingPlayers,
    isLoadingDiscordLinks,
    hasLoadedPlayers,
    hasLoadedDiscordLinks,
  } = useStore();
  const text = copy[language] || copy.tr;

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = useMemo(
    () =>
      players
        .filter((player) => player.player.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 20),
    [players, searchQuery],
  );

  if (!user) return null;
  if (isLoadingPlayers || isLoadingDiscordLinks) return null;
  if (!hasLoadedPlayers || !hasLoadedDiscordLinks) return null;
  if (discordLinks[user.id]) return null;

  const handleLink = async (playerId, playerName) => {
    if (window.confirm(text.confirm(playerName))) {
      await setDiscordLink(user.id, playerId);
    }
  };

  return (
    <div className="link-modal-overlay">
      <div className="link-modal-box glass-panel animate-fade-in">
        <div className="link-modal-header">
          <Link size={32} className="w-icon" />
          <h2>{text.welcome}, {user.global_name || user.username}!</h2>
          <p>{text.subtitle}</p>
        </div>

        <div className="link-modal-body">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />
          </div>

          <div className="link-players-list">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="link-player-item"
                  onClick={() => handleLink(player.id, player.player)}
                >
                  <span>{player.player}</span>
                  <button className="btn-link">{text.select}</button>
                </div>
              ))
            ) : (
              <p className="no-res">{text.noResults(searchQuery)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
