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

const frequentlyUsedHeading = document.getElementById('frequentlyUsedHeading');
const frequentlyUsedSubtext = document.getElementById('frequentlyUsedSubtext');
const frequentlyUsedPatientStatus = document.getElementById('frequentlyUsedPatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const frequentlyUsedPhraseClicks = document.getElementById('frequentlyUsedPhraseClicks');
const frequentlyUsedVocabularyClicks = document.getElementById('frequentlyUsedVocabularyClicks');
const frequentlyUsedPhraseCards = document.getElementById('frequentlyUsedPhraseCards');
const frequentlyUsedVocabularyCards = document.getElementById('frequentlyUsedVocabularyCards');

const frequentlyUsedCategoryList = document.getElementById('frequentlyUsedCategoryList');
const frequentlyUsedCardsGrid = document.getElementById('frequentlyUsedCardsGrid');
const frequentlyUsedContentTitle = document.getElementById('frequentlyUsedContentTitle');
const frequentlyUsedContentCount = document.getElementById('frequentlyUsedContentCount');
const frequentlyUsedContentHeader = document.getElementById('frequentlyUsedContentHeader');

const frequentTabButtons = document.querySelectorAll('[data-frequent-type]');

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

const TTS_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:54321/functions/v1'
    : 'https://drvmfnlaxkcqbwoqjefu.supabase.co/functions/v1';

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

let currentType = 'phrases';
let currentCategory = 'urgent';
let currentAudio = null;

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

function getTtsLanguageCode() {
  return getResolvedPatientLanguage() === 'Bahasa Melayu' ? 'ms-MY' : 'en-US';
}

function getTextByLanguage(item, language) {
  if (!item) return '';

  if (language === 'Bahasa Melayu') {
    return item.textMs || item.textEn || item.text || '';
  }

  return item.textEn || item.text || item.textMs || '';
}

async function speakCardWithOpenAITTS(text) {
  if (!text) return;

  try {
    const response = await fetch(`${TTS_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: getTtsLanguageCode()
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
      console.error('Unable to play generated card audio.');
    };

    await currentAudio.play();
  } catch (error) {
    console.error('Frequently Used card TTS error:', error);
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

if (frequentlyUsedHeading) {
  frequentlyUsedHeading.textContent = `Frequently Used for ${patientName}`;
}

if (frequentlyUsedSubtext) {
  frequentlyUsedSubtext.textContent =
    `Easy access to the phrases and vocabulary cards most often used by ${patientName}.`;
}

if (frequentlyUsedPatientStatus) {
  frequentlyUsedPatientStatus.textContent = patientStatus;
  frequentlyUsedPatientStatus.classList.remove('active-badge', 'inactive-badge');
  frequentlyUsedPatientStatus.classList.add(
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

const frequentCategoryThemeMap = {
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

async function getCurrentData() {
  return currentType === 'phrases' ? await getPatientPhrases() : await getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

function getCategoryThemeClass(categoryKey) {
  return frequentCategoryThemeMap[categoryKey] || 'board-theme-default';
}

function flattenItemsByType(data, type) {
  return Object.entries(data).flatMap(([categoryKey, items]) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      categoryKey,
      type
    }));
  });
}

function mergeItemsWithUsage(items, usageMap) {
  return items
    .map((item) => ({
      ...item,
      clickCount: usageMap[item.id] || 0
    }))
    .filter((item) => item.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount);
}

function countAllClicks(clicksObject) {
  return Object.values(clicksObject).reduce((total, count) => total + count, 0);
}

async function updateTopSummary() {
  const phraseData = await getPatientPhrases();
  const vocabularyData = await getPatientVocabulary();
  const usageData = await getPatientUsageCounts();

  const phraseItems = flattenItemsByType(phraseData, 'phrases');
  const vocabularyItems = flattenItemsByType(vocabularyData, 'vocabulary');

  const topPhrases = mergeItemsWithUsage(phraseItems, usageData.phrases);
  const topVocabulary = mergeItemsWithUsage(vocabularyItems, usageData.vocabulary);

  if (frequentlyUsedPhraseClicks) {
    frequentlyUsedPhraseClicks.textContent = countAllClicks(usageData.phrases);
  }

  if (frequentlyUsedVocabularyClicks) {
    frequentlyUsedVocabularyClicks.textContent = countAllClicks(usageData.vocabulary);
  }

  if (frequentlyUsedPhraseCards) {
    frequentlyUsedPhraseCards.textContent = topPhrases.length;
  }

  if (frequentlyUsedVocabularyCards) {
    frequentlyUsedVocabularyCards.textContent = topVocabulary.length;
  }
}

async function renderCategories() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const usageData = await getPatientUsageCounts();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  frequentlyUsedCategoryList.innerHTML = categoryKeys.map((key) => {
    const items = Array.isArray(data[key]) ? data[key] : [];
    const usedCount = items.filter((item) => {
      const clickCount =
        currentType === 'phrases'
          ? (usageData.phrases[item.id] || 0)
          : (usageData.vocabulary[item.id] || 0);

      return clickCount > 0;
    }).length;

    return `
      <button
        type="button"
        class="board-category-btn ${getCategoryThemeClass(key)} ${key === currentCategory ? 'active-board-category' : ''}"
        data-category="${key}"
      >
        <span>${labels[key]}</span>
        <small>${usedCount} Cards</small>
      </button>
    `;
  }).join('');

  const categoryButtons = frequentlyUsedCategoryList.querySelectorAll('[data-category]');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      currentCategory = button.dataset.category;
      await renderCategories();
      await renderFrequentlyUsedCards();
    });
  });
}

async function renderFrequentlyUsedCards() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const patientUsage = await getPatientUsageCounts();
  const items = Array.isArray(data[currentCategory]) ? data[currentCategory] : [];
  const themeClass = getCategoryThemeClass(currentCategory);
  const resolvedLanguage = getResolvedPatientLanguage();

  const filteredItems = items
    .map((item) => ({
      ...item,
      clickCount:
        currentType === 'phrases'
          ? (patientUsage.phrases[item.id] || 0)
          : (patientUsage.vocabulary[item.id] || 0)
    }))
    .filter((item) => item.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount);

  if (frequentlyUsedContentTitle) {
    frequentlyUsedContentTitle.textContent = labels[currentCategory];
  }

  if (frequentlyUsedContentCount) {
    frequentlyUsedContentCount.textContent = `${filteredItems.length} cards`;
  }

  frequentlyUsedCardsGrid.innerHTML = filteredItems.length
    ? filteredItems.map((item) => {
        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="phrases-vocabulary-card ${themeClass}"
            data-item-id="${item.id}"
            data-item-text="${displayText}"
          >
            <div class="phrases-vocabulary-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="phrases-vocabulary-card-text">
              <span>${displayText}</span>
              <small>Clicked ${item.clickCount} time${item.clickCount === 1 ? '' : 's'}</small>
            </div>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No frequently used cards in this category yet.</div>`;

  const cards = frequentlyUsedCardsGrid.querySelectorAll('[data-item-id]');
  cards.forEach((card) => {
    card.addEventListener('click', async () => {
      const itemId = card.dataset.itemId;
      const itemText = card.dataset.itemText;

      await incrementUsageCount(currentType, itemId);
      await updateTopSummary();
      await renderCategories();
      await renderFrequentlyUsedCards();
      speakCardWithOpenAITTS(itemText);
    });
  });
}

frequentTabButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    frequentTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.frequentType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    await renderCategories();
    await renderFrequentlyUsedCards();
  });
});

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

async function initializeFrequentlyUsedPage() {
  await updateTopSummary();
  await renderCategories();
  await renderFrequentlyUsedCards();
  applyCardScale();
}

initializeFrequentlyUsedPage().catch((error) => {
  console.error(error);
});