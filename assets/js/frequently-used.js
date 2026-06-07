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

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

let currentType = 'phrases';
let currentCategory = 'urgent';

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
    updatePatientStatusInStorage(patientId, 'Inactive');
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

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function getStoredUsageCounts() {
  return JSON.parse(localStorage.getItem('echozyUsageCounts') || '{}');
}

function saveStoredUsageCounts(data) {
  localStorage.setItem('echozyUsageCounts', JSON.stringify(data));
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

function getPatientPhrases() {
  const allPhrases = getStoredPhrases();
  return allPhrases[patientId] || {};
}

function getPatientVocabulary() {
  const allVocabulary = getStoredVocabulary();
  return allVocabulary[patientId] || {};
}

function getPatientUsageCounts() {
  const allUsage = getStoredUsageCounts();

  if (!allUsage[patientId]) {
    allUsage[patientId] = {
      phrases: {},
      vocabulary: {}
    };
    saveStoredUsageCounts(allUsage);
  }

  return allUsage[patientId];
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

function getCurrentData() {
  return currentType === 'phrases' ? getPatientPhrases() : getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

function getCategoryThemeClass(categoryKey) {
  return frequentCategoryThemeMap[categoryKey] || 'frequent-theme-default';
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

function updateTopSummary() {
  const phraseData = getPatientPhrases();
  const vocabularyData = getPatientVocabulary();
  const usageData = getPatientUsageCounts();

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

function renderCategories() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const usageData = getPatientUsageCounts();
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
    button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      renderCategories();
      renderFrequentlyUsedCards();
    });
  });
}

function recordUsage(type, itemId) {
  const allUsage = getStoredUsageCounts();
  const patientUsage = getPatientUsageCounts();
  const targetUsage = type === 'phrases' ? patientUsage.phrases : patientUsage.vocabulary;

  if (!targetUsage[itemId]) {
    targetUsage[itemId] = 0;
  }

  targetUsage[itemId] += 1;

  allUsage[patientId] = patientUsage;
  saveStoredUsageCounts(allUsage);

  updateTopSummary();
  renderCategories();
  renderFrequentlyUsedCards();
}

function renderFrequentlyUsedCards() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const patientUsage = getPatientUsageCounts();
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
    card.addEventListener('click', () => {
      recordUsage(currentType, card.dataset.itemId);
    });
  });
}

frequentTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    frequentTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.frequentType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    renderCategories();
    renderFrequentlyUsedCards();
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

updateTopSummary();
renderCategories();
renderFrequentlyUsedCards();
applyCardScale();