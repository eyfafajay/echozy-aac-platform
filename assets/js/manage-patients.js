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
const patientNotesInput = document.getElementById('patient-notes');

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

let currentAuthUser = null;

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

function isMissingPatientForeignKeyError(error) {
  return (
    error?.code === '23503' ||
    String(error?.message || '').toLowerCase().includes('foreign key')
  );
}

function isDuplicatePatientError(error) {
  return (
    error?.code === '23505' ||
    String(error?.message || '').toLowerCase().includes('duplicate key') ||
    String(error?.message || '').toLowerCase().includes('patients_pkey')
  );
}

async function loadCurrentAuthUser() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available. Please load the Supabase CDN before this script.');
  }

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No active user session found. Please sign in again.');
  }

  currentAuthUser = user;
}

async function getAllPatients() {
  if (!currentAuthUser) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('user_patients')
    .select(`
      assigned_at,
      patients (
        *
      )
    `)
    .eq('user_id', currentAuthUser.id)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.patients)
    .filter(Boolean);
}

async function getPatientById(patientId) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function linkPatientToCurrentUser(patientId) {
  const { error } = await supabaseClient
    .from('user_patients')
    .upsert(
      {
        user_id: currentAuthUser.id,
        patient_id: patientId,
        assigned_role: currentRole
      },
      {
        onConflict: 'user_id,patient_id',
        ignoreDuplicates: true
      }
    );

  if (error) {
    throw error;
  }
}

async function linkExistingPatientToCurrentUser(patientId) {
  const { data, error } = await supabaseClient
    .rpc('link_existing_patient_to_current_user', {
      target_patient_id: patientId,
      target_role: currentRole
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] || null : data || null;
}

function goToPatientDashboard(patient) {
  const patientQuery = new URLSearchParams({
    patient: patient.id,
    name: patient.full_name,
    status: patient.status || 'Inactive',
    language: patient.preferred_language || 'English',
    role: currentRole,
    userId: currentUserId || currentAuthUser?.id || '',
    user: currentName
  }).toString();

  window.location.href = `patient-dashboard.html?${patientQuery}`;
}

async function renderPatientsFromSupabase() {
  if (!patientsGrid) return;

  const patients = await getAllPatients();

  if (!patients.length) {
    patientsGrid.innerHTML = `
      <div class="board-empty-state">No patients added yet.</div>
    `;
    return;
  }

  patientsGrid.innerHTML = patients.map((patient) => {
    const patientQuery = new URLSearchParams({
      patient: patient.id,
      name: patient.full_name,
      status: patient.status || 'Inactive',
      language: patient.preferred_language || 'English',
      role: currentRole,
      userId: currentUserId || currentAuthUser?.id || '',
      user: currentName
    }).toString();

    return `
      <a href="patient-dashboard.html?${patientQuery}" class="patient-card" data-patient-id="${patient.id}">
        <div class="patient-card-top">
          <div class="patient-avatar-wrapper">
            <img src="${getAvatarByGender(patient.gender)}" alt="${patient.full_name}" class="patient-avatar" />
          </div>
          <span class="patient-status ${(patient.status || 'Inactive') === 'Active' ? 'active-status' : 'inactive-status'}"></span>
        </div>

        <div class="patient-card-body">
          <h2>${patient.full_name}</h2>
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
  addPatientForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = patientIdInput.value.trim();
    const fullName = patientFullName.value.trim();
    const age = patientAgeInput.value.trim();
    const gender = patientGenderInput.value;
    const dob = patientDobInput.value;
    const notes = patientNotesInput ? patientNotesInput.value.trim() : '';

    if (!currentAuthUser) {
      alert('No active user session found. Please sign in again.');
      return;
    }

    if (!id) {
      alert('Please enter the Patient ID.');
      return;
    }

    if (!/^\d{4}$/.test(id)) {
      alert('Patient ID must be the last 4 digits of MyKad.');
      return;
    }

    try {
      const existingLinkedPatient = await linkExistingPatientToCurrentUser(id);

      if (existingLinkedPatient) {
        await renderPatientsFromSupabase();

        addPatientModal.classList.remove('active');
        addPatientForm.reset();

        if (patientAgeInput) {
          patientAgeInput.value = '';
        }

        alert('Existing patient linked successfully.');
        goToPatientDashboard(existingLinkedPatient);
        return;
      }

      if (!fullName || !age || !gender || !dob) {
        alert('Patient ID not found. Please complete all patient details to add a new patient.');
        return;
      }

      const newPatient = {
        id,
        created_by: currentAuthUser.id,
        full_name: fullName,
        dob,
        age: Number(age),
        gender,
        preferred_language: 'English',
        notes: notes || null,
        status: 'Inactive'
      };

      const { error: insertError } = await supabaseClient
        .from('patients')
        .insert(newPatient);

      if (insertError) {
        if (isDuplicatePatientError(insertError)) {
          const linkedPatientAfterDuplicate = await linkExistingPatientToCurrentUser(id);

          if (linkedPatientAfterDuplicate) {
            await renderPatientsFromSupabase();

            addPatientModal.classList.remove('active');
            addPatientForm.reset();

            if (patientAgeInput) {
              patientAgeInput.value = '';
            }

            alert('Existing patient linked successfully.');
            goToPatientDashboard(linkedPatientAfterDuplicate);
            return;
          }
        }

        throw insertError;
      }

      await linkPatientToCurrentUser(id);

      await renderPatientsFromSupabase();

      addPatientModal.classList.remove('active');
      addPatientForm.reset();

      if (patientAgeInput) {
        patientAgeInput.value = '';
      }

      alert('Patient added successfully.');
      goToPatientDashboard(newPatient);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Something went wrong while saving the patient.');
    }
  });
}

if (addPatientModal) {
  addPatientModal.addEventListener('click', (event) => {
    if (event.target === addPatientModal) {
      addPatientModal.classList.remove('active');
    }
  });
}

async function initializeManagePatientsPage() {
  try {
    await loadCurrentAuthUser();
    await renderPatientsFromSupabase();
  } catch (error) {
    console.error(error);
    if (patientsGrid) {
      patientsGrid.innerHTML = `
        <div class="board-empty-state">Unable to load patients right now.</div>
      `;
    }
  }
}

initializeManagePatientsPage();