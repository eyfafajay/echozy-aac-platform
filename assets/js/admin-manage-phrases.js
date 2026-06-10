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
let currentAdminUser = null;

function showError(error) {
  console.error(error);
  alert(error?.message || 'Something went wrong. Please try again.');
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

async function loadCurrentAdminUser() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available. Please load the Supabase CDN before this script.');
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No signed-in admin found. Please sign in again.');
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  if (profile.role !== 'admin') {
    throw new Error('Only admin accounts can manage default phrases.');
  }

  currentAdminUser = {
    id: user.id,
    email: user.email || '',
    profile
  };
}

async function getAllAdminPhrases() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabaseClient
    .from('admin_phrases')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getGroupedAdminPhrases() {
  const phrases = await getAllAdminPhrases();

  const grouped = {
    urgent: [],
    basic: [],
    feelings: [],
    physical: [],
    daily: [],
    social: [],
    rehab: [],
    activities: []
  };

  phrases.forEach((phrase) => {
    if (!grouped[phrase.category]) {
      return;
    }

    grouped[phrase.category].push({
      id: phrase.id,
      textEn: phrase.text_en,
      textMs: phrase.text_ms,
      image: phrase.image_path || ''
    });
  });

  return grouped;
}

async function generateNextPhraseId() {
  const phrases = await getAllAdminPhrases();

  const existingIds = phrases
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

async function openAddModal() {
  editingPhraseId = null;

  if (modalTitle) {
    modalTitle.textContent = 'Add Phrase';
  }

  if (contentForm) {
    contentForm.reset();
  }

  if (contentIdInput) {
    contentIdInput.value = await generateNextPhraseId();
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

async function findPhraseById(phraseId) {
  const { data, error } = await supabaseClient
    .from('admin_phrases')
    .select('*')
    .eq('id', phraseId)
    .single();

  if (error) {
    throw error;
  }

  return {
    phrase: {
      id: data.id,
      textEn: data.text_en,
      textMs: data.text_ms,
      image: data.image_path || ''
    },
    categoryKey: data.category
  };
}

async function openEditModal(phraseId) {
  const found = await findPhraseById(phraseId);

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

async function deletePhrase(phraseId) {
  const { error } = await supabaseClient
    .from('admin_phrases')
    .delete()
    .eq('id', phraseId);

  if (error) {
    throw error;
  }

  await renderCategoryList();
  await renderPhraseCards(currentCategory);
}

async function setActiveCategory(selectedCategory) {
  currentCategory = selectedCategory;
  await renderCategoryList();
  await renderPhraseCards(selectedCategory);
}

async function renderCategoryList() {
  if (!categoryList) return;

  const allPhrases = await getGroupedAdminPhrases();

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
    button.addEventListener('click', async () => {
      await setActiveCategory(button.dataset.category);
    });
  });
}

async function renderPhraseCards(categoryKey) {
  if (!contentList) return;

  const allPhrases = await getGroupedAdminPhrases();
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
    button.addEventListener('click', async () => {
      try {
        await openEditModal(button.dataset.editId);
      } catch (error) {
        showError(error);
      }
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

  let existingImage = '';

  if (editingPhraseId) {
    const found = await findPhraseById(editingPhraseId);
    if (found) {
      existingImage = found.phrase.image || '';
    }
  }

  const imageData = imageFile ? await readImageFileAsDataURL(imageFile) : existingImage;

  const payload = {
    id: phraseId,
    category: categoryKey,
    text_en: textEn,
    text_ms: textMs,
    image_path: imageData || null,
    created_by: currentAdminUser?.id || null
  };

  if (editingPhraseId) {
    const { error } = await supabaseClient
      .from('admin_phrases')
      .update({
        category: payload.category,
        text_en: payload.text_en,
        text_ms: payload.text_ms,
        image_path: payload.image_path
      })
      .eq('id', editingPhraseId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabaseClient
      .from('admin_phrases')
      .insert(payload);

    if (error) {
      throw error;
    }
  }

  closeContentModal();

  currentCategory = categoryKey;
  await renderCategoryList();
  await renderPhraseCards(currentCategory);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem('echozySession');
      window.location.href = '../auth/admin-signin.html';
    }
  });
}

if (addContentBtn) {
  addContentBtn.addEventListener('click', async () => {
    try {
      await openAddModal();
    } catch (error) {
      showError(error);
    }
  });
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
  contentForm.addEventListener('submit', async (event) => {
    try {
      await handleSavePhrase(event);
    } catch (error) {
      showError(error);
    }
  });
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!phraseToDelete) return;

    try {
      await deletePhrase(phraseToDelete);
      closeDeleteModal();
    } catch (error) {
      showError(error);
    }
  });
}

if (deleteModal) {
  deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

async function initializeAdminManagePhrasesPage() {
  await loadCurrentAdminUser();
  populateCategoryOptions();
  await renderCategoryList();
  await renderPhraseCards(currentCategory);
}

initializeAdminManagePhrasesPage().catch((error) => {
  showError(error);
});