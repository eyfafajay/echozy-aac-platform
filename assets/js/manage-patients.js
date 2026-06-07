const addPatientModal = document.getElementById('addPatientModal');
const openAddPatientModal = document.getElementById('openAddPatientModal');
const closeAddPatientModal = document.getElementById('closeAddPatientModal');
const cancelAddPatientModal = document.getElementById('cancelAddPatientModal');
const addPatientForm = document.getElementById('addPatientForm');

const patientFullName = document.getElementById('patient-fullname');
const patientIdInput = document.getElementById('patient-id');
const patientAgeInput = document.getElementById('patient-age');
const patientGenderInput = document.getElementById('patient-gender');
const patientDobInput = document.getElementById('patient-dob');

const patientsGrid = document.getElementById('patientsGrid');

const pageParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const currentRole = pageParams.get('role') || storedSession.role || 'caregiver';
const currentUserId = pageParams.get('userId') || storedSession.userId || '';
const currentName = pageParams.get('name') || storedSession.fullName || 'User';

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const sharedUserQuery = new URLSearchParams({
  role: currentRole,
  userId: currentUserId,
  name: currentName
}).toString();

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${sharedUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${sharedUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href =
    currentRole === 'provider'
      ? `settings-provider.html?${sharedUserQuery}`
      : `settings-caregiver.html?${sharedUserQuery}`;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
  });
}

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function saveStoredPatients(patients) {
  localStorage.setItem('echozyPatients', JSON.stringify(patients));
}

function calculateAgeFromDob(dobValue) {
  if (!dobValue) return '';

  const birthDate = new Date(dobValue);
  const currentDate = new Date();

  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : '';
}

function getAvatarByGender(gender) {
  return gender === 'Female'
    ? '../../assets/images/avatars/female.png'
    : '../../assets/images/avatars/male.png';
}

function renderPatientsFromStorage() {
  if (!patientsGrid) return;

  const patients = Object.values(getStoredPatients());

  if (!patients.length) {
    patientsGrid.innerHTML = `
      <div class="board-empty-state">No patients added yet.</div>
    `;
    return;
  }

  patientsGrid.innerHTML = patients.map((patient) => {
    const patientQuery = new URLSearchParams({
      patient: patient.id,
      name: patient.name,
      status: patient.status,
      language: patient.preferredLanguage || 'English',
      role: currentRole,
      userId: currentUserId,
      user: currentName
    }).toString();

    return `
      <a href="patient-dashboard.html?${patientQuery}" class="patient-card" data-patient-id="${patient.id}">
        <div class="patient-card-top">
          <div class="patient-avatar-wrapper">
            <img src="${getAvatarByGender(patient.gender)}" alt="${patient.name}" class="patient-avatar" />
          </div>
          <span class="patient-status ${patient.status === 'Active' ? 'active-status' : 'inactive-status'}"></span>
        </div>

        <div class="patient-card-body">
          <h2>${patient.name}</h2>
          <p class="patient-id">Patient ID: ${patient.id}</p>
          <p class="patient-meta">${patient.gender} • ${patient.age} years old</p>
        </div>
      </a>
    `;
  }).join('');
}

if (patientDobInput && patientAgeInput) {
  patientDobInput.addEventListener('change', () => {
    patientAgeInput.value = calculateAgeFromDob(patientDobInput.value);
  });
}

if (openAddPatientModal && addPatientModal) {
  openAddPatientModal.addEventListener('click', () => {
    if (addPatientForm) {
      addPatientForm.reset();
    }

    if (patientAgeInput) {
      patientAgeInput.value = '';
    }

    addPatientModal.classList.add('active');
  });
}

if (closeAddPatientModal && addPatientModal) {
  closeAddPatientModal.addEventListener('click', () => {
    addPatientModal.classList.remove('active');
  });
}

if (cancelAddPatientModal && addPatientModal) {
  cancelAddPatientModal.addEventListener('click', () => {
    addPatientModal.classList.remove('active');
  });
}

if (addPatientForm) {
  addPatientForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const patients = getStoredPatients();
    const id = patientIdInput.value.trim();
    const fullName = patientFullName.value.trim();
    const age = patientAgeInput.value.trim();
    const gender = patientGenderInput.value;
    const dob = patientDobInput.value;

    if (!currentUserId) {
      alert('No active user session found. Please sign in again.');
      return;
    }

    if (!fullName || !id || !age || !gender || !dob) {
      alert('Please complete all patient details before saving.');
      return;
    }

    if (!/^\d{4}$/.test(id)) {
      alert('Patient ID must be the last 4 digits of MyKad.');
      return;
    }

    if (patients[id]) {
      alert('A patient with this ID already exists.');
      return;
    }

    const newPatient = {
      id,
      name: fullName,
      gender,
      age,
      dob,
      status: 'Inactive',
      preferredLanguage: 'English',
      avatar: getAvatarByGender(gender)
    };

    patients[id] = newPatient;
    saveStoredPatients(patients);
    renderPatientsFromStorage();

    addPatientModal.classList.remove('active');
    addPatientForm.reset();

    if (patientAgeInput) {
      patientAgeInput.value = '';
    }

    alert('Patient added successfully.');

    const newPatientQuery = new URLSearchParams({
      patient: id,
      name: fullName,
      status: 'Inactive',
      language: 'English',
      role: currentRole,
      userId: currentUserId,
      user: currentName
    }).toString();

    window.location.href = `patient-dashboard.html?${newPatientQuery}`;
  });
}

if (addPatientModal) {
  addPatientModal.addEventListener('click', (event) => {
    if (event.target === addPatientModal) {
      addPatientModal.classList.remove('active');
    }
  });
}

renderPatientsFromStorage();