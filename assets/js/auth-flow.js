/* PASSWORD TOGGLE */
const passwordToggleButtons = document.querySelectorAll('.password-toggle-btn');

passwordToggleButtons.forEach((button) => {
  button.classList.add('password-hidden');

  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);

    if (!passwordInput) return;

    const isPasswordHidden = passwordInput.type === 'password';

    passwordInput.type = isPasswordHidden ? 'text' : 'password';
    button.classList.toggle('password-hidden', !isPasswordHidden);
    button.setAttribute(
      'aria-label',
      isPasswordHidden ? 'Hide password' : 'Show password'
    );
  });
});

/* HELPERS */
function getNameFromEmail(email) {
  if (!email || !email.includes('@')) return 'User';

  const base = email.split('@')[0].replace(/[._-]+/g, ' ');
  return base
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function showError(error) {
  console.error(error);
  alert(error?.message || 'Something went wrong. Please try again.');
}

function getStoredUsers() {
  return JSON.parse(localStorage.getItem('echozyUsers') || '{}');
}

function saveStoredUsers(users) {
  localStorage.setItem('echozyUsers', JSON.stringify(users));
}

function generateUserId(role) {
  const prefix = role === 'provider' ? 'HP' : 'CG';
  const users = Object.values(getStoredUsers());

  const numbers = users
    .filter((user) => user.role === role && typeof user.userId === 'string')
    .map((user) => {
      const matched = user.userId.match(/\d+/);
      return matched ? parseInt(matched[0], 10) : 0;
    });

  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

function emailExists(email) {
  const users = getStoredUsers();
  return Object.values(users).some(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );
}

function findUserByEmail(email) {
  const users = getStoredUsers();
  return Object.values(users).find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

function saveUserProfile(userData) {
  const users = getStoredUsers();
  users[userData.userId] = userData;
  saveStoredUsers(users);
}

function storeSession(profile) {
  localStorage.setItem(
    'echozySession',
    JSON.stringify({
      userId: profile.userId,
      email: profile.email,
      fullName: profile.fullName || getNameFromEmail(profile.email),
      role: profile.role || 'caregiver',
      staffId: profile.staffId || ''
    })
  );
}

function goToDashboard(profile) {
  const role = profile?.role || 'caregiver';
  const fullName = profile?.fullName || getNameFromEmail(profile.email);

  const query = new URLSearchParams({
    role,
    userId: profile.userId,
    name: fullName,
    email: profile.email
  }).toString();

  window.location.href = `../main/dashboard.html?${query}`;
}

/* CAREGIVER SIGN UP */
const caregiverSignUpForm = document.getElementById('caregiverSignUpForm');

if (caregiverSignUpForm) {
  caregiverSignUpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const fullName = document.getElementById('caregiver-fullname')?.value.trim();
    const email = document.getElementById('caregiver-email')?.value.trim();
    const password = document.getElementById('caregiver-password')?.value;
    const confirmPassword = document.getElementById('caregiver-confirm-password')?.value;

    if (!fullName || !email || !password || !confirmPassword) {
      alert('Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (emailExists(email)) {
      alert('An account with this email already exists.');
      return;
    }

    try {
      const userProfile = {
        userId: generateUserId('caregiver'),
        fullName,
        email,
        password,
        role: 'caregiver',
        staffId: '',
        phone: '',
        gender: '',
        organization: '',
        department: '',
        position: '',
        license: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveUserProfile(userProfile);
      storeSession(userProfile);
      goToDashboard(userProfile);
    } catch (error) {
      showError(error);
    }
  });
}

/* CAREGIVER SIGN IN */
const caregiverSignInForm = document.getElementById('caregiverSignInForm');

if (caregiverSignInForm) {
  caregiverSignInForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('caregiver-email')?.value.trim();
    const password = document.getElementById('caregiver-password')?.value;

    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      const profile = findUserByEmail(email);

      if (!profile || profile.role !== 'caregiver') {
        alert('No caregiver account found for this email.');
        return;
      }

      if (profile.password !== password) {
        alert('Incorrect password.');
        return;
      }

      const safeProfile = {
        ...profile,
        fullName: profile.fullName || getNameFromEmail(profile.email),
        phone: profile.phone || '',
        gender: profile.gender || '',
        organization: profile.organization || '',
        department: profile.department || '',
        position: profile.position || '',
        license: profile.license || ''
      };

      storeSession(safeProfile);
      goToDashboard(safeProfile);
    } catch (error) {
      showError(error);
    }
  });
}

/* PROVIDER SIGN UP */
const providerSignUpForm = document.getElementById('providerSignUpForm');

if (providerSignUpForm) {
  providerSignUpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const fullName = document.getElementById('provider-fullname')?.value.trim();
    const staffId = document.getElementById('provider-staffid')?.value.trim();
    const email = document.getElementById('provider-email')?.value.trim();
    const password = document.getElementById('provider-password')?.value;
    const confirmPassword = document.getElementById('provider-confirm-password')?.value;

    if (!fullName || !staffId || !email || !password || !confirmPassword) {
      alert('Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (emailExists(email)) {
      alert('An account with this email already exists.');
      return;
    }

    try {
      const userProfile = {
        userId: generateUserId('provider'),
        fullName,
        staffId,
        email,
        password,
        role: 'provider',
        phone: '',
        gender: '',
        organization: '',
        department: '',
        position: '',
        license: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveUserProfile(userProfile);
      storeSession(userProfile);
      goToDashboard(userProfile);
    } catch (error) {
      showError(error);
    }
  });
}


/* PROVIDER SIGN IN */
const providerSignInForm = document.getElementById('providerSignInForm');

if (providerSignInForm) {
  providerSignInForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('provider-email')?.value.trim();
    const password = document.getElementById('provider-password')?.value;

    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      const profile = findUserByEmail(email);

      if (!profile || profile.role !== 'provider') {
        alert('No healthcare provider account found for this email.');
        return;
      }

      if (profile.password !== password) {
        alert('Incorrect password.');
        return;
      }

      const safeProfile = {
        ...profile,
        fullName: profile.fullName || getNameFromEmail(profile.email),
        phone: profile.phone || '',
        gender: profile.gender || '',
        organization: profile.organization || '',
        department: profile.department || '',
        position: profile.position || '',
        license: profile.license || ''
      };

      storeSession(safeProfile);
      goToDashboard(safeProfile);
    } catch (error) {
      showError(error);
    }
  });
}


/* ADMIN SIGN IN */
const adminSignInForm = document.getElementById('adminSignInForm');

if (adminSignInForm) {
  adminSignInForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value;

    if (!email || !password) {
      alert('Please enter your admin email and password.');
      return;
    }

    const defaultAdmin = {
      userId: 'ADM0001',
      fullName: 'Echozy Admin',
      email: 'admin@echozy.com',
      password: 'admin123',
      role: 'admin',
      staffId: 'ADM0001'
    };

    if (
      email.toLowerCase() !== defaultAdmin.email.toLowerCase() ||
      password !== defaultAdmin.password
    ) {
      alert('Invalid admin email or password.');
      return;
    }

    storeSession(defaultAdmin);

    window.location.href = '../admin/admin-dashboard.html';
  });
}