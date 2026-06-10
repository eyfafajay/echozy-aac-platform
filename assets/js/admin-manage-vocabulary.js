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
let currentAdminUser = null;

function showError(error) {
  console.error(error);
  alert(error?.message || 'Something went wrong. Please try again.');
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
    throw new Error('Only admin accounts can manage default vocabulary.');
  }

  currentAdminUser = {
    id: user.id,
    email: user.email || '',
    profile
  };
}

async function getAllAdminVocabulary() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabaseClient
    .from('admin_vocabulary')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

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

async function getGroupedAdminVocabulary() {
  const vocabularyItems = await getAllAdminVocabulary();

  const grouped = {
    people: [],
    food: [],
    places: [],
    body: [],
    feelings: [],
    actions: []
  };

  for (const item of vocabularyItems) {
    if (!grouped[item.category]) {
      continue;
    }

    grouped[item.category].push({
      id: item.id,
      textEn: item.text_en,
      textMs: item.text_ms,
      image: item.image_path || '',
      imageUrl: await createVocabularySignedImageUrl(item.image_path || '')
    });
  }

  return grouped;
}

async function generateNextVocabularyId() {
  const vocabularyItems = await getAllAdminVocabulary();

  const existingIds = vocabularyItems
    .map((item) => item.id)
    .filter((id) => /^VO\d{4}$/.test(id))
    .map((id) => parseInt(id.replace('VO', ''), 10));

  const nextNumber = existingIds.length ? Math.max(...existingIds) + 1 : 1;
  return `VO${String(nextNumber).padStart(4, '0')}`;
}

async function uploadVocabularyImage(file, vocabularyId) {
  if (!file) {
    return '';
  }

  const safeFileName = file.name.replace(/\s+/g, '-');
  const filePath = `admin/vocabulary/${vocabularyId}-${Date.now()}-${safeFileName}`;

  const { data, error } = await supabaseClient.storage
    .from(VOCABULARY_BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  return data.path;
}

async function openAddModal() {
  editingVocabularyId = null;

  if (modalTitle) {
    modalTitle.textContent = 'Add Vocabulary';
  }

  if (contentForm) {
    contentForm.reset();
  }

  if (contentIdInput) {
    contentIdInput.value = await generateNextVocabularyId();
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

async function findVocabularyById(vocabularyId) {
  const { data, error } = await supabaseClient
    .from('admin_vocabulary')
    .select('*')
    .eq('id', vocabularyId)
    .single();

  if (error) {
    throw error;
  }

  return {
    vocabulary: {
      id: data.id,
      textEn: data.text_en,
      textMs: data.text_ms,
      image: data.image_path || ''
    },
    categoryKey: data.category
  };
}

async function openEditModal(vocabularyId) {
  const found = await findVocabularyById(vocabularyId);

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

async function deleteVocabulary(vocabularyId) {
  const { error } = await supabaseClient
    .from('admin_vocabulary')
    .delete()
    .eq('id', vocabularyId);

  if (error) {
    throw error;
  }

  await renderCategoryList();
  await renderVocabularyCards(currentCategory);
}

async function setActiveCategory(selectedCategory) {
  currentCategory = selectedCategory;
  await renderCategoryList();
  await renderVocabularyCards(selectedCategory);
}

async function renderCategoryList() {
  if (!categoryList) return;

  const allVocabulary = await getGroupedAdminVocabulary();

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
    button.addEventListener('click', async () => {
      await setActiveCategory(button.dataset.category);
    });
  });
}

async function renderVocabularyCards(categoryKey) {
  if (!contentList) return;

  const allVocabulary = await getGroupedAdminVocabulary();
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
          <img src="${item.imageUrl || DEFAULT_VOCABULARY_IMAGE}" alt="${item.textEn}" />
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

  let existingImagePath = '';

  if (editingVocabularyId) {
    const found = await findVocabularyById(editingVocabularyId);
    if (found) {
      existingImagePath = found.vocabulary.image || '';
    }
  }

  const uploadedImagePath = imageFile
    ? await uploadVocabularyImage(imageFile, vocabularyId)
    : existingImagePath;

  const payload = {
    id: vocabularyId,
    category: categoryKey,
    text_en: textEn,
    text_ms: textMs,
    image_path: uploadedImagePath || null,
    created_by: currentAdminUser?.id || null
  };

  if (editingVocabularyId) {
    const { error } = await supabaseClient
      .from('admin_vocabulary')
      .update({
        category: payload.category,
        text_en: payload.text_en,
        text_ms: payload.text_ms,
        image_path: payload.image_path
      })
      .eq('id', editingVocabularyId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabaseClient
      .from('admin_vocabulary')
      .insert(payload);

    if (error) {
      throw error;
    }
  }

  closeContentModal();

  currentCategory = categoryKey;
  await renderCategoryList();
  await renderVocabularyCards(currentCategory);
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
      await handleSaveVocabulary(event);
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
    if (!vocabularyToDelete) return;

    try {
      await deleteVocabulary(vocabularyToDelete);
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

async function initializeAdminManageVocabularyPage() {
  await loadCurrentAdminUser();
  populateCategoryOptions();
  await renderCategoryList();
  await renderVocabularyCards(currentCategory);
}

initializeAdminManageVocabularyPage().catch((error) => {
  showError(error);
});