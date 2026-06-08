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

const DEFAULT_VOCABULARY_IMAGE = '../../assets/images/placeholders/defaultPV.png';

const ADMIN_VOCABULARY_STORAGE_KEY = 'echozyAdminVocabulary';

const vocabularyCategories = {
  people: 'People',
  food: 'Food & Drink',
  places: 'Places',
  body: 'Body & Health',
  feelings: 'Feelings',
  actions: 'Actions & Verbs'
};

const vocabularyCategoryClassMap = {
  people: 'people',
  food: 'food',
  places: 'places',
  body: 'body',
  feelings: 'feelings-vocab',
  actions: 'actions'
};

const vocabularyPanelClassMap = {
  people: 'panel-people',
  food: 'panel-food',
  places: 'panel-places',
  body: 'panel-body',
  feelings: 'panel-feelings',
  actions: 'panel-actions'
};

const vocabularyCardClassMap = {
  people: 'vocabulary-people',
  food: 'vocabulary-food',
  places: 'vocabulary-places',
  body: 'vocabulary-body',
  feelings: 'vocabulary-feelings',
  actions: 'vocabulary-actions'
};

let currentCategory = 'people';
let editingVocabularyId = null;
let vocabularyToDelete = null;

function createEmptyAdminVocabularyData() {
  return {
    people: [],
    food: [],
    places: [],
    body: [],
    feelings: [],
    actions: []
  };
}

function getStoredAdminVocabulary() {
  const stored = JSON.parse(localStorage.getItem(ADMIN_VOCABULARY_STORAGE_KEY) || '{}');
  return {
    ...createEmptyAdminVocabularyData(),
    ...stored
  };
}

function saveStoredAdminVocabulary(data) {
  localStorage.setItem(ADMIN_VOCABULARY_STORAGE_KEY, JSON.stringify(data));
}

function populateCategoryOptions() {
  if (!contentCategoryInput) return;

  contentCategoryInput.innerHTML = `
    <option value="">Select category</option>
    ${Object.entries(vocabularyCategories).map(([key, label]) => `
      <option value="${key}">${label}</option>
    `).join('')}
  `;
}

function generateNextVocabularyId() {
  const allVocabulary = getStoredAdminVocabulary();

  const existingIds = Object.values(allVocabulary)
    .flat()
    .map((item) => item.id)
    .filter((id) => /^VO\d{4}$/.test(id))
    .map((id) => parseInt(id.replace('VO', ''), 10));

  const nextNumber = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  return `VO${String(nextNumber).padStart(4, '0')}`;
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
  editingVocabularyId = null;

  if (modalTitle) {
    modalTitle.textContent = 'Add Vocabulary';
  }

  if (contentForm) {
    contentForm.reset();
  }

  if (contentIdInput) {
    contentIdInput.value = generateNextVocabularyId();
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

function openDeleteModal(vocabularyId) {
  vocabularyToDelete = vocabularyId;

  if (deleteModal) {
    deleteModal.classList.add('active');
  }
}

function closeDeleteModal() {
  vocabularyToDelete = null;

  if (deleteModal) {
    deleteModal.classList.remove('active');
  }
}

function findVocabularyById(vocabularyId) {
  const allVocabulary = getStoredAdminVocabulary();

  for (const [categoryKey, items] of Object.entries(allVocabulary)) {
    const foundVocabulary = items.find((item) => item.id === vocabularyId);

    if (foundVocabulary) {
      return {
        vocabulary: foundVocabulary,
        categoryKey
      };
    }
  }

  return null;
}

function openEditModal(vocabularyId) {
  const found = findVocabularyById(vocabularyId);

  if (!found) return;

  editingVocabularyId = vocabularyId;

  if (modalTitle) {
    modalTitle.textContent = 'Edit Vocabulary';
  }

  if (contentIdInput) {
    contentIdInput.value = found.vocabulary.id || '';
  }

  if (contentCategoryInput) {
    contentCategoryInput.value = found.categoryKey;
  }

  if (contentTextEnInput) {
    contentTextEnInput.value = found.vocabulary.textEn || '';
  }

  if (contentTextMsInput) {
    contentTextMsInput.value = found.vocabulary.textMs || '';
  }

  if (contentImageInput) {
    contentImageInput.value = '';
  }

  if (contentModal) {
    contentModal.classList.add('active');
  }
}

function deleteVocabulary(vocabularyId) {
  const allVocabulary = getStoredAdminVocabulary();

  Object.keys(allVocabulary).forEach((categoryKey) => {
    allVocabulary[categoryKey] = allVocabulary[categoryKey].filter((item) => item.id !== vocabularyId);
  });

  saveStoredAdminVocabulary(allVocabulary);
  renderCategoryList();
  renderVocabularyCards(currentCategory);
}

function setActiveCategory(selectedCategory) {
  currentCategory = selectedCategory;
  renderCategoryList();
  renderVocabularyCards(selectedCategory);
}

function renderCategoryList() {
  if (!categoryList) return;

  const allVocabulary = getStoredAdminVocabulary();

  categoryList.innerHTML = Object.entries(vocabularyCategories).map(([key, label]) => {
    const count = (allVocabulary[key] || []).length;
    const categoryClass = vocabularyCategoryClassMap[key];
    const activeClass = key === currentCategory ? 'active-vocabulary-category' : '';

    return `
      <button
        type="button"
        class="vocabulary-category-item ${categoryClass} ${activeClass}"
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

function renderVocabularyCards(categoryKey) {
  if (!contentList) return;

  const allVocabulary = getStoredAdminVocabulary();
  const vocabularyItems = allVocabulary[categoryKey] || [];

  contentList.className = 'vocabulary-list-panel admin-list-panel';
  contentList.classList.add(vocabularyPanelClassMap[categoryKey]);

  if (!vocabularyItems.length) {
    contentList.innerHTML = `
      <div class="board-empty-state">
        No default vocabulary added in this category yet.
      </div>
    `;
    return;
  }

  contentList.innerHTML = vocabularyItems.map((item) => `
    <div class="vocabulary-card-item ${vocabularyCardClassMap[categoryKey]}">
      <div class="vocabulary-card-left">
        <div class="vocabulary-icon-circle">
          <img src="${item.image || DEFAULT_VOCABULARY_IMAGE}" alt="${item.textEn}" />
        </div>
        <div>
          <span>${item.textEn}</span>
          <p class="admin-content-subtext">${item.textMs}</p>
        </div>
      </div>

      <div class="vocabulary-card-actions">
        <button type="button" class="vocabulary-action-btn edit-vocabulary-btn" data-edit-id="${item.id}">Edit</button>
        <button type="button" class="vocabulary-action-btn delete-vocabulary-btn" data-delete-id="${item.id}">Delete</button>
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

async function handleSaveVocabulary(event) {
  event.preventDefault();

  const vocabularyId = contentIdInput ? contentIdInput.value.trim() : '';
  const categoryKey = contentCategoryInput ? contentCategoryInput.value : '';
  const textEn = contentTextEnInput ? contentTextEnInput.value.trim() : '';
  const textMs = contentTextMsInput ? contentTextMsInput.value.trim() : '';
  const imageFile = contentImageInput ? contentImageInput.files[0] : null;

  if (!vocabularyId || !categoryKey || !textEn || !textMs) {
    alert('Please complete all vocabulary details before saving.');
    return;
  }

  const allVocabulary = getStoredAdminVocabulary();
  let existingImage = '';

  if (editingVocabularyId) {
    const found = findVocabularyById(editingVocabularyId);
    if (found) {
      existingImage = found.vocabulary.image || '';
    }

    Object.keys(allVocabulary).forEach((key) => {
      allVocabulary[key] = allVocabulary[key].filter((item) => item.id !== editingVocabularyId);
    });
  }

  const imageData = imageFile ? await readImageFileAsDataURL(imageFile) : existingImage;

  const savedVocabulary = {
    id: vocabularyId,
    textEn,
    textMs,
    image: imageData
  };

  allVocabulary[categoryKey].push(savedVocabulary);
  allVocabulary[categoryKey].sort((a, b) => a.id.localeCompare(b.id));

  saveStoredAdminVocabulary(allVocabulary);
  closeContentModal();

  currentCategory = categoryKey;
  renderCategoryList();
  renderVocabularyCards(currentCategory);
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
  contentForm.addEventListener('submit', handleSaveVocabulary);
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', () => {
    if (vocabularyToDelete) {
      deleteVocabulary(vocabularyToDelete);
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
renderVocabularyCards(currentCategory);