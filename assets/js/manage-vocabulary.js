const addVocabularyModal = document.getElementById('addVocabularyModal');
const openAddVocabularyModal = document.getElementById('openAddVocabularyModal');
const closeAddVocabularyModal = document.getElementById('closeAddVocabularyModal');
const cancelAddVocabularyModal = document.getElementById('cancelAddVocabularyModal');
const addVocabularyForm = document.getElementById('addVocabularyForm');
const vocabularyWordEnInput = document.getElementById('vocabulary-word-en');
const vocabularyWordMsInput = document.getElementById('vocabulary-word-ms');
const vocabularyCategoryInput = document.getElementById('vocabulary-category');
const vocabularyImageInput = document.getElementById('vocabulary-image');

const editVocabularyModal = document.getElementById('editVocabularyModal');
const closeEditVocabularyModal = document.getElementById('closeEditVocabularyModal');
const cancelEditVocabularyModal = document.getElementById('cancelEditVocabularyModal');
const editVocabularyForm = editVocabularyModal ? editVocabularyModal.querySelector('form') : null;
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
const vocabularyUserId = vocabularyParams.get('userId') || storedSession.userId || '';
const vocabularyUserName =
  vocabularyParams.get('user') ||
  vocabularyParams.get('name') ||
  storedSession.fullName ||
  'User';

const DEFAULT_VOCABULARY_IMAGE = '../../assets/images/placeholders/defaultPV.png';
const VOCABULARY_BUCKET_NAME = 'vocabulary-images';

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

let currentVocabularyCategory = 'people';
let vocabularyToDelete = null;
let vocabularyToEdit = null;
let currentAuthUser = null;
let currentUserProfile = null;

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

async function getAllAdminVocabulary() {
  const { data, error } = await supabaseClient
    .from('admin_vocabulary')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAllPatientVocabulary() {
  const { data, error } = await supabaseClient
    .from('patient_vocabulary')
    .select('*')
    .eq('patient_id', vocabularyPatientId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function createVocabularySignedImageUrl(imagePath) {
  if (!imagePath) {
    return DEFAULT_VOCABULARY_IMAGE;
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }

  const { data, error } = await supabaseClient.storage
    .from(VOCABULARY_BUCKET_NAME)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error(error);
    return DEFAULT_VOCABULARY_IMAGE;
  }

  return data?.signedUrl || DEFAULT_VOCABULARY_IMAGE;
}

async function getMergedPatientVocabulary() {
  const adminVocabulary = await getAllAdminVocabulary();
  const patientVocabulary = await getAllPatientVocabulary();
  const merged = createEmptyVocabularyData();

  for (const item of adminVocabulary) {
    if (!merged[item.category]) continue;

    merged[item.category].push({
      id: item.id,
      text: item.text_en,
      textEn: item.text_en,
      textMs: item.text_ms,
      image: item.image_path || '',
      imageUrl: await createVocabularySignedImageUrl(item.image_path || ''),
      source: 'admin'
    });
  }

  for (const item of patientVocabulary) {
    if (!merged[item.category]) continue;

    merged[item.category].push({
      id: item.id,
      dbId: item.id,
      text: item.text_en,
      textEn: item.text_en,
      textMs: item.text_ms,
      image: item.image_path || '',
      imageUrl: await createVocabularySignedImageUrl(item.image_path || ''),
      source: 'personal'
    });
  }

  return merged;
}

async function uploadVocabularyImage(file, vocabularyId) {
  if (!file) {
    return '';
  }

  const safeFileName = file.name.replace(/\s+/g, '-');
  const filePath = `patients/${vocabularyPatientId}/vocabulary/${vocabularyId}-${Date.now()}-${safeFileName}`;

  const { data, error } = await supabaseClient.storage
    .from(VOCABULARY_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  return data.path;
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

async function updateVocabularyCategoryCounts() {
  const mergedVocabulary = await getMergedPatientVocabulary();

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

async function renderVocabularyCards(category) {
  if (!vocabularyCardsContainer) return;

  currentVocabularyCategory = category;

  const mergedVocabulary = await getMergedPatientVocabulary();
  const vocabularyItems = mergedVocabulary[category] || [];
  const cardClass = vocabularyCardClassMap[category] || 'vocabulary-people';

  if (!vocabularyItems.length) {
    vocabularyCardsContainer.innerHTML = `
      <div class="board-empty-state">No vocabulary available in this category yet.</div>
    `;
    return;
  }

  vocabularyCardsContainer.innerHTML = vocabularyItems.map((item) => {
    const canEditPersonalVocabulary = item.source === 'personal';

    return `
      <div class="vocabulary-card-item ${cardClass}">
        <div class="vocabulary-card-left">
          <div class="vocabulary-icon-circle">
            <img src="${item.imageUrl || DEFAULT_VOCABULARY_IMAGE}" alt="${item.text || item.textEn || ''} vocabulary image" />
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
                  data-id="${item.id}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="vocabulary-action-btn delete-vocabulary-btn openDeleteVocabularyModal"
                  data-category="${category}"
                  data-id="${item.id}"
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
    button.addEventListener('click', async () => {
      try {
        const category = button.dataset.category;
        const vocabularyId = button.dataset.id;
        const mergedVocabulary = await getMergedPatientVocabulary();
        const item = (mergedVocabulary[category] || []).find(
          (entry) => entry.id === vocabularyId && entry.source === 'personal'
        );

        if (!item) return;

        vocabularyToEdit = { category, id: vocabularyId };

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
      } catch (error) {
        showError(error);
      }
    });
  });

  openDeleteVocabularyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      vocabularyToDelete = {
        category: button.dataset.category,
        id: button.dataset.id
      };

      if (deleteVocabularyModal) {
        deleteVocabularyModal.classList.add('active');
      }
    });
  });
}

vocabularyCategoryButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const selectedCategory = button.dataset.category;
    setActiveVocabularyCategoryButton(selectedCategory);
    setVocabularyPanelCategory(selectedCategory);
    await renderVocabularyCards(selectedCategory);
  });
});

if (openAddVocabularyModal && addVocabularyModal) {
  openAddVocabularyModal.addEventListener('click', async () => {
    try {
      if (addVocabularyForm) {
        addVocabularyForm.reset();
      }

      addVocabularyModal.classList.add('active');
    } catch (error) {
      showError(error);
    }
  });
}

if (addVocabularyForm) {
  addVocabularyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const vocabularyWordEn = vocabularyWordEnInput ? vocabularyWordEnInput.value.trim() : '';
    const vocabularyWordMs = vocabularyWordMsInput ? vocabularyWordMsInput.value.trim() : '';
    const selectedCategoryLabel = vocabularyCategoryInput ? vocabularyCategoryInput.value : '';

    if (!vocabularyWordEn || !vocabularyWordMs || !selectedCategoryLabel) {
      alert('Please complete the English vocabulary word, Bahasa Melayu vocabulary word, and category.');
      return;
    }

    try {
      const selectedCategory = vocabularyCategoryLabelMap[selectedCategoryLabel];
      const file = vocabularyImageInput && vocabularyImageInput.files ? vocabularyImageInput.files[0] : null;
      const uploadedImagePath = file
      ? await uploadVocabularyImage(file, `vocabulary-${Date.now()}`)
      : null;

      const { error } = await supabaseClient
        .from('patient_vocabulary')
        .insert({
          patient_id: vocabularyPatientId,
          category: selectedCategory,
          text_en: vocabularyWordEn,
          text_ms: vocabularyWordMs,
          image_path: uploadedImagePath,
          created_by: currentAuthUser?.id || vocabularyUserId || null
        });

      if (error) throw error;

      await updateVocabularyCategoryCounts();
      setActiveVocabularyCategoryButton(selectedCategory);
      setVocabularyPanelCategory(selectedCategory);
      await renderVocabularyCards(selectedCategory);

      addVocabularyForm.reset();
      addVocabularyModal.classList.remove('active');
      alert('Vocabulary added successfully.');
    } catch (error) {
      showError(error);
    }
  });
}

if (editVocabularyForm) {
  editVocabularyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!vocabularyToEdit) return;

    const updatedWordEn = editVocabularyWordEnInput ? editVocabularyWordEnInput.value.trim() : '';
    const updatedWordMs = editVocabularyWordMsInput ? editVocabularyWordMsInput.value.trim() : '';
    const selectedCategoryLabel = editVocabularyCategoryInput ? editVocabularyCategoryInput.value : '';

    if (!updatedWordEn || !updatedWordMs || !selectedCategoryLabel) {
      alert('Please complete the English vocabulary word, Bahasa Melayu vocabulary word, and category.');
      return;
    }

    try {
      const newCategory = vocabularyCategoryLabelMap[selectedCategoryLabel];
      const existingPatientVocabulary = await getAllPatientVocabulary();
      const existingItem = existingPatientVocabulary.find((item) => item.id === vocabularyToEdit.id);

      if (!existingItem) return;

      const file = editVocabularyImageInput && editVocabularyImageInput.files ? editVocabularyImageInput.files[0] : null;
      const uploadedImagePath = file
        ? await uploadVocabularyImage(file, existingItem.id)
        : (existingItem.image_path || null);

      const { error } = await supabaseClient
        .from('patient_vocabulary')
        .update({
          category: newCategory,
          text_en: updatedWordEn,
          text_ms: updatedWordMs,
          image_path: uploadedImagePath
        })
        .eq('id', existingItem.id)
        .eq('patient_id', vocabularyPatientId);

      if (error) throw error;

      await updateVocabularyCategoryCounts();
      setActiveVocabularyCategoryButton(newCategory);
      setVocabularyPanelCategory(newCategory);
      await renderVocabularyCards(newCategory);

      vocabularyToEdit = null;
      editVocabularyForm.reset();
      editVocabularyModal.classList.remove('active');
      alert('Vocabulary updated successfully.');
    } catch (error) {
      showError(error);
    }
  });
}

if (confirmDeleteVocabularyModal && deleteVocabularyModal) {
  confirmDeleteVocabularyModal.addEventListener('click', async () => {
    if (!vocabularyToDelete) return;

    try {
      const { error } = await supabaseClient
        .from('patient_vocabulary')
        .delete()
        .eq('id', vocabularyToDelete.id)
        .eq('patient_id', vocabularyPatientId);

      if (error) throw error;

      await updateVocabularyCategoryCounts();
      await renderVocabularyCards(currentVocabularyCategory);

      vocabularyToDelete = null;
      deleteVocabularyModal.classList.remove('active');
      alert('Vocabulary deleted successfully.');
    } catch (error) {
      showError(error);
    }
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

async function initializeManageVocabularyPage() {
  await loadCurrentUserProfile();
  await updateVocabularyCategoryCounts();
  setActiveVocabularyCategoryButton('people');
  setVocabularyPanelCategory('people');
  await renderVocabularyCards('people');
}

initializeManageVocabularyPage().catch((error) => {
  showError(error);
});