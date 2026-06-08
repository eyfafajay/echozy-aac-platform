const addVocabularyModal = document.getElementById('addVocabularyModal');
const openAddVocabularyModal = document.getElementById('openAddVocabularyModal');
const closeAddVocabularyModal = document.getElementById('closeAddVocabularyModal');
const cancelAddVocabularyModal = document.getElementById('cancelAddVocabularyModal');
const addVocabularyForm = document.getElementById('addVocabularyForm');
const vocabularyIdInput = document.getElementById('vocabulary-id');
const vocabularyWordEnInput = document.getElementById('vocabulary-word-en');
const vocabularyWordMsInput = document.getElementById('vocabulary-word-ms');
const vocabularyCategoryInput = document.getElementById('vocabulary-category');
const vocabularyImageInput = document.getElementById('vocabulary-image');

const editVocabularyModal = document.getElementById('editVocabularyModal');
const closeEditVocabularyModal = document.getElementById('closeEditVocabularyModal');
const cancelEditVocabularyModal = document.getElementById('cancelEditVocabularyModal');
const editVocabularyForm = editVocabularyModal ? editVocabularyModal.querySelector('form') : null;
const editVocabularyIdInput = document.getElementById('edit-vocabulary-id');
const editVocabularyWordEnInput = document.getElementById('edit-vocabulary-word-en');
const editVocabularyWordMsInput = document.getElementById('edit-vocabulary-word-ms');
const editVocabularyCategoryInput = document.getElementById('edit-vocabulary-category');
const editVocabularyImageInput = document.getElementById('edit-vocabulary-image');

const deleteVocabularyModal = document.getElementById('deleteVocabularyModal');
const cancelDeleteVocabularyModal = document.getElementById('cancelDeleteVocabularyModal');
const confirmDeleteVocabularyModal = document.getElementById('confirmDeleteVocabularyModal');

const vocabularyCategoryButtons = document.querySelectorAll('.vocabulary-category-item');
const vocabularyListPanel = document.getElementById('vocabularyListPanel');
const vocabularyCardsContainer = document.getElementById('vocabularyCardsContainer');

const manageVocabularyHeading = document.getElementById('manageVocabularyHeading');
const manageVocabularySubtext = document.getElementById('manageVocabularySubtext');
const backToPatientDashboardFromVocabulary = document.getElementById('backToPatientDashboardFromVocabulary');

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const vocabularyParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const vocabularyPatientId = vocabularyParams.get('patient') || '';
const vocabularyPatientName = vocabularyParams.get('name') || 'Selected Patient';
const vocabularyPatientStatus = vocabularyParams.get('status') || 'Active';

const vocabularyUserRole = vocabularyParams.get('role') || storedSession.role || 'caregiver';
const vocabularyUserId = vocabularyParams.get('userId') || storedSession.userId || 'U0001';
const vocabularyUserName =
  vocabularyParams.get('user') ||
  vocabularyParams.get('name') ||
  storedSession.fullName ||
  'User';

const DEFAULT_VOCABULARY_IMAGE = '../../assets/images/placeholders/defaultPV.png';
const ADMIN_VOCABULARY_STORAGE_KEY = 'echozyAdminVocabulary';

let currentVocabularyCategory = 'people';
let vocabularyToDelete = null;
let vocabularyToEdit = null;

if (manageVocabularyHeading) {
  manageVocabularyHeading.textContent = `Manage Vocabulary for ${vocabularyPatientName}`;
}

if (manageVocabularySubtext) {
  manageVocabularySubtext.textContent =
    `Organize vocabulary items by category for ${vocabularyPatientName}.`;
}

const vocabularyUserQuery = new URLSearchParams({
  role: vocabularyUserRole,
  userId: vocabularyUserId,
  name: vocabularyUserName
}).toString();

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${vocabularyUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${vocabularyUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href =
    vocabularyUserRole === 'provider'
      ? `settings-provider.html?${vocabularyUserQuery}`
      : `settings-caregiver.html?${vocabularyUserQuery}`;
}

if (backToPatientDashboardFromVocabulary) {
  const backPatientQuery = new URLSearchParams({
    patient: vocabularyPatientId,
    name: vocabularyPatientName,
    status: vocabularyPatientStatus,
    role: vocabularyUserRole,
    userId: vocabularyUserId,
    user: vocabularyUserName
  }).toString();

  backToPatientDashboardFromVocabulary.href = `patient-dashboard.html?${backPatientQuery}`;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
  });
}

function createEmptyVocabularyData() {
  return {
    people: [],
    food: [],
    places: [],
    body: [],
    feelings: [],
    actions: []
  };
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function saveStoredVocabulary(data) {
  localStorage.setItem('echozyVocabulary', JSON.stringify(data));
}

function getStoredAdminVocabulary() {
  const stored = JSON.parse(localStorage.getItem(ADMIN_VOCABULARY_STORAGE_KEY) || '{}');
  return {
    ...createEmptyVocabularyData(),
    ...stored
  };
}

function getPatientVocabularyFromLocal() {
  const allVocabulary = getStoredVocabulary();
  return allVocabulary[vocabularyPatientId] || createEmptyVocabularyData();
}

function syncPatientVocabularyToLocal(patientVocabulary) {
  const allVocabulary = getStoredVocabulary();
  allVocabulary[vocabularyPatientId] = patientVocabulary;
  saveStoredVocabulary(allVocabulary);
}

function getMergedPatientVocabulary() {
  const adminVocabulary = getStoredAdminVocabulary();
  const patientVocabulary = getPatientVocabularyFromLocal();
  const merged = createEmptyVocabularyData();

  Object.keys(merged).forEach((category) => {
    const adminItems = (adminVocabulary[category] || []).map((item) => ({
      ...item,
      source: 'admin'
    }));

    const patientItems = (patientVocabulary[category] || []).map((item) => ({
      ...item,
      source: 'personal'
    }));

    merged[category] = [...adminItems, ...patientItems];
  });

  return merged;
}

function generateNextVocabularyId() {
  const patientVocabulary = getPatientVocabularyFromLocal();

  const existingIds = Object.values(patientVocabulary)
    .flat()
    .map((item) => item.id)
    .filter((id) => /^VO\d{4}$/.test(id))
    .map((id) => parseInt(id.replace('VO', ''), 10));

  const nextNumber = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  return `VO${String(nextNumber).padStart(4, '0')}`;
}

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

const vocabularyCategoryLabelMap = {
  'People': 'people',
  'Food & Drink': 'food',
  'Places': 'places',
  'Body & Health': 'body',
  'Feelings': 'feelings',
  'Actions & Verbs': 'actions'
};

function updateVocabularyCategoryCounts() {
  const mergedVocabulary = getMergedPatientVocabulary();

  vocabularyCategoryButtons.forEach((button) => {
    const category = button.dataset.category;
    const count = (mergedVocabulary[category] || []).length;
    const countEl = button.querySelector('small');

    if (countEl) {
      countEl.textContent = `${count} Cards`;
    }
  });
}

function setActiveVocabularyCategoryButton(selectedCategory) {
  vocabularyCategoryButtons.forEach((btn) => {
    btn.classList.remove('active-vocabulary-category');
  });

  const activeButton = document.querySelector(`.vocabulary-category-item[data-category="${selectedCategory}"]`);
  if (activeButton) {
    activeButton.classList.add('active-vocabulary-category');
  }
}

function setVocabularyPanelCategory(selectedCategory) {
  if (vocabularyListPanel) {
    vocabularyListPanel.className = 'vocabulary-list-panel';
    vocabularyListPanel.classList.add(vocabularyPanelClassMap[selectedCategory]);
  }
}

function renderVocabularyCards(category) {
  if (!vocabularyCardsContainer) return;

  currentVocabularyCategory = category;

  const mergedVocabulary = getMergedPatientVocabulary();
  const vocabularyItems = mergedVocabulary[category] || [];
  const cardClass = vocabularyCardClassMap[category] || 'vocabulary-people';

  if (!vocabularyItems.length) {
    vocabularyCardsContainer.innerHTML = `
      <div class="board-empty-state">No vocabulary available in this category yet.</div>
    `;
    return;
  }

  vocabularyCardsContainer.innerHTML = vocabularyItems.map((item, index) => {
    const canEditPersonalVocabulary = item.source === 'personal';

    return `
      <div class="vocabulary-card-item ${cardClass}">
        <div class="vocabulary-card-left">
          <div class="vocabulary-icon-circle">
            <img src="${item.image || DEFAULT_VOCABULARY_IMAGE}" alt="${item.text || item.textEn || ''} vocabulary image" />
          </div>
          <span>${item.text || item.textEn || ''}</span>
        </div>
        <div class="vocabulary-card-actions">
          ${
            canEditPersonalVocabulary
              ? `
                <button
                  type="button"
                  class="vocabulary-action-btn edit-vocabulary-btn openEditVocabularyModal"
                  data-category="${category}"
                  data-index="${index}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="vocabulary-action-btn delete-vocabulary-btn openDeleteVocabularyModal"
                  data-category="${category}"
                  data-index="${index}"
                >
                  Delete
                </button>
              `
              : ''
          }
        </div>
      </div>
    `;
  }).join('');

  bindVocabularyActionButtons();
}

function bindVocabularyActionButtons() {
  const openEditVocabularyButtons = document.querySelectorAll('.openEditVocabularyModal');
  const openDeleteVocabularyButtons = document.querySelectorAll('.openDeleteVocabularyModal');

  openEditVocabularyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const index = Number(button.dataset.index);
      const mergedVocabulary = getMergedPatientVocabulary();
      const item = mergedVocabulary[category][index];

      if (!item || item.source !== 'personal') return;

      const patientVocabulary = getPatientVocabularyFromLocal();
      const personalIndex = patientVocabulary[category].findIndex((entry) => entry.id === item.id);

      if (personalIndex < 0) return;

      vocabularyToEdit = { category, index: personalIndex };

      if (editVocabularyIdInput) editVocabularyIdInput.value = item.id || '';
      if (editVocabularyWordEnInput) editVocabularyWordEnInput.value = item.textEn || item.text || '';
      if (editVocabularyWordMsInput) editVocabularyWordMsInput.value = item.textMs || '';
      if (editVocabularyCategoryInput) {
        const label = Object.keys(vocabularyCategoryLabelMap).find(
          (key) => vocabularyCategoryLabelMap[key] === category
        );
        editVocabularyCategoryInput.value = label || '';
      }

      if (editVocabularyModal) {
        editVocabularyModal.classList.add('active');
      }
    });
  });

  openDeleteVocabularyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const index = Number(button.dataset.index);
      const mergedVocabulary = getMergedPatientVocabulary();
      const item = mergedVocabulary[category][index];

      if (!item || item.source !== 'personal') return;

      const patientVocabulary = getPatientVocabularyFromLocal();
      const personalIndex = patientVocabulary[category].findIndex((entry) => entry.id === item.id);

      if (personalIndex < 0) return;

      vocabularyToDelete = {
        category,
        index: personalIndex
      };

      if (deleteVocabularyModal) {
        deleteVocabularyModal.classList.add('active');
      }
    });
  });
}

vocabularyCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedCategory = button.dataset.category;
    setActiveVocabularyCategoryButton(selectedCategory);
    setVocabularyPanelCategory(selectedCategory);
    renderVocabularyCards(selectedCategory);
  });
});

if (openAddVocabularyModal && addVocabularyModal) {
  openAddVocabularyModal.addEventListener('click', () => {
    if (addVocabularyForm) {
      addVocabularyForm.reset();
    }

    if (vocabularyIdInput) {
      vocabularyIdInput.value = generateNextVocabularyId();
    }

    addVocabularyModal.classList.add('active');
  });
}

if (addVocabularyForm) {
  addVocabularyForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const vocabularyWordEn = vocabularyWordEnInput ? vocabularyWordEnInput.value.trim() : '';
    const vocabularyWordMs = vocabularyWordMsInput ? vocabularyWordMsInput.value.trim() : '';
    const selectedCategoryLabel = vocabularyCategoryInput ? vocabularyCategoryInput.value : '';

    if (!vocabularyWordEn || !vocabularyWordMs || !selectedCategoryLabel) {
      alert('Please complete the English vocabulary word, Bahasa Melayu vocabulary word, and category.');
      return;
    }

    const selectedCategory = vocabularyCategoryLabelMap[selectedCategoryLabel];
    const patientVocabulary = getPatientVocabularyFromLocal();
    const file = vocabularyImageInput && vocabularyImageInput.files ? vocabularyImageInput.files[0] : null;

    const saveVocabularyItem = (imagePath) => {
      const newItem = {
        id: vocabularyIdInput ? vocabularyIdInput.value : generateNextVocabularyId(),
        text: vocabularyWordEn,
        textEn: vocabularyWordEn,
        textMs: vocabularyWordMs,
        image: imagePath || DEFAULT_VOCABULARY_IMAGE
      };

      patientVocabulary[selectedCategory].push(newItem);
      syncPatientVocabularyToLocal(patientVocabulary);

      updateVocabularyCategoryCounts();
      setActiveVocabularyCategoryButton(selectedCategory);
      setVocabularyPanelCategory(selectedCategory);
      renderVocabularyCards(selectedCategory);

      addVocabularyForm.reset();
      if (vocabularyIdInput) vocabularyIdInput.value = '';
      addVocabularyModal.classList.remove('active');
      alert('Vocabulary added successfully.');
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        saveVocabularyItem(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      saveVocabularyItem(DEFAULT_VOCABULARY_IMAGE);
    }
  });
}

if (editVocabularyForm) {
  editVocabularyForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!vocabularyToEdit) return;

    const updatedWordEn = editVocabularyWordEnInput ? editVocabularyWordEnInput.value.trim() : '';
    const updatedWordMs = editVocabularyWordMsInput ? editVocabularyWordMsInput.value.trim() : '';
    const selectedCategoryLabel = editVocabularyCategoryInput ? editVocabularyCategoryInput.value : '';

    if (!updatedWordEn || !updatedWordMs || !selectedCategoryLabel) {
      alert('Please complete the English vocabulary word, Bahasa Melayu vocabulary word, and category.');
      return;
    }

    const newCategory = vocabularyCategoryLabelMap[selectedCategoryLabel];
    const patientVocabulary = getPatientVocabularyFromLocal();
    const oldCategory = vocabularyToEdit.category;
    const oldIndex = vocabularyToEdit.index;

    const existingItem = patientVocabulary[oldCategory][oldIndex];
    if (!existingItem) return;

    const file = editVocabularyImageInput && editVocabularyImageInput.files ? editVocabularyImageInput.files[0] : null;

    const saveEditedVocabulary = (imagePath) => {
      const updatedItem = {
        id: existingItem.id,
        text: updatedWordEn,
        textEn: updatedWordEn,
        textMs: updatedWordMs,
        image: imagePath || existingItem.image || DEFAULT_VOCABULARY_IMAGE
      };

      patientVocabulary[oldCategory].splice(oldIndex, 1);
      patientVocabulary[newCategory].push(updatedItem);
      syncPatientVocabularyToLocal(patientVocabulary);

      updateVocabularyCategoryCounts();
      setActiveVocabularyCategoryButton(newCategory);
      setVocabularyPanelCategory(newCategory);
      renderVocabularyCards(newCategory);

      vocabularyToEdit = null;
      editVocabularyForm.reset();
      editVocabularyModal.classList.remove('active');
      alert('Vocabulary updated successfully.');
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        saveEditedVocabulary(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      saveEditedVocabulary(existingItem.image);
    }
  });
}

if (confirmDeleteVocabularyModal && deleteVocabularyModal) {
  confirmDeleteVocabularyModal.addEventListener('click', () => {
    if (!vocabularyToDelete) return;

    const patientVocabulary = getPatientVocabularyFromLocal();
    const existingItem = patientVocabulary[vocabularyToDelete.category][vocabularyToDelete.index];

    if (!existingItem) return;

    patientVocabulary[vocabularyToDelete.category].splice(vocabularyToDelete.index, 1);
    syncPatientVocabularyToLocal(patientVocabulary);

    updateVocabularyCategoryCounts();
    renderVocabularyCards(currentVocabularyCategory);

    vocabularyToDelete = null;
    deleteVocabularyModal.classList.remove('active');
    alert('Vocabulary deleted successfully.');
  });
}

if (closeAddVocabularyModal && addVocabularyModal) {
  closeAddVocabularyModal.addEventListener('click', () => {
    addVocabularyModal.classList.remove('active');
  });
}

if (cancelAddVocabularyModal && addVocabularyModal) {
  cancelAddVocabularyModal.addEventListener('click', () => {
    addVocabularyModal.classList.remove('active');
  });
}

if (closeEditVocabularyModal && editVocabularyModal) {
  closeEditVocabularyModal.addEventListener('click', () => {
    vocabularyToEdit = null;
    editVocabularyModal.classList.remove('active');
  });
}

if (cancelEditVocabularyModal && editVocabularyModal) {
  cancelEditVocabularyModal.addEventListener('click', () => {
    vocabularyToEdit = null;
    editVocabularyModal.classList.remove('active');
  });
}

if (cancelDeleteVocabularyModal && deleteVocabularyModal) {
  cancelDeleteVocabularyModal.addEventListener('click', () => {
    vocabularyToDelete = null;
    deleteVocabularyModal.classList.remove('active');
  });
}

[addVocabularyModal, editVocabularyModal, deleteVocabularyModal].forEach((modal) => {
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});

updateVocabularyCategoryCounts();
setActiveVocabularyCategoryButton('people');
setVocabularyPanelCategory('people');
renderVocabularyCards('people');