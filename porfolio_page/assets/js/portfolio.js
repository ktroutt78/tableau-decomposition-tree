/**
 * PORTFOLIO JAVASCRIPT FILE
 *
 * Handles:
 * - Loading projects from projects.json
 * - Building portfolio grid dynamically
 * - Portfolio filtering by category
 * - Project modal (detail view)
 *
 * TO ADD A NEW PROJECT:
 * Just edit assets/js/data/projects.json and add a new entry.
 * This script will automatically display it!
 */

// ========== LOAD PROJECTS FROM JSON ==========

let allProjects = [];
let currentFilter = 'all';

/**
 * Load projects from JSON file
 */
async function loadProjects() {
  try {
    const response = await fetch('assets/js/data/projects.json');
    const data = await response.json();
    allProjects = data.projects;

    // Display projects
    displayProjects(allProjects);
  } catch (error) {
    console.error('Error loading projects:', error);
    // Show error message to user
    const grid = document.getElementById('portfolioGrid');
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Unable to load projects. Please refresh the page.</p>';
  }
}

// ========== DISPLAY PROJECTS ==========

/**
 * Build and display project cards in the grid
 * @param {Array} projects - Array of project objects to display
 */
function displayProjects(projects) {
  const grid = document.getElementById('portfolioGrid');

  if (projects.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No projects found in this category.</p>';
    return;
  }

  // Build HTML for all project cards
  const projectsHTML = projects.map(project => {
    // Build tools badges
    const toolsBadges = project.tools.map((tool, index) => {
      const badgeClass = index === 0 ? 'badge' : 'badge-blue';
      return `<span class="${badgeClass}">${tool}</span>`;
    }).join('');

    return `
      <div class="project-card" data-category="${project.category}" data-id="${project.id}">
        <img src="${project.thumbnail}" alt="${project.title}" class="project-thumbnail">
        <div class="project-content">
          <h3 class="project-title">${project.title}</h3>
          <p class="project-description">${project.shortDescription}</p>
          <div class="project-tools">
            ${toolsBadges}
          </div>
          <div class="project-footer">
            <span class="view-project">
              View Details <i class="fas fa-arrow-right"></i>
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = projectsHTML;

  // Add click event listeners to all project cards
  const projectCards = grid.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('click', () => {
      const projectId = parseInt(card.dataset.id);
      openProjectModal(projectId);
    });
  });

  // Re-run scroll animations for new elements
  const newCards = grid.querySelectorAll('.project-card');
  newCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
  });
}

// ========== PORTFOLIO FILTERING ==========

/**
 * Filter projects by category
 */
const filterButtons = document.querySelectorAll('.filter-btn');

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    currentFilter = filter;

    // Update active button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Filter projects
    if (filter === 'all') {
      displayProjects(allProjects);
    } else {
      const filteredProjects = allProjects.filter(project => project.category === filter);
      displayProjects(filteredProjects);
    }
  });
});

// ========== PROJECT MODAL ==========

const modal = document.getElementById('projectModal');
const modalClose = document.getElementById('modalClose');

/**
 * Open project detail modal
 * @param {number} projectId - ID of the project to display
 */
function openProjectModal(projectId) {
  const project = allProjects.find(p => p.id === projectId);

  if (!project) {
    console.error('Project not found:', projectId);
    return;
  }

  // Populate modal content
  document.getElementById('modalImage').src = project.images[0] || project.thumbnail;
  document.getElementById('modalTitle').textContent = project.title;
  document.getElementById('modalDescription').textContent = project.fullDescription;
  document.getElementById('modalChallenge').textContent = project.challenge;
  document.getElementById('modalSolution').textContent = project.solution;
  document.getElementById('modalImpact').textContent = project.impact;

  // Build tools badges
  const toolsBadges = project.tools.map((tool, index) => {
    const badgeClass = index === 0 ? 'badge' : 'badge-blue';
    return `<span class="${badgeClass}">${tool}</span>`;
  }).join('');
  document.getElementById('modalTools').innerHTML = toolsBadges;

  // Format date
  const formattedDate = formatDate(project.date);
  document.getElementById('modalDate').innerHTML = `<span class="badge-gray">${formattedDate}</span>`;

  // Handle embeds (Tableau, Power BI, or images)
  const embedContainer = document.getElementById('modalEmbedContainer');

  if (project.embedType === 'tableau' && project.embedUrl) {
    embedContainer.innerHTML = `
      <div class="modal-section">
        <h3>Interactive Dashboard</h3>
        <iframe
          src="${project.embedUrl}"
          class="modal-embed"
          allowfullscreen>
        </iframe>
      </div>
    `;
  } else if (project.embedType === 'powerbi' && project.embedUrl) {
    embedContainer.innerHTML = `
      <div class="modal-section">
        <h3>Interactive Dashboard</h3>
        <iframe
          src="${project.embedUrl}"
          class="modal-embed"
          allowfullscreen>
        </iframe>
      </div>
    `;
  } else if (project.embedType === 'image' && project.images && project.images.length > 1) {
    // Show additional images
    const additionalImages = project.images.slice(1).map(img => {
      return `<img src="${img}" alt="${project.title}" style="width: 100%; border-radius: var(--radius-lg); margin-bottom: var(--spacing-lg);">`;
    }).join('');

    embedContainer.innerHTML = `
      <div class="modal-section">
        <h3>Additional Views</h3>
        ${additionalImages}
      </div>
    `;
  } else {
    embedContainer.innerHTML = '';
  }

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

/**
 * Close modal
 */
function closeProjectModal() {
  modal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Close button click
modalClose.addEventListener('click', closeProjectModal);

// Click outside modal to close
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeProjectModal();
  }
});

// Escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeProjectModal();
  }
});

// ========== UTILITY FUNCTIONS ==========

/**
 * Format date string
 * @param {string} dateString - Date in format "YYYY-MM"
 * @returns {string} Formatted date like "March 2024"
 */
function formatDate(dateString) {
  if (!dateString) return '';

  const [year, month] = dateString.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// ========== INITIALIZE ==========

// Load projects when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
});
