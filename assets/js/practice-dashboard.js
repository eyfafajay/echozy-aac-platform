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

const practicedPhrasesPercent = document.getElementById('practicedPhrasesPercent');
const practicedVocabularyPercent = document.getElementById('practicedVocabularyPercent');
const practicedPhrasesCount = document.getElementById('practicedPhrasesCount');
const practicedVocabularyCount = document.getElementById('practicedVocabularyCount');

const practiceCategoryList = document.getElementById('practiceCategoryList');
const practiceCardsGrid = document.getElementById('practiceCardsGrid');
const practiceContentTitle = document.getElementById('practiceContentTitle');
const practiceContentCount = document.getElementById('practiceContentCount');

const practiceTabButtons = document.querySelectorAll('[data-practice-type]');

let currentType = 'phrases';
let currentCategory = 'urgent';

const DEFAULT_IMAGE = '../../assets/images/placeholders/defaultPV.png';

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
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

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function getStoredPractice() {
  return JSON.parse(localStorage.getItem('echozyPracticeProgress') || '{}');
}

function saveStoredPractice(data) {
  localStorage.setItem('echozyPracticeProgress', JSON.stringify(data));
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

function getPatientPractice() {
  const allPractice = getStoredPractice();

  if (!allPractice[patientId]) {
    allPractice[patientId] = {
      phrases: [],
      vocabulary: []
    };
    saveStoredPractice(allPractice);
  }

  return allPractice[patientId];
}

function getPatientPhrases() {
  const allPhrases = getStoredPhrases();
  return allPhrases[patientId] || {};
}

function getPatientVocabulary() {
  const allVocabulary = getStoredVocabulary();
  return allVocabulary[patientId] || {};
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

function getCurrentData() {
  return currentType === 'phrases' ? getPatientPhrases() : getPatientVocabulary();
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

function updatePracticeSummary() {
  const patientPractice = getPatientPractice();
  const phraseData = getPatientPhrases();
  const vocabularyData = getPatientVocabulary();

  const totalPhraseItems = countAllItems(phraseData);
  const totalVocabularyItems = countAllItems(vocabularyData);

  const phraseIds = getAllIds(phraseData);
  const vocabularyIds = getAllIds(vocabularyData);

  const practicedPhraseTotal = patientPractice.phrases.filter((id) => phraseIds.includes(id)).length;
  const practicedVocabularyTotal = patientPractice.vocabulary.filter((id) => vocabularyIds.includes(id)).length;

  const phrasePercent = totalPhraseItems ? Math.round((practicedPhraseTotal / totalPhraseItems) * 100) : 0;
  const vocabularyPercent = totalVocabularyItems ? Math.round((practicedVocabularyTotal / totalVocabularyItems) * 100) : 0;

  if (practicedPhrasesPercent) {
    practicedPhrasesPercent.textContent = `${phrasePercent}%`;
  }

  if (practicedVocabularyPercent) {
    practicedVocabularyPercent.textContent = `${vocabularyPercent}%`;
  }

  if (practicedPhrasesCount) {
    practicedPhrasesCount.textContent = practicedPhraseTotal;
  }

  if (practicedVocabularyCount) {
    practicedVocabularyCount.textContent = practicedVocabularyTotal;
  }
}

function renderCategories() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  practiceCategoryList.innerHTML = categoryKeys.map((key) => `
    <button
      type="button"
      class="board-category-btn ${key === currentCategory ? 'active-board-category' : ''}"
      data-category="${key}"
    >
      <span>${labels[key]}</span>
      <small>${(data[key] || []).length} Cards</small>
    </button>
  `).join('');

  const categoryButtons = practiceCategoryList.querySelectorAll('[data-category]');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      renderCategories();
      renderPracticeCards();
    });
  });
}

function togglePracticeItem(itemId) {
  const allPractice = getStoredPractice();
  const patientPractice = getPatientPractice();
  const targetList = currentType === 'phrases' ? patientPractice.phrases : patientPractice.vocabulary;

  const existingIndex = targetList.indexOf(itemId);

  if (existingIndex >= 0) {
    targetList.splice(existingIndex, 1);
  } else {
    targetList.push(itemId);
  }

  allPractice[patientId] = patientPractice;
  saveStoredPractice(allPractice);

  updatePracticeSummary();
  renderPracticeCards();
}

function renderPracticeCards() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const patientPractice = getPatientPractice();

  const items = data[currentCategory] || [];
  const practicedIds = currentType === 'phrases' ? patientPractice.phrases : patientPractice.vocabulary;
  const resolvedLanguage = getResolvedPatientLanguage();

  if (practiceContentTitle) {
    practiceContentTitle.textContent = labels[currentCategory];
  }

  if (practiceContentCount) {
    practiceContentCount.textContent = `${items.length} cards`;
  }

  practiceCardsGrid.innerHTML = items.length
    ? items.map((item) => {
        const isPracticed = practicedIds.includes(item.id);
        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="practice-card ${isPracticed ? 'practiced-card' : ''}"
            data-item-id="${item.id}"
          >
            <div class="practice-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="practice-card-text">
              <span>${displayText}</span>
              <small>${isPracticed ? 'Practiced' : 'Not practiced yet'}</small>
            </div>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No cards available in this category yet.</div>`;

  const cards = practiceCardsGrid.querySelectorAll('[data-item-id]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      togglePracticeItem(card.dataset.itemId);
    });
  });
}

practiceTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    practiceTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.practiceType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    renderCategories();
    renderPracticeCards();
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

updatePracticeSummary();
renderCategories();
renderPracticeCards();
applyCardScale();