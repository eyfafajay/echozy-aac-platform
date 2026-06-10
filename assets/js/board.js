const params = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const patientId = params.get('patient') || '0832';
const patientName = params.get('name') || 'Adam Lim';
const patientStatus = params.get('status') || 'Active';
const patientLanguage = params.get('language') || 'English';

const userRole = params.get('role') || storedSession.role || 'caregiver';
const userId = params.get('userId') || storedSession.userId || 'U0001';
const userName = params.get('user') || storedSession.fullName || 'User';

const frequentlyUsedNavLink = document.getElementById('frequentlyUsedNavLink');
const phrasesVocabularyNavLink = document.getElementById('phrasesVocabularyNavLink');
const boardNavLink = document.getElementById('boardNavLink');
const practiceDashboardNavLink = document.getElementById('practiceDashboardNavLink');
const backToPatientDashboardBtn = document.getElementById('backToPatientDashboardBtn');

const boardPatientHeading = document.getElementById('boardPatientHeading');
const boardSubtext = document.getElementById('boardSubtext');
const boardPatientStatus = document.getElementById('boardPatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const boardLanguageSelect = document.getElementById('boardLanguageSelect');
const boardMessageBox = document.getElementById('boardMessageBox');
const backspaceMessageBtn = document.getElementById('backspaceMessageBtn');
const clearMessageBtn = document.getElementById('clearMessageBtn');
const speakMessageBtn = document.getElementById('speakMessageBtn');

const boardCategoryList = document.getElementById('boardCategoryList');
const boardCardsGrid = document.getElementById('boardCardsGrid');
const boardContentTitle = document.getElementById('boardContentTitle');
const boardContentCount = document.getElementById('boardContentCount');
const boardContentHeader = document.querySelector('.board-content-header');

const boardTabButtons = document.querySelectorAll('.board-tab-btn');

const DEFAULT_IMAGE = '../../assets/images/placeholders/defaultPV.png';
const PHRASE_BUCKET_NAME = 'phrase-images';
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

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

let currentType = 'phrases';
let currentCategory = 'urgent';
let builtMessage = [];

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

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function saveStoredPatients(patients) {
  localStorage.setItem('echozyPatients', JSON.stringify(patients));
}

function updatePatientStatusInStorage(nextStatus) {
  const patients = getStoredPatients();

  if (!patients[patientId]) {
    return;
  }

  patients[patientId].status = nextStatus;
  saveStoredPatients(patients);
}

function getResolvedPatientLanguage() {
  const storedPatients = getStoredPatients();
  return patientLanguage || storedPatients[patientId]?.preferredLanguage || 'English';
}

function getTextByLanguage(item, language) {
  if (!item) return '';

  if (language === 'Bahasa Melayu') {
    return item.textMs || item.textEn || item.text || '';
  }

  return item.textEn || item.text || item.textMs || '';
}

async function getPatientUsageCounts() {
  const { data, error } = await supabaseClient
    .from('usage_counts')
    .select('content_type, content_id, click_count')
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }

  const usage = {
    phrases: {},
    vocabulary: {}
  };

  (data || []).forEach((row) => {
    if (row.content_type === 'phrases' || row.content_type === 'vocabulary') {
      usage[row.content_type][row.content_id] = row.click_count || 0;
    }
  });

  return usage;
}

async function incrementUsageCount(contentType, contentId) {
  const { data: existingRow, error: fetchError } = await supabaseClient
    .from('usage_counts')
    .select('id, click_count')
    .eq('patient_id', patientId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingRow) {
    const { error: updateError } = await supabaseClient
      .from('usage_counts')
      .update({
        click_count: (existingRow.click_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRow.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabaseClient
    .from('usage_counts')
    .insert({
      patient_id: patientId,
      content_type: contentType,
      content_id: contentId,
      click_count: 1
    });

  if (insertError) {
    throw insertError;
  }
}

function getStoredCardScale() {
  const storedScale = Number(localStorage.getItem(`echozyCardScale_${patientId}`));

  if (!Number.isFinite(storedScale)) {
    return 100;
  }

  return Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, storedScale));
}

function saveStoredCardScale(scaleValue) {
  const safeScale = Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, scaleValue));
  localStorage.setItem(`echozyCardScale_${patientId}`, String(safeScale));
}

function applyCardScale() {
  const currentScale = getStoredCardScale();
  document.body.style.setProperty('--echozy-card-scale', String(currentScale / 100));

  if (cardSizeValue) {
    cardSizeValue.textContent = `${currentScale}%`;
  }

  if (decreaseCardSizeBtn) {
    decreaseCardSizeBtn.disabled = currentScale <= MIN_CARD_SCALE;
  }

  if (increaseCardSizeBtn) {
    increaseCardSizeBtn.disabled = currentScale >= MAX_CARD_SCALE;
  }
}

const sharedPatientQuery = new URLSearchParams({
  patient: patientId,
  name: patientName,
  status: patientStatus,
  language: getResolvedPatientLanguage(),
  role: userRole,
  userId,
  user: userName
}).toString();

if (frequentlyUsedNavLink) {
  frequentlyUsedNavLink.href = `frequently-used.html?${sharedPatientQuery}`;
}

if (phrasesVocabularyNavLink) {
  phrasesVocabularyNavLink.href = `phrases-vocabulary.html?${sharedPatientQuery}`;
}

if (boardNavLink) {
  boardNavLink.href = `board.html?${sharedPatientQuery}`;
}

if (practiceDashboardNavLink) {
  practiceDashboardNavLink.href = `practice-dashboard.html?${sharedPatientQuery}`;
}

if (backToPatientDashboardBtn) {
  backToPatientDashboardBtn.href = `../main/patient-dashboard.html?${sharedPatientQuery}`;

  backToPatientDashboardBtn.addEventListener('click', () => {
    recordQuitSession();
    updatePatientStatusInStorage('Inactive');
  });
}

if (boardPatientHeading) {
  boardPatientHeading.textContent = `Echozy Board for ${patientName}`;
}

if (boardSubtext) {
  boardSubtext.textContent =
    `Tap phrases and vocabulary cards to build communication for ${patientName}.`;
}

if (boardPatientStatus) {
  boardPatientStatus.textContent = patientStatus;
  boardPatientStatus.classList.remove('active-badge', 'inactive-badge');
  boardPatientStatus.classList.add(
    patientStatus === 'Active' ? 'active-badge' : 'inactive-badge'
  );
}

function getStoredSessionLogs() {
  return JSON.parse(localStorage.getItem('echozySessionLogs') || '{}');
}

function saveStoredSessionLogs(data) {
  localStorage.setItem('echozySessionLogs', JSON.stringify(data));
}

function recordQuitSession() {
  const allSessionLogs = getStoredSessionLogs();

  if (!allSessionLogs[patientId] || !allSessionLogs[patientId].length) {
    return;
  }

  const patientLogs = allSessionLogs[patientId];

  for (let i = patientLogs.length - 1; i >= 0; i--) {
    if (patientLogs[i].enteredAt && !patientLogs[i].quitAt) {
      patientLogs[i].quitAt = new Date().toISOString();
      break;
    }
  }

  allSessionLogs[patientId] = patientLogs;
  saveStoredSessionLogs(allSessionLogs);
}

async function createSignedImageUrl(bucketName, imagePath) {
  if (!imagePath) {
    return DEFAULT_IMAGE;
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }

  const { data, error } = await supabaseClient.storage
    .from(bucketName)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error(error);
    return DEFAULT_IMAGE;
  }

  return data?.signedUrl || DEFAULT_IMAGE;
}

async function getAllAdminPhrases() {
  const { data, error } = await supabaseClient
    .from('admin_phrases')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAllAdminVocabulary() {
  const { data, error } = await supabaseClient
    .from('admin_vocabulary')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAllPatientPhrases() {
  const { data, error } = await supabaseClient
    .from('patient_phrases')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAllPatientVocabulary() {
  const { data, error } = await supabaseClient
    .from('patient_vocabulary')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getPatientPhrases() {
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
      image: await createSignedImageUrl(PHRASE_BUCKET_NAME, phrase.image_path || '')
    });
  }

  for (const phrase of patientPhrases) {
    if (!merged[phrase.category]) continue;

    merged[phrase.category].push({
      id: phrase.id,
      text: phrase.text_en,
      textEn: phrase.text_en,
      textMs: phrase.text_ms,
      image: await createSignedImageUrl(PHRASE_BUCKET_NAME, phrase.image_path || '')
    });
  }

  return merged;
}

async function getPatientVocabulary() {
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
      image: await createSignedImageUrl(VOCABULARY_BUCKET_NAME, item.image_path || '')
    });
  }

  for (const item of patientVocabulary) {
    if (!merged[item.category]) continue;

    merged[item.category].push({
      id: item.id,
      text: item.text_en,
      textEn: item.text_en,
      textMs: item.text_ms,
      image: await createSignedImageUrl(VOCABULARY_BUCKET_NAME, item.image_path || '')
    });
  }

  return merged;
}

const phraseCategoryLabels = {
  urgent: 'Urgent Needs',
  basic: 'Basic Responses',
  feelings: 'Feelings & Emotions',
  physical: 'Physical Condition',
  daily: 'Daily Needs',
  social: 'People & Social Communication',
  rehab: 'Rehabilitation',
  activities: 'Activities & Preferences'
};

const vocabularyCategoryLabels = {
  people: 'People',
  food: 'Food & Drink',
  places: 'Places',
  body: 'Body & Health',
  feelings: 'Feelings',
  actions: 'Actions & Verbs'
};

const boardCategoryColorClassMap = {
  urgent: 'board-theme-urgent',
  basic: 'board-theme-basic',
  feelings: 'board-theme-feelings',
  physical: 'board-theme-physical',
  daily: 'board-theme-daily',
  social: 'board-theme-social',
  rehab: 'board-theme-rehab',
  activities: 'board-theme-activities',
  people: 'board-theme-people',
  food: 'board-theme-food',
  places: 'board-theme-places',
  body: 'board-theme-body',
  actions: 'board-theme-actions'
};

function getBoardCategoryClass(category) {
  return boardCategoryColorClassMap[category] || 'board-theme-default';
}

async function getCurrentData() {
  return currentType === 'phrases' ? await getPatientPhrases() : await getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

async function renderCategories() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  boardCategoryList.innerHTML = categoryKeys.map((key) => `
    <button
      type="button"
      class="board-category-btn ${getBoardCategoryClass(key)} ${key === currentCategory ? 'active-board-category' : ''}"
      data-category="${key}"
    >
      <span>${labels[key]}</span>
      <small>${(data[key] || []).length} Cards</small>
    </button>
  `).join('');

  const categoryButtons = boardCategoryList.querySelectorAll('.board-category-btn');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      currentCategory = button.dataset.category;
      await renderCategories();
      await renderCards();
    });
  });
}

async function renderCards() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const items = data[currentCategory] || [];
  const themeClass = getBoardCategoryClass(currentCategory);
  const resolvedLanguage = getResolvedPatientLanguage();

  if (boardContentTitle) {
    boardContentTitle.textContent = labels[currentCategory];
  }

  if (boardContentCount) {
    boardContentCount.textContent = `${items.length} cards`;
  }

  if (boardCardsGrid) {
    boardCardsGrid.className = 'board-cards-grid';
    boardCardsGrid.classList.add(themeClass);
  }

  if (boardContentHeader) {
    boardContentHeader.className = 'board-content-header';
    boardContentHeader.classList.add(themeClass);
  }

  boardCardsGrid.innerHTML = items.length
    ? items.map((item) => {
        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="board-card ${themeClass}"
            data-item-id="${item.id}"
            data-text="${displayText}"
          >
            <div class="board-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <span>${displayText}</span>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No cards available in this category yet.</div>`;

  const boardCards = boardCardsGrid.querySelectorAll('.board-card');
  boardCards.forEach((card) => {
    card.addEventListener('click', async () => {
      const itemId = card.dataset.itemId;
      const text = card.dataset.text;

      if (!text) return;

      await incrementUsageCount(currentType, itemId);
      builtMessage.push(text);
      updateMessageBox();
    });
  });
}

function updateMessageBox() {
  if (!boardMessageBox) return;

  if (!builtMessage.length) {
    boardMessageBox.textContent = 'Tap a card to build a sentence...';
    boardMessageBox.classList.add('board-message-placeholder');
    return;
  }

  boardMessageBox.textContent = builtMessage.join(' ');
  boardMessageBox.classList.remove('board-message-placeholder');
}

if (clearMessageBtn) {
  clearMessageBtn.addEventListener('click', () => {
    builtMessage = [];
    updateMessageBox();
  });
}

if (backspaceMessageBtn) {
  backspaceMessageBtn.addEventListener('click', () => {
    builtMessage.pop();
    updateMessageBox();
  });
}

if (decreaseCardSizeBtn) {
  decreaseCardSizeBtn.addEventListener('click', () => {
    const currentScale = getStoredCardScale();
    const nextScale = Math.max(MIN_CARD_SCALE, currentScale - CARD_SCALE_STEP);
    saveStoredCardScale(nextScale);
    applyCardScale();
  });
}

if (increaseCardSizeBtn) {
  increaseCardSizeBtn.addEventListener('click', () => {
    const currentScale = getStoredCardScale();
    const nextScale = Math.min(MAX_CARD_SCALE, currentScale + CARD_SCALE_STEP);
    saveStoredCardScale(nextScale);
    applyCardScale();
  });
}

if (boardLanguageSelect) {
  boardLanguageSelect.value =
    getResolvedPatientLanguage() === 'Bahasa Melayu' ? 'ms-MY' : 'en-US';
}

if (speakMessageBtn) {
  let currentAudio = null;

  const speakWithOpenAITTS = async () => {
    if (!builtMessage.length) return;

    const textToSpeak = builtMessage.join(' ');
    const selectedLanguage = boardLanguageSelect ? boardLanguageSelect.value : 'en-US';

    try {
      speakMessageBtn.disabled = true;
      speakMessageBtn.textContent = 'Speaking...';

      const response = await fetch('http://localhost:3000/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textToSpeak,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech.');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }

      currentAudio = new Audio(audioUrl);

      currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      };

      currentAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        alert('Unable to play generated audio.');
      };

      await currentAudio.play();
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      alert(error.message || 'Something went wrong while generating speech.');
    } finally {
      speakMessageBtn.disabled = false;
      speakMessageBtn.textContent = 'Speak';
    }
  };

  speakMessageBtn.addEventListener('click', () => {
    speakWithOpenAITTS();
  });
}

boardTabButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    boardTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.type;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    await renderCategories();
    await renderCards();
  });
});

async function initializeBoardPage() {
  updateMessageBox();
  await renderCategories();
  await renderCards();
  applyCardScale();
}

initializeBoardPage().catch((error) => {
  console.error(error);
});