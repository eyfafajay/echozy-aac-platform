const addPhraseModal = document.getElementById('addPhraseModal');
const openAddPhraseModal = document.getElementById('openAddPhraseModal');
const closeAddPhraseModal = document.getElementById('closeAddPhraseModal');
const cancelAddPhraseModal = document.getElementById('cancelAddPhraseModal');
const addPhraseForm = document.getElementById('addPhraseForm');
const phraseIdInput = document.getElementById('phrase-id');
const phraseTextEnInput = document.getElementById('phrase-text-en');
const phraseTextMsInput = document.getElementById('phrase-text-ms');
const phraseCategoryInput = document.getElementById('phrase-category');
const phraseImageInput = document.getElementById('phrase-image');

const editPhraseModal = document.getElementById('editPhraseModal');
const closeEditPhraseModal = document.getElementById('closeEditPhraseModal');
const cancelEditPhraseModal = document.getElementById('cancelEditPhraseModal');
const editPhraseForm = editPhraseModal ? editPhraseModal.querySelector('form') : null;
const editPhraseIdInput = document.getElementById('edit-phrase-id');
const editPhraseTextEnInput = document.getElementById('edit-phrase-text-en');
const editPhraseTextMsInput = document.getElementById('edit-phrase-text-ms');
const editPhraseCategoryInput = document.getElementById('edit-phrase-category');
const editPhraseImageInput = document.getElementById('edit-phrase-image');

const deletePhraseModal = document.getElementById('deletePhraseModal');
const cancelDeletePhraseModal = document.getElementById('cancelDeletePhraseModal');
const confirmDeletePhraseModal = document.getElementById('confirmDeletePhraseModal');

const phraseCategoryButtons = document.querySelectorAll('.phrase-category-item');
const phraseListPanel = document.getElementById('phraseListPanel');
const phraseCardsContainer = document.getElementById('phraseCardsContainer');

const managePhrasesHeading = document.getElementById('managePhrasesHeading');
const managePhrasesSubtext = document.getElementById('managePhrasesSubtext');
const backToPatientDashboardFromPhrases = document.getElementById('backToPatientDashboardFromPhrases');

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const phraseParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const phrasePatientId = phraseParams.get('patient') || '';
const phrasePatientName = phraseParams.get('name') || 'Selected Patient';
const phrasePatientStatus = phraseParams.get('status') || 'Active';

const phraseUserRole = phraseParams.get('role') || storedSession.role || 'caregiver';
const phraseUserId = phraseParams.get('userId') || storedSession.userId || '';
const phraseUserName =
  phraseParams.get('user') ||
  phraseParams.get('name') ||
  storedSession.fullName ||
  'User';

const DEFAULT_PHRASE_IMAGE = '../../assets/images/placeholders/defaultPV.png';

let currentPhraseCategory = 'urgent';
let phraseToDelete = null;
let phraseToEdit = null;

if (managePhrasesHeading) {
  managePhrasesHeading.textContent = `Manage Phrases for ${phrasePatientName}`;
}

if (managePhrasesSubtext) {
  managePhrasesSubtext.textContent =
    `Organize communication phrases by category for ${phrasePatientName}.`;
}

const phraseUserQuery = new URLSearchParams({
  role: phraseUserRole,
  userId: phraseUserId,
  name: phraseUserName
}).toString();

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${phraseUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${phraseUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href =
    phraseUserRole === 'provider'
      ? `settings-provider.html?${phraseUserQuery}`
      : `settings-caregiver.html?${phraseUserQuery}`;
}

if (backToPatientDashboardFromPhrases) {
  const backPatientQuery = new URLSearchParams({
    patient: phrasePatientId,
    name: phrasePatientName,
    status: phrasePatientStatus,
    role: phraseUserRole,
    userId: phraseUserId,
    user: phraseUserName
  }).toString();

  backToPatientDashboardFromPhrases.href = `patient-dashboard.html?${backPatientQuery}`;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
  });
}

function createEmptyPhraseData() {
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

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function saveStoredPhrases(data) {
  localStorage.setItem('echozyPhrases', JSON.stringify(data));
}

function getPatientPhrasesFromLocal() {
  const allPhrases = getStoredPhrases();
  return allPhrases[phrasePatientId] || createEmptyPhraseData();
}

function syncPatientPhrasesToLocal(patientPhrases) {
  const allPhrases = getStoredPhrases();
  allPhrases[phrasePatientId] = patientPhrases;
  saveStoredPhrases(allPhrases);
}

function generateNextPhraseId() {
  const patientPhrases = getPatientPhrasesFromLocal();

  const existingIds = Object.values(patientPhrases)
    .flat()
    .map((phrase) => phrase.id)
    .filter((id) => /^PH\d{4}$/.test(id))
    .map((id) => parseInt(id.replace('PH', ''), 10));

  const nextNumber = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  return `PH${String(nextNumber).padStart(4, '0')}`;
}

const panelClassMap = {
  urgent: 'panel-urgent',
  basic: 'panel-basic',
  feelings: 'panel-feelings',
  physical: 'panel-physical',
  daily: 'panel-daily',
  social: 'panel-social',
  rehab: 'panel-rehab',
  activities: 'panel-activities'
};

const cardClassMap = {
  urgent: 'phrase-urgent',
  basic: 'phrase-basic',
  feelings: 'phrase-feelings',
  physical: 'phrase-physical',
  daily: 'phrase-daily',
  social: 'phrase-social',
  rehab: 'phrase-rehab',
  activities: 'phrase-activities'
};

const categoryLabelMap = {
  'Urgent Needs': 'urgent',
  'Basic Responses': 'basic',
  'Feelings & Emotions': 'feelings',
  'Physical Condition': 'physical',
  'Daily Needs': 'daily',
  'People & Social Communication': 'social',
  'Rehabilitation': 'rehab',
  'Activities & Preferences': 'activities'
};

function updatePhraseCategoryCounts() {
  const patientPhrases = getPatientPhrasesFromLocal();

  phraseCategoryButtons.forEach((button) => {
    const category = button.dataset.category;
    const count = (patientPhrases[category] || []).length;
    const countEl = button.querySelector('small');

    if (countEl) {
      countEl.textContent = `${count} Cards`;
    }
  });
}

function setActiveCategoryButton(selectedCategory) {
  phraseCategoryButtons.forEach((btn) => {
    btn.classList.remove('active-category');
  });

  const activeButton = document.querySelector(`.phrase-category-item[data-category="${selectedCategory}"]`);
  if (activeButton) {
    activeButton.classList.add('active-category');
  }
}

function setPanelCategory(selectedCategory) {
  if (phraseListPanel) {
    phraseListPanel.className = 'phrase-list-panel';
    phraseListPanel.classList.add(panelClassMap[selectedCategory]);
  }
}

function renderPhraseCards(category) {
  if (!phraseCardsContainer) return;

  currentPhraseCategory = category;

  const patientPhrases = getPatientPhrasesFromLocal();
  const phrases = patientPhrases[category] || [];
  const cardClass = cardClassMap[category] || 'phrase-urgent';

  if (!phrases.length) {
    phraseCardsContainer.innerHTML = `
      <div class="board-empty-state">No phrases available in this category yet.</div>
    `;
    return;
  }

  phraseCardsContainer.innerHTML = phrases.map((phrase, index) => `
    <div class="phrase-card-item ${cardClass}">
      <div class="phrase-card-left">
        <div class="phrase-icon-circle">
          <img src="${phrase.image || DEFAULT_PHRASE_IMAGE}" alt="${phrase.text || phrase.textEn || ''} phrase image" />
        </div>
        <span>${phrase.text || phrase.textEn || ''}</span>
      </div>
      <div class="phrase-card-actions">
        <button
          type="button"
          class="phrase-action-btn edit-action-btn openEditPhraseModal"
          data-category="${category}"
          data-index="${index}"
        >
          Edit
        </button>
        <button
          type="button"
          class="phrase-action-btn delete-action-btn openDeletePhraseModal"
          data-category="${category}"
          data-index="${index}"
        >
          Delete
        </button>
      </div>
    </div>
  `).join('');

  bindPhraseActionButtons();
}

function bindPhraseActionButtons() {
  const openEditPhraseButtons = document.querySelectorAll('.openEditPhraseModal');
  const openDeletePhraseButtons = document.querySelectorAll('.openDeletePhraseModal');

  openEditPhraseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      const index = Number(button.dataset.index);
      const patientPhrases = getPatientPhrasesFromLocal();
      const phrase = patientPhrases[category][index];

      if (!phrase) return;

      phraseToEdit = { category, index };

      if (editPhraseIdInput) editPhraseIdInput.value = phrase.id || '';
      if (editPhraseTextEnInput) editPhraseTextEnInput.value = phrase.textEn || phrase.text || '';
      if (editPhraseTextMsInput) editPhraseTextMsInput.value = phrase.textMs || '';
      if (editPhraseCategoryInput) {
        const label = Object.keys(categoryLabelMap).find(
          (key) => categoryLabelMap[key] === category
        );
        editPhraseCategoryInput.value = label || '';
      }

      if (editPhraseModal) {
        editPhraseModal.classList.add('active');
      }
    });
  });

  openDeletePhraseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      phraseToDelete = {
        category: button.dataset.category,
        index: Number(button.dataset.index)
      };

      if (deletePhraseModal) {
        deletePhraseModal.classList.add('active');
      }
    });
  });
}

phraseCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedCategory = button.dataset.category;
    setActiveCategoryButton(selectedCategory);
    setPanelCategory(selectedCategory);
    renderPhraseCards(selectedCategory);
  });
});

if (openAddPhraseModal && addPhraseModal) {
  openAddPhraseModal.addEventListener('click', () => {
    if (addPhraseForm) {
      addPhraseForm.reset();
    }

    if (phraseIdInput) {
      phraseIdInput.value = generateNextPhraseId();
    }

    addPhraseModal.classList.add('active');
  });
}

if (addPhraseForm) {
  addPhraseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const phraseTextEn = phraseTextEnInput ? phraseTextEnInput.value.trim() : '';
    const phraseTextMs = phraseTextMsInput ? phraseTextMsInput.value.trim() : '';
    const selectedCategoryLabel = phraseCategoryInput ? phraseCategoryInput.value : '';

    if (!phraseTextEn || !phraseTextMs || !selectedCategoryLabel) {
      alert('Please complete the English phrase text, Bahasa Melayu phrase text, and category.');
      return;
    }

    const selectedCategory = categoryLabelMap[selectedCategoryLabel];
    const patientPhrases = getPatientPhrasesFromLocal();
    const file = phraseImageInput && phraseImageInput.files ? phraseImageInput.files[0] : null;

    const savePhrase = (imagePath) => {
      const newPhrase = {
        id: phraseIdInput ? phraseIdInput.value : generateNextPhraseId(),
        text: phraseTextEn,
        textEn: phraseTextEn,
        textMs: phraseTextMs,
        image: imagePath || DEFAULT_PHRASE_IMAGE
      };

      patientPhrases[selectedCategory].push(newPhrase);
      syncPatientPhrasesToLocal(patientPhrases);

      updatePhraseCategoryCounts();
      setActiveCategoryButton(selectedCategory);
      setPanelCategory(selectedCategory);
      renderPhraseCards(selectedCategory);

      addPhraseForm.reset();
      if (phraseIdInput) phraseIdInput.value = '';
      addPhraseModal.classList.remove('active');
      alert('Phrase added successfully.');
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        savePhrase(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      savePhrase(DEFAULT_PHRASE_IMAGE);
    }
  });
}

if (editPhraseForm) {
  editPhraseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!phraseToEdit) return;

    const updatedTextEn = editPhraseTextEnInput ? editPhraseTextEnInput.value.trim() : '';
    const updatedTextMs = editPhraseTextMsInput ? editPhraseTextMsInput.value.trim() : '';
    const selectedCategoryLabel = editPhraseCategoryInput ? editPhraseCategoryInput.value : '';

    if (!updatedTextEn || !updatedTextMs || !selectedCategoryLabel) {
      alert('Please complete the English phrase text, Bahasa Melayu phrase text, and category.');
      return;
    }

    const newCategory = categoryLabelMap[selectedCategoryLabel];
    const patientPhrases = getPatientPhrasesFromLocal();
    const oldCategory = phraseToEdit.category;
    const oldIndex = phraseToEdit.index;

    const existingPhrase = patientPhrases[oldCategory][oldIndex];
    if (!existingPhrase) return;

    const file = editPhraseImageInput && editPhraseImageInput.files ? editPhraseImageInput.files[0] : null;

    const saveEditedPhrase = (imagePath) => {
      const updatedPhrase = {
        id: existingPhrase.id,
        text: updatedTextEn,
        textEn: updatedTextEn,
        textMs: updatedTextMs,
        image: imagePath || existingPhrase.image || DEFAULT_PHRASE_IMAGE
      };

      patientPhrases[oldCategory].splice(oldIndex, 1);
      patientPhrases[newCategory].push(updatedPhrase);
      syncPatientPhrasesToLocal(patientPhrases);

      updatePhraseCategoryCounts();
      setActiveCategoryButton(newCategory);
      setPanelCategory(newCategory);
      renderPhraseCards(newCategory);

      phraseToEdit = null;
      editPhraseForm.reset();
      editPhraseModal.classList.remove('active');
      alert('Phrase updated successfully.');
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        saveEditedPhrase(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      saveEditedPhrase(existingPhrase.image);
    }
  });
}

if (confirmDeletePhraseModal && deletePhraseModal) {
  confirmDeletePhraseModal.addEventListener('click', () => {
    if (!phraseToDelete) return;

    const patientPhrases = getPatientPhrasesFromLocal();
    const phrase = patientPhrases[phraseToDelete.category][phraseToDelete.index];

    if (!phrase) return;

    patientPhrases[phraseToDelete.category].splice(phraseToDelete.index, 1);
    syncPatientPhrasesToLocal(patientPhrases);

    updatePhraseCategoryCounts();
    renderPhraseCards(currentPhraseCategory);

    phraseToDelete = null;
    deletePhraseModal.classList.remove('active');
    alert('Phrase deleted successfully.');
  });
}

if (closeAddPhraseModal && addPhraseModal) {
  closeAddPhraseModal.addEventListener('click', () => {
    addPhraseModal.classList.remove('active');
  });
}

if (cancelAddPhraseModal && addPhraseModal) {
  cancelAddPhraseModal.addEventListener('click', () => {
    addPhraseModal.classList.remove('active');
  });
}

if (closeEditPhraseModal && editPhraseModal) {
  closeEditPhraseModal.addEventListener('click', () => {
    phraseToEdit = null;
    editPhraseModal.classList.remove('active');
  });
}

if (cancelEditPhraseModal && editPhraseModal) {
  cancelEditPhraseModal.addEventListener('click', () => {
    phraseToEdit = null;
    editPhraseModal.classList.remove('active');
  });
}

if (cancelDeletePhraseModal && deletePhraseModal) {
  cancelDeletePhraseModal.addEventListener('click', () => {
    phraseToDelete = null;
    deletePhraseModal.classList.remove('active');
  });
}

[addPhraseModal, editPhraseModal, deletePhraseModal].forEach((modal) => {
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});

updatePhraseCategoryCounts();
setActiveCategoryButton('urgent');
setPanelCategory('urgent');
renderPhraseCards('urgent');