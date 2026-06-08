const logoutBtn = document.getElementById('logoutBtn');

const addContentBtn = document.getElementById('addContentBtn');
const contentModal = document.getElementById('contentModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const contentForm = document.getElementById('contentForm');
const modalTitle = document.getElementById('modalTitle');

const contentIdInput = document.getElementById('contentId');
const contentCategoryInput = document.getElementById('contentCategory');
const contentTextEnInput = document.getElementById('contentTextEn');
const contentTextMsInput = document.getElementById('contentTextMs');
const contentImageInput = document.getElementById('contentImage');

const categoryList = document.getElementById('categoryList');
const contentList = document.getElementById('contentList');

const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const DEFAULT_PHRASE_IMAGE = '../../assets/images/placeholders/defaultPV.png';

const ADMIN_PHRASES_STORAGE_KEY = 'echozyAdminPhrases';

const phraseCategories = {
  urgent: 'Urgent Needs',
  basic: 'Basic Responses',
  feelings: 'Feelings & Emotions',
  physical: 'Physical Condition',
  daily: 'Daily Needs',
  social: 'People & Social Communication',
  rehab: 'Rehabilitation',
  activities: 'Activities & Preferences'
};

const phraseCategoryClassMap = {
  urgent: 'urgent',
  basic: 'basic',
  feelings: 'feelings',
  physical: 'physical',
  daily: 'daily',
  social: 'social',
  rehab: 'rehab',
  activities: 'activities'
};

const phrasePanelClassMap = {
  urgent: 'panel-urgent',
  basic: 'panel-basic',
  feelings: 'panel-feelings',
  physical: 'panel-physical',
  daily: 'panel-daily',
  social: 'panel-social',
  rehab: 'panel-rehab',
  activities: 'panel-activities'
};

const phraseCardClassMap = {
  urgent: 'phrase-urgent',
  basic: 'phrase-basic',
  feelings: 'phrase-feelings',
  physical: 'phrase-physical',
  daily: 'phrase-daily',
  social: 'phrase-social',
  rehab: 'phrase-rehab',
  activities: 'phrase-activities'
};

let currentCategory = 'urgent';
let editingPhraseId = null;
let phraseToDelete = null;

function createEmptyAdminPhraseData() {
  return {
    urgent: [],
    basic: [],
    feelings: [],
    physical: [],
    daily: [],
    social: [],
    rehab: [],
    activities: []
  };
}

function getStoredAdminPhrases() {
  const stored = JSON.parse(localStorage.getItem(ADMIN_PHRASES_STORAGE_KEY) || '{}');
  return {
    ...createEmptyAdminPhraseData(),
    ...stored
  };
}

function saveStoredAdminPhrases(data) {
  localStorage.setItem(ADMIN_PHRASES_STORAGE_KEY, JSON.stringify(data));
}

function populateCategoryOptions() {
  if (!contentCategoryInput) return;

  contentCategoryInput.innerHTML = `
    <option value="">Select category</option>
    ${Object.entries(phraseCategories).map(([key, label]) => `
      <option value="${key}">${label}</option>
    `).join('')}
  `;
}

function generateNextPhraseId() {
  const allPhrases = getStoredAdminPhrases();

  const existingIds = Object.values(allPhrases)
    .flat()
    .map((phrase) => phrase.id)
    .filter((id) => /^PH\d{4}$/.test(id))
    .map((id) => parseInt(id.replace('PH', ''), 10));

  const nextNumber = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  return `PH${String(nextNumber).padStart(4, '0')}`;
}

function readImageFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.readAsDataURL(file);
  });
}

function openAddModal() {
  editingPhraseId = null;

  if (modalTitle) {
    modalTitle.textContent = 'Add Phrase';
  }

  if (contentForm) {
    contentForm.reset();
  }

  if (contentIdInput) {
    contentIdInput.value = generateNextPhraseId();
  }

  if (contentCategoryInput) {
    contentCategoryInput.value = currentCategory;
  }

  if (contentModal) {
    contentModal.classList.add('active');
  }
}

function closeContentModal() {
  if (contentModal) {
    contentModal.classList.remove('active');
  }
}

function openDeleteModal(phraseId) {
  phraseToDelete = phraseId;

  if (deleteModal) {
    deleteModal.classList.add('active');
  }
}

function closeDeleteModal() {
  phraseToDelete = null;

  if (deleteModal) {
    deleteModal.classList.remove('active');
  }
}

function findPhraseById(phraseId) {
  const allPhrases = getStoredAdminPhrases();

  for (const [categoryKey, items] of Object.entries(allPhrases)) {
    const foundPhrase = items.find((item) => item.id === phraseId);

    if (foundPhrase) {
      return {
        phrase: foundPhrase,
        categoryKey
      };
    }
  }

  return null;
}

function openEditModal(phraseId) {
  const found = findPhraseById(phraseId);

  if (!found) return;

  editingPhraseId = phraseId;

  if (modalTitle) {
    modalTitle.textContent = 'Edit Phrase';
  }

  if (contentIdInput) {
    contentIdInput.value = found.phrase.id || '';
  }

  if (contentCategoryInput) {
    contentCategoryInput.value = found.categoryKey;
  }

  if (contentTextEnInput) {
    contentTextEnInput.value = found.phrase.textEn || '';
  }

  if (contentTextMsInput) {
    contentTextMsInput.value = found.phrase.textMs || '';
  }

  if (contentImageInput) {
    contentImageInput.value = '';
  }

  if (contentModal) {
    contentModal.classList.add('active');
  }
}

function deletePhrase(phraseId) {
  const allPhrases = getStoredAdminPhrases();

  Object.keys(allPhrases).forEach((categoryKey) => {
    allPhrases[categoryKey] = allPhrases[categoryKey].filter((item) => item.id !== phraseId);
  });

  saveStoredAdminPhrases(allPhrases);
  renderCategoryList();
  renderPhraseCards(currentCategory);
}

function setActiveCategory(selectedCategory) {
  currentCategory = selectedCategory;
  renderCategoryList();
  renderPhraseCards(selectedCategory);
}

function renderCategoryList() {
  if (!categoryList) return;

  const allPhrases = getStoredAdminPhrases();

  categoryList.innerHTML = Object.entries(phraseCategories).map(([key, label]) => {
    const count = (allPhrases[key] || []).length;
    const categoryClass = phraseCategoryClassMap[key];
    const activeClass = key === currentCategory ? 'active-category' : '';

    return `
      <button
        type="button"
        class="phrase-category-item ${categoryClass} ${activeClass}"
        data-category="${key}"
      >
        <span>${label}</span>
        <small>${count} Cards</small>
      </button>
    `;
  }).join('');

  const buttons = categoryList.querySelectorAll('[data-category]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveCategory(button.dataset.category);
    });
  });
}

function renderPhraseCards(categoryKey) {
  if (!contentList) return;

  const allPhrases = getStoredAdminPhrases();
  const phrases = allPhrases[categoryKey] || [];

  contentList.className = 'phrase-list-panel admin-list-panel';
  contentList.classList.add(phrasePanelClassMap[categoryKey]);

  if (!phrases.length) {
    contentList.innerHTML = `
      <div class="board-empty-state">
        No default phrases added in this category yet.
      </div>
    `;
    return;
  }

  contentList.innerHTML = phrases.map((phrase) => `
    <div class="phrase-card-item ${phraseCardClassMap[categoryKey]}">
      <div class="phrase-card-left">
        <div class="phrase-icon-circle">
          <img src="${phrase.image || DEFAULT_PHRASE_IMAGE}" alt="${phrase.textEn}" />
        </div>
        <div>
          <span>${phrase.textEn}</span>
          <p class="admin-content-subtext">${phrase.textMs}</p>
        </div>
      </div>

      <div class="phrase-card-actions">
        <button type="button" class="phrase-action-btn edit-action-btn" data-edit-id="${phrase.id}">Edit</button>
        <button type="button" class="phrase-action-btn delete-action-btn" data-delete-id="${phrase.id}">Delete</button>
      </div>
    </div>
  `).join('');

  const editButtons = contentList.querySelectorAll('[data-edit-id]');
  editButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openEditModal(button.dataset.editId);
    });
  });

  const deleteButtons = contentList.querySelectorAll('[data-delete-id]');
  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      openDeleteModal(button.dataset.deleteId);
    });
  });
}

async function handleSavePhrase(event) {
  event.preventDefault();

  const phraseId = contentIdInput ? contentIdInput.value.trim() : '';
  const categoryKey = contentCategoryInput ? contentCategoryInput.value : '';
  const textEn = contentTextEnInput ? contentTextEnInput.value.trim() : '';
  const textMs = contentTextMsInput ? contentTextMsInput.value.trim() : '';
  const imageFile = contentImageInput ? contentImageInput.files[0] : null;

  if (!phraseId || !categoryKey || !textEn || !textMs) {
    alert('Please complete all phrase details before saving.');
    return;
  }

  const allPhrases = getStoredAdminPhrases();
  let existingImage = '';

  if (editingPhraseId) {
    const found = findPhraseById(editingPhraseId);
    if (found) {
      existingImage = found.phrase.image || '';
    }

    Object.keys(allPhrases).forEach((key) => {
      allPhrases[key] = allPhrases[key].filter((item) => item.id !== editingPhraseId);
    });
  }

  const imageData = imageFile ? await readImageFileAsDataURL(imageFile) : existingImage;

  const savedPhrase = {
    id: phraseId,
    textEn,
    textMs,
    image: imageData
  };

  allPhrases[categoryKey].push(savedPhrase);

  allPhrases[categoryKey].sort((a, b) => a.id.localeCompare(b.id));

  saveStoredAdminPhrases(allPhrases);
  closeContentModal();

  currentCategory = categoryKey;
  renderCategoryList();
  renderPhraseCards(currentCategory);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
    window.location.href = '../auth/admin-signin.html';
  });
}

if (addContentBtn) {
  addContentBtn.addEventListener('click', openAddModal);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeContentModal);
}

if (cancelModalBtn) {
  cancelModalBtn.addEventListener('click', closeContentModal);
}

if (contentModal) {
  contentModal.addEventListener('click', (event) => {
    if (event.target === contentModal) {
      closeContentModal();
    }
  });
}

if (contentForm) {
  contentForm.addEventListener('submit', handleSavePhrase);
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', () => {
    if (phraseToDelete) {
      deletePhrase(phraseToDelete);
    }
    closeDeleteModal();
  });
}

if (deleteModal) {
  deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

populateCategoryOptions();
renderCategoryList();
renderPhraseCards(currentCategory);