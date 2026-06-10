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

const practiceHeading = document.getElementById('practiceHeading');
const practiceSubtext = document.getElementById('practiceSubtext');
const practicePatientStatus = document.getElementById('practicePatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const phrasesProgressPercent = document.getElementById('phrasesProgressPercent');
const vocabularyProgressPercent = document.getElementById('vocabularyProgressPercent');

const phrasesProgressSuccessBar = document.getElementById('phrasesProgressSuccessBar');
const phrasesProgressUnsuccessfulBar = document.getElementById('phrasesProgressUnsuccessfulBar');
const vocabularyProgressSuccessBar = document.getElementById('vocabularyProgressSuccessBar');
const vocabularyProgressUnsuccessfulBar = document.getElementById('vocabularyProgressUnsuccessfulBar');

const phrasesSuccessCount = document.getElementById('phrasesSuccessCount');
const phrasesUnsuccessfulCount = document.getElementById('phrasesUnsuccessfulCount');
const vocabularySuccessCount = document.getElementById('vocabularySuccessCount');
const vocabularyUnsuccessfulCount = document.getElementById('vocabularyUnsuccessfulCount');

const practiceCategoryList = document.getElementById('practiceCategoryList');
const practiceCardsGrid = document.getElementById('practiceCardsGrid');
const practiceContentTitle = document.getElementById('practiceContentTitle');
const practiceContentCount = document.getElementById('practiceContentCount');
const practiceContentHeader = document.querySelector('.practice-content-header');

const practiceTabButtons = document.querySelectorAll('[data-practice-type]');

let currentType = 'phrases';
let currentCategory = 'urgent';
let currentAudio = null;

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

function updatePatientStatusInStorage(patientId, nextStatus) {
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
    const response = await fetch('http://localhost:3000/tts', {
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
    console.error('Practice Dashboard card TTS error:', error);
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

  backToPatientDashboardBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      await closePatientSession();
    } catch (error) {
      console.error('Quit session error:', error);
    } finally {
      window.location.href = backToPatientDashboardBtn.href;
    }
  });
}

if (practiceHeading) {
  practiceHeading.textContent = `Practice for ${patientName}`;
}

if (practiceSubtext) {
  practiceSubtext.textContent =
    `Mark phrases and vocabulary as practiced to track communication progress for ${patientName}.`;
}

if (practicePatientStatus) {
  practicePatientStatus.textContent = patientStatus;
  practicePatientStatus.classList.remove('active-badge', 'inactive-badge');
  practicePatientStatus.classList.add(
    patientStatus === 'Active' ? 'active-badge' : 'inactive-badge'
  );
}

async function getPatientPracticeClickCounts() {
  const { data, error } = await supabaseClient
    .from('practice_click_counts')
    .select('content_type, content_id, click_count')
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }

  const clicks = {
    phrases: {},
    vocabulary: {}
  };

  (data || []).forEach((row) => {
    if (row.content_type === 'phrases' || row.content_type === 'vocabulary') {
      clicks[row.content_type][row.content_id] = row.click_count || 0;
    }
  });

  return clicks;
}

async function incrementPracticeClickCount(contentType, contentId) {
  const { data: existingRow, error: fetchError } = await supabaseClient
    .from('practice_click_counts')
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
      .from('practice_click_counts')
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
    .from('practice_click_counts')
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

async function getPatientPracticeResults() {
  const { data, error } = await supabaseClient
    .from('practice_results')
    .select('content_type, content_id, result_status')
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }

  const results = {
    phrases: {},
    vocabulary: {}
  };

  (data || []).forEach((row) => {
    if (row.content_type === 'phrases' || row.content_type === 'vocabulary') {
      results[row.content_type][row.content_id] = row.result_status || 'neutral';
    }
  });

  return results;
}

async function getPracticeResultForItem(itemId) {
  const patientResults = await getPatientPracticeResults();
  const targetResults = currentType === 'phrases'
    ? patientResults.phrases
    : patientResults.vocabulary;

  return targetResults[itemId] || 'neutral';
}

async function togglePracticeResult(itemId) {
  const patientResults = await getPatientPracticeResults();
  const targetResults = currentType === 'phrases'
    ? patientResults.phrases
    : patientResults.vocabulary;

  const currentResult = targetResults[itemId] || 'neutral';

  let nextResult = 'success';
  if (currentResult === 'success') {
    nextResult = 'unsuccessful';
  } else if (currentResult === 'unsuccessful') {
    nextResult = 'neutral';
  }

  const { data: existingRow, error: fetchError } = await supabaseClient
    .from('practice_results')
    .select('id')
    .eq('patient_id', patientId)
    .eq('content_type', currentType)
    .eq('content_id', itemId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (nextResult === 'neutral') {
    if (existingRow) {
      const { error: deleteError } = await supabaseClient
        .from('practice_results')
        .delete()
        .eq('id', existingRow.id);

      if (deleteError) {
        throw deleteError;
      }
    }
    return;
  }

  if (existingRow) {
    const { error: updateError } = await supabaseClient
      .from('practice_results')
      .update({
        result_status: nextResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingRow.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabaseClient
    .from('practice_results')
    .insert({
      patient_id: patientId,
      content_type: currentType,
      content_id: itemId,
      result_status: nextResult
    });

  if (insertError) {
    throw insertError;
  }
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

const practiceCategoryThemeMap = {
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

function getCategoryThemeClass(category) {
  return practiceCategoryThemeMap[category] || 'board-theme-default';
}

async function getCurrentData() {
  return currentType === 'phrases' ? await getPatientPhrases() : await getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

function countAllItems(data) {
  return Object.values(data).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function getAllIds(data) {
  return Object.values(data).flat().map((item) => item.id).filter(Boolean);
}

function countResultItems(resultsObject, validIds, targetStatus) {
  return Object.entries(resultsObject || {}).filter(([itemId, status]) => {
    return validIds.includes(itemId) && status === targetStatus;
  }).length;
}

function setProgressBarWidths(successBar, unsuccessfulBar, successWidth, unsuccessfulWidth) {
  if (successBar) {
    successBar.style.width = `${successWidth}%`;
  }

  if (unsuccessfulBar) {
    unsuccessfulBar.style.width = `${unsuccessfulWidth}%`;
  }
}

async function updatePracticeSummary() {
  const patientPracticeResults = await getPatientPracticeResults();
  const phraseData = await getPatientPhrases();
  const vocabularyData = await getPatientVocabulary();

  const totalPhraseItems = countAllItems(phraseData);
  const totalVocabularyItems = countAllItems(vocabularyData);

  const phraseIds = getAllIds(phraseData);
  const vocabularyIds = getAllIds(vocabularyData);

  const successfulPhrases = countResultItems(
    patientPracticeResults.phrases,
    phraseIds,
    'success'
  );

  const unsuccessfulPhrases = countResultItems(
    patientPracticeResults.phrases,
    phraseIds,
    'unsuccessful'
  );

  const successfulVocabulary = countResultItems(
    patientPracticeResults.vocabulary,
    vocabularyIds,
    'success'
  );

  const unsuccessfulVocabulary = countResultItems(
    patientPracticeResults.vocabulary,
    vocabularyIds,
    'unsuccessful'
  );

  const phrasesProgressValue = totalPhraseItems
    ? Math.round((successfulPhrases / totalPhraseItems) * 100)
    : 0;

  const vocabularyProgressValue = totalVocabularyItems
    ? Math.round((successfulVocabulary / totalVocabularyItems) * 100)
    : 0;

  const phraseSuccessWidth = totalPhraseItems
    ? (successfulPhrases / totalPhraseItems) * 100
    : 0;

  const phraseUnsuccessfulWidth = totalPhraseItems
    ? (unsuccessfulPhrases / totalPhraseItems) * 100
    : 0;

  const vocabularySuccessWidth = totalVocabularyItems
    ? (successfulVocabulary / totalVocabularyItems) * 100
    : 0;

  const vocabularyUnsuccessfulWidth = totalVocabularyItems
    ? (unsuccessfulVocabulary / totalVocabularyItems) * 100
    : 0;

  if (phrasesProgressPercent) {
    phrasesProgressPercent.textContent = `${phrasesProgressValue}%`;
  }

  if (vocabularyProgressPercent) {
    vocabularyProgressPercent.textContent = `${vocabularyProgressValue}%`;
  }

  if (phrasesSuccessCount) {
    phrasesSuccessCount.textContent = successfulPhrases;
  }

  if (phrasesUnsuccessfulCount) {
    phrasesUnsuccessfulCount.textContent = unsuccessfulPhrases;
  }

  if (vocabularySuccessCount) {
    vocabularySuccessCount.textContent = successfulVocabulary;
  }

  if (vocabularyUnsuccessfulCount) {
    vocabularyUnsuccessfulCount.textContent = unsuccessfulVocabulary;
  }

  setProgressBarWidths(
    phrasesProgressSuccessBar,
    phrasesProgressUnsuccessfulBar,
    phraseSuccessWidth,
    phraseUnsuccessfulWidth
  );

  setProgressBarWidths(
    vocabularyProgressSuccessBar,
    vocabularyProgressUnsuccessfulBar,
    vocabularySuccessWidth,
    vocabularyUnsuccessfulWidth
  );
}

async function renderCategories() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  practiceCategoryList.innerHTML = categoryKeys.map((key) => `
    <button
      type="button"
      class="board-category-btn ${getCategoryThemeClass(key)} ${key === currentCategory ? 'active-board-category' : ''}"
      data-category="${key}"
    >
      <span>${labels[key]}</span>
      <small>${(data[key] || []).length} Cards</small>
    </button>
  `).join('');

  const categoryButtons = practiceCategoryList.querySelectorAll('[data-category]');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      currentCategory = button.dataset.category;
      await renderCategories();
      await renderPracticeCards();
    });
  });
}

function getResultButtonClass(resultState) {
  if (resultState === 'success') return 'practice-result-btn success-result';
  if (resultState === 'unsuccessful') return 'practice-result-btn unsuccessful-result';
  return 'practice-result-btn neutral-result';
}

function getResultButtonLabel(resultState) {
  if (resultState === 'success') return 'Successful';
  if (resultState === 'unsuccessful') return 'Not Successful';
  return 'Set Result';
}

async function renderPracticeCards() {
  const labels = getCurrentLabels();
  const data = await getCurrentData();
  const patientPracticeClicks = await getPatientPracticeClickCounts();
  const patientPracticeResults = await getPatientPracticeResults();

  const items = data[currentCategory] || [];
  const practiceClicks = currentType === 'phrases'
    ? patientPracticeClicks.phrases
    : patientPracticeClicks.vocabulary;
  const practiceResults = currentType === 'phrases'
    ? patientPracticeResults.phrases
    : patientPracticeResults.vocabulary;
  const resolvedLanguage = getResolvedPatientLanguage();
  const themeClass = getCategoryThemeClass(currentCategory);

  if (practiceContentTitle) {
    practiceContentTitle.textContent = labels[currentCategory];
  }

  if (practiceContentCount) {
    practiceContentCount.textContent = `${items.length} cards`;
  }

  if (practiceContentHeader) {
    practiceContentHeader.className = 'practice-content-header';
    practiceContentHeader.classList.add(themeClass);
  }

  practiceCardsGrid.innerHTML = items.length
    ? items.map((item) => {
        const practiceCount = practiceClicks[item.id] || 0;
        const displayText = getTextByLanguage(item, resolvedLanguage);
        const resultState = practiceResults[item.id] || 'neutral';

        return `
          <div
            class="phrases-vocabulary-card ${themeClass} practice-card-shell"
            data-item-id="${item.id}"
            data-item-text="${displayText}"
            role="button"
            tabindex="0"
          >
            <button
              type="button"
              class="${getResultButtonClass(resultState)}"
              data-result-item-id="${item.id}"
              aria-label="${getResultButtonLabel(resultState)}"
              title="${getResultButtonLabel(resultState)}"
            ></button>

            <div class="phrases-vocabulary-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="phrases-vocabulary-card-text">
              <span>${displayText}</span>
              <small>Practiced ${practiceCount} time${practiceCount === 1 ? '' : 's'}</small>
            </div>
          </div>
        `;
      }).join('')
    : `<div class="board-empty-state">No cards available in this category yet.</div>`;

  const cards = practiceCardsGrid.querySelectorAll('.practice-card-shell');
  cards.forEach((card) => {
    card.addEventListener('click', async () => {
      const itemId = card.dataset.itemId;
      const itemText = card.dataset.itemText;

      await incrementPracticeClickCount(currentType, itemId);
      await updatePracticeSummary();
      await renderPracticeCards();
      speakCardWithOpenAITTS(itemText);
    });

    card.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();

        const itemId = card.dataset.itemId;
        const itemText = card.dataset.itemText;

        await incrementPracticeClickCount(currentType, itemId);
        await updatePracticeSummary();
        await renderPracticeCards();
        speakCardWithOpenAITTS(itemText);
      }
    });
  });

  const resultButtons = practiceCardsGrid.querySelectorAll('[data-result-item-id]');
  resultButtons.forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();

      const itemId = button.dataset.resultItemId;
      await togglePracticeResult(itemId);
      await updatePracticeSummary();
      await renderPracticeCards();
    });
  });
}

practiceTabButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    practiceTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.practiceType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    await renderCategories();
    await renderPracticeCards();
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

async function initializePracticeDashboardPage() {
  await updatePracticeSummary();
  await renderCategories();
  await renderPracticeCards();
  applyCardScale();
}

initializePracticeDashboardPage().catch((error) => {
  console.error(error);
});

async function updatePatientStatusInSupabase(nextStatus) {
  const { error } = await supabaseClient
    .from('patients')
    .update({ status: nextStatus })
    .eq('id', patientId);

  if (error) {
    throw error;
  }
}

async function recordQuitSessionInSupabase() {
  const { data: activeSession, error: fetchError } = await supabaseClient
    .from('session_logs')
    .select('id')
    .eq('patient_id', patientId)
    .is('quit_at', null)
    .order('entered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!activeSession) {
    return;
  }

  const { error: updateError } = await supabaseClient
    .from('session_logs')
    .update({
      quit_at: new Date().toISOString()
    })
    .eq('id', activeSession.id);

  if (updateError) {
    throw updateError;
  }
}

async function closePatientSession() {
  await recordQuitSessionInSupabase();
  await updatePatientStatusInSupabase('Inactive');
  updatePatientStatusInStorage('Inactive');
}