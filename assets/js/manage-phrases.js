const addPhraseModal = document.getElementById('addPhraseModal');
const openAddPhraseModal = document.getElementById('openAddPhraseModal');
const closeAddPhraseModal = document.getElementById('closeAddPhraseModal');
const cancelAddPhraseModal = document.getElementById('cancelAddPhraseModal');
const addPhraseForm = document.getElementById('addPhraseForm');
const phraseTextEnInput = document.getElementById('phrase-text-en');
const phraseTextMsInput = document.getElementById('phrase-text-ms');
const phraseCategoryInput = document.getElementById('phrase-category');
const phraseImageInput = document.getElementById('phrase-image');

const editPhraseModal = document.getElementById('editPhraseModal');
const closeEditPhraseModal = document.getElementById('closeEditPhraseModal');
const cancelEditPhraseModal = document.getElementById('cancelEditPhraseModal');
const editPhraseForm = editPhraseModal ? editPhraseModal.querySelector('form') : null;
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
const PHRASE_BUCKET_NAME = 'phrase-images';

const SUPABASE_URL = 'https://drvmfnlaxkcqbwoqjefu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4ugmgc1ktCaLEmwB1ttnbA_XjOCtqDm';

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
    : null;

let currentPhraseCategory = 'urgent';
let phraseToDelete = null;
let phraseToEdit = null;
let currentAuthUser = null;
let currentUserProfile = null;

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

function showError(error) {
  console.error(error);
  alert(error?.message || 'Something went wrong. Please try again.');
}

async function loadCurrentUserProfile() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available. Please load the Supabase CDN before this script.');
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('No signed-in user found. Please sign in again.');

  currentAuthUser = user;

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  currentUserProfile = profile;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', async () => {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem('echozySession');
    }
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

async function getAllAdminPhrases() {
  const { data, error } = await supabaseClient
    .from('admin_phrases')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAllPatientPhrases() {
  const { data, error } = await supabaseClient
    .from('patient_phrases')
    .select('*')
    .eq('patient_id', phrasePatientId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function createPhraseSignedImageUrl(imagePath) {
  if (!imagePath) {
    return DEFAULT_PHRASE_IMAGE;
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }

  const { data, error } = await supabaseClient.storage
    .from(PHRASE_BUCKET_NAME)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error(error);
    return DEFAULT_PHRASE_IMAGE;
  }

  return data?.signedUrl || DEFAULT_PHRASE_IMAGE;
}

async function getMergedPatientPhrases() {
  const adminPhrases = await getAllAdminPhrases();
  const patientPhrases = await getAllPatientPhrases();
  const merged = createEmptyPhraseData();

  for (const phrase of adminPhrases) {
    if (!merged[phrase.category]) continue;

    merged[phrase.category].push({
      id: phrase.id,
      text: phrase.text_en,
      textEn: phrase.text_en,
      textMs: phrase.text_ms,
      image: phrase.image_path || '',
      imageUrl: await createPhraseSignedImageUrl(phrase.image_path || ''),
      source: 'admin'
    });
  }

  for (const phrase of patientPhrases) {
    if (!merged[phrase.category]) continue;

    merged[phrase.category].push({
      id: phrase.id,
      dbId: phrase.id,
      text: phrase.text_en,
      textEn: phrase.text_en,
      textMs: phrase.text_ms,
      image: phrase.image_path || '',
      imageUrl: await createPhraseSignedImageUrl(phrase.image_path || ''),
      source: 'personal'
    });
  }

  return merged;
}

async function uploadPhraseImage(file, phraseId) {
  if (!file) {
    return '';
  }

  const safeFileName = file.name.replace(/\s+/g, '-');
  const filePath = `patients/${phrasePatientId}/phrases/${phraseId}-${Date.now()}-${safeFileName}`;

  const { data, error } = await supabaseClient.storage
    .from(PHRASE_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return data.path;
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

async function updatePhraseCategoryCounts() {
  const mergedPhrases = await getMergedPatientPhrases();

  phraseCategoryButtons.forEach((button) => {
    const category = button.dataset.category;
    const count = (mergedPhrases[category] || []).length;
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

async function renderPhraseCards(category) {
  if (!phraseCardsContainer) return;

  currentPhraseCategory = category;

  const mergedPhrases = await getMergedPatientPhrases();
  const phrases = mergedPhrases[category] || [];
  const cardClass = cardClassMap[category] || 'phrase-urgent';

  if (!phrases.length) {
    phraseCardsContainer.innerHTML = `
      <div class="board-empty-state">No phrases available in this category yet.</div>
    `;
    return;
  }

  phraseCardsContainer.innerHTML = phrases.map((phrase, index) => {
    const canEditPersonalPhrase = phrase.source === 'personal';

    return `
      <div class="phrase-card-item ${cardClass}">
        <div class="phrase-card-left">
          <div class="phrase-icon-circle">
            <img src="${phrase.imageUrl || DEFAULT_PHRASE_IMAGE}" alt="${phrase.text || phrase.textEn || ''} phrase image" />
          </div>
          <span>${phrase.text || phrase.textEn || ''}</span>
        </div>
        <div class="phrase-card-actions">
          ${
            canEditPersonalPhrase
              ? `
                <button
                  type="button"
                  class="phrase-action-btn edit-action-btn openEditPhraseModal"
                  data-category="${category}"
                  data-index="${index}"
                  data-id="${phrase.id}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="phrase-action-btn delete-action-btn openDeletePhraseModal"
                  data-category="${category}"
                  data-index="${index}"
                  data-id="${phrase.id}"
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

  bindPhraseActionButtons();
}

function bindPhraseActionButtons() {
  const openEditPhraseButtons = document.querySelectorAll('.openEditPhraseModal');
  const openDeletePhraseButtons = document.querySelectorAll('.openDeletePhraseModal');

  openEditPhraseButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const category = button.dataset.category;
        const phraseId = button.dataset.id;
        const mergedPhrases = await getMergedPatientPhrases();
        const phrase = (mergedPhrases[category] || []).find((item) => item.id === phraseId && item.source === 'personal');

        if (!phrase) return;

        phraseToEdit = { category, id: phraseId };

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
      } catch (error) {
        showError(error);
      }
    });
  });

  openDeletePhraseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      phraseToDelete = {
        category: button.dataset.category,
        id: button.dataset.id
      };

      if (deletePhraseModal) {
        deletePhraseModal.classList.add('active');
      }
    });
  });
}

phraseCategoryButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const selectedCategory = button.dataset.category;
    setActiveCategoryButton(selectedCategory);
    setPanelCategory(selectedCategory);
    await renderPhraseCards(selectedCategory);
  });
});

if (openAddPhraseModal && addPhraseModal) {
  openAddPhraseModal.addEventListener('click', async () => {
    try {
      if (addPhraseForm) {
        addPhraseForm.reset();
      }

      addPhraseModal.classList.add('active');
    } catch (error) {
      showError(error);
    }
  });
}

if (addPhraseForm) {
  addPhraseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const phraseTextEn = phraseTextEnInput ? phraseTextEnInput.value.trim() : '';
    const phraseTextMs = phraseTextMsInput ? phraseTextMsInput.value.trim() : '';
    const selectedCategoryLabel = phraseCategoryInput ? phraseCategoryInput.value : '';

    if (!phraseTextEn || !phraseTextMs || !selectedCategoryLabel) {
      alert('Please complete the English phrase text, Bahasa Melayu phrase text, and category.');
      return;
    }

    try {
      const selectedCategory = categoryLabelMap[selectedCategoryLabel];
      const file = phraseImageInput && phraseImageInput.files ? phraseImageInput.files[0] : null;
      const uploadedImagePath = file
      ? await uploadPhraseImage(file, `phrase-${Date.now()}`)
      : null;

      const { error } = await supabaseClient
        .from('patient_phrases')
        .insert({
          patient_id: phrasePatientId,
          category: selectedCategory,
          text_en: phraseTextEn,
          text_ms: phraseTextMs,
          image_path: uploadedImagePath,
          created_by: currentAuthUser?.id || phraseUserId || null
        });

      if (error) throw error;

      await updatePhraseCategoryCounts();
      setActiveCategoryButton(selectedCategory);
      setPanelCategory(selectedCategory);
      await renderPhraseCards(selectedCategory);

      addPhraseForm.reset();
      addPhraseModal.classList.remove('active');
      alert('Phrase added successfully.');
    } catch (error) {
      showError(error);
    }
  });
}

if (editPhraseForm) {
  editPhraseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!phraseToEdit) return;

    const updatedTextEn = editPhraseTextEnInput ? editPhraseTextEnInput.value.trim() : '';
    const updatedTextMs = editPhraseTextMsInput ? editPhraseTextMsInput.value.trim() : '';
    const selectedCategoryLabel = editPhraseCategoryInput ? editPhraseCategoryInput.value : '';

    if (!updatedTextEn || !updatedTextMs || !selectedCategoryLabel) {
      alert('Please complete the English phrase text, Bahasa Melayu phrase text, and category.');
      return;
    }

    try {
      const newCategory = categoryLabelMap[selectedCategoryLabel];
      const existingPatientPhrases = await getAllPatientPhrases();
      const existingPhrase = existingPatientPhrases.find((item) => item.id === phraseToEdit.id);

      if (!existingPhrase) return;

      const file = editPhraseImageInput && editPhraseImageInput.files ? editPhraseImageInput.files[0] : null;
      const uploadedImagePath = file
        ? await uploadPhraseImage(file, existingPhrase.id)
        : (existingPhrase.image_path || null);

      const { error } = await supabaseClient
        .from('patient_phrases')
        .update({
          category: newCategory,
          text_en: updatedTextEn,
          text_ms: updatedTextMs,
          image_path: uploadedImagePath
        })
        .eq('id', existingPhrase.id)
        .eq('patient_id', phrasePatientId);

      if (error) throw error;

      await updatePhraseCategoryCounts();
      setActiveCategoryButton(newCategory);
      setPanelCategory(newCategory);
      await renderPhraseCards(newCategory);

      phraseToEdit = null;
      editPhraseForm.reset();
      editPhraseModal.classList.remove('active');
      alert('Phrase updated successfully.');
    } catch (error) {
      showError(error);
    }
  });
}

if (confirmDeletePhraseModal && deletePhraseModal) {
  confirmDeletePhraseModal.addEventListener('click', async () => {
    if (!phraseToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('patient_phrases')
        .delete()
        .eq('id', phraseToDelete.id)
        .eq('patient_id', phrasePatientId);

      if (error) throw error;

      await updatePhraseCategoryCounts();
      await renderPhraseCards(currentPhraseCategory);

      phraseToDelete = null;
      deletePhraseModal.classList.remove('active');
      alert('Phrase deleted successfully.');
    } catch (error) {
      showError(error);
    }
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

async function initializeManagePhrasesPage() {
  await loadCurrentUserProfile();
  await updatePhraseCategoryCounts();
  setActiveCategoryButton('urgent');
  setPanelCategory('urgent');
  await renderPhraseCards('urgent');
}

initializeManagePhrasesPage().catch((error) => {
  showError(error);
});