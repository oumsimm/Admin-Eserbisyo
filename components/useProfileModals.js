import { useState } from 'react';

export const useProfileModals = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  return {
    logoutModal: { isVisible: showLogoutModal, open: () => setShowLogoutModal(true), close: () => setShowLogoutModal(false) },
    settingsModal: { isVisible: showSettingsModal, open: () => setShowSettingsModal(true), close: () => setShowSettingsModal(false) },
    achievementsModal: { isVisible: showAchievementsModal, open: () => setShowAchievementsModal(true), close: () => setShowAchievementsModal(false) },
    faqModal: { isVisible: showFAQModal, open: () => setShowFAQModal(true), close: () => setShowFAQModal(false) },
    qrModal: { isVisible: showQRModal, open: () => setShowQRModal(true), close: () => setShowQRModal(false) },
    badgeModal: {
      isVisible: showBadgeModal,
      open: (badge) => { setSelectedBadge(badge); setShowBadgeModal(true); },
      close: () => setShowBadgeModal(false),
      selectedBadge,
    },
  };
};