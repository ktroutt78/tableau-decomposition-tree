/**
 * EXPERIENCE MODAL JAVASCRIPT
 *
 * Handles:
 * - Click to expand experience cards
 * - Display full job details in modal
 * - Modal open/close functionality
 */

// ========== EXPERIENCE MODAL ==========

const experienceModal = document.getElementById('experienceModal');
const experienceModalClose = document.getElementById('experienceModalClose');
const experienceCards = document.querySelectorAll('.experience-card');

/**
 * Open experience modal with job details
 * @param {HTMLElement} card - The experience card element that was clicked
 */
function openExperienceModal(card) {
  // Get data from the card
  const title = card.querySelector('.experience-title').textContent;
  const company = card.querySelector('.experience-company').textContent;
  const date = card.querySelector('.experience-date').textContent;
  const description = card.querySelector('.experience-description').textContent;

  // Get achievements if they exist (might be hidden)
  const achievementsList = card.querySelector('.experience-achievements');
  const achievements = achievementsList ? Array.from(achievementsList.querySelectorAll('li')).map(li => li.textContent) : [];

  // Get tools if they exist (might be hidden)
  const toolsContainer = card.querySelector('.experience-tools');
  const tools = toolsContainer ? Array.from(toolsContainer.querySelectorAll('.badge')).map(badge => badge.textContent) : [];

  // Populate modal
  document.getElementById('expModalTitle').textContent = title;
  document.getElementById('expModalCompany').textContent = company;
  document.getElementById('expModalDate').textContent = date;
  document.getElementById('expModalDescription').textContent = description;

  // Populate achievements
  const achievementsContainer = document.getElementById('expModalAchievements');
  const achievementsSection = document.getElementById('expModalAchievementsSection');

  if (achievements.length > 0) {
    achievementsContainer.innerHTML = achievements.map(achievement =>
      `<li>${achievement}</li>`
    ).join('');
    achievementsSection.style.display = 'block';
  } else {
    achievementsSection.style.display = 'none';
  }

  // Populate tools
  const toolsContainer2 = document.getElementById('expModalTools');
  const toolsSection = document.getElementById('expModalToolsSection');

  if (tools.length > 0) {
    toolsContainer2.innerHTML = tools.map(tool =>
      `<span class="badge">${tool}</span>`
    ).join('');
    toolsSection.style.display = 'block';
  } else {
    toolsSection.style.display = 'none';
  }

  // Show modal
  experienceModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Close experience modal
 */
function closeExperienceModal() {
  experienceModal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Add click event listeners to all experience cards
experienceCards.forEach(card => {
  card.addEventListener('click', () => {
    openExperienceModal(card);
  });

  // Add keyboard accessibility
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openExperienceModal(card);
    }
  });
});

// Close button click
experienceModalClose.addEventListener('click', closeExperienceModal);

// Click outside modal to close
experienceModal.addEventListener('click', (e) => {
  if (e.target === experienceModal) {
    closeExperienceModal();
  }
});

// Escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && experienceModal.classList.contains('active')) {
    closeExperienceModal();
  }
});

// Prevent modal content from closing when clicking inside it
document.querySelector('.experience-modal-content').addEventListener('click', (e) => {
  e.stopPropagation();
});
