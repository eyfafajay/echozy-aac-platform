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

/* SUPABASE SETUP */
const SUPABASE_URL = 'https://drvmfnlaxkcqbwoqjefu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4ugmgc1ktCaLEmwB1ttnbA_XjOCtqDm';

if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase is not initialized. Please add the CDN script and project keys.');
}

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
    : null;

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

function storeSession(profile) {
  localStorage.setItem(
    'echozySession',
    JSON.stringify({
      userId: profile.userId || profile.id || '',
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

  if (role === 'admin') {
    window.location.href = '../admin/admin-dashboard.html';
    return;
  }

  const query = new URLSearchParams({
    role,
    userId: profile.userId || profile.id || '',
    name: fullName,
    email: profile.email
  }).toString();

  window.location.href = `../main/dashboard.html?${query}`;
}

async function getCurrentUserProfile() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available.');
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No authenticated user found.');
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  return {
    id: user.id,
    userId: user.id,
    email: user.email || '',
    fullName: profile.full_name || getNameFromEmail(user.email || ''),
    role: profile.role || 'caregiver',
    staffId: profile.license || '',
    phone: profile.phone || '',
    gender: profile.gender || '',
    organization: profile.organization || '',
    department: profile.department || '',
    position: profile.position || '',
    license: profile.license || ''
  };
}

async function signUpUser({
  fullName,
  email,
  password,
  role,
  phone = null,
  gender = null,
  organization = null,
  department = null,
  position = null,
  license = null
}) {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        phone,
        gender,
        organization,
        department,
        position,
        license
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

async function signInUser(email, password) {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available.');
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

/* CAREGIVER SIGN UP */
const caregiverSignUpForm = document.getElementById('caregiverSignUpForm');

if (caregiverSignUpForm) {
  caregiverSignUpForm.addEventListener('submit', async (event) => {
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

    try {
      await signUpUser({
        fullName,
        email,
        password,
        role: 'caregiver'
      });

      alert('Account created successfully. Please check your email if confirmation is required, then sign in.');
      window.location.href = 'caregiver-signin.html';
    } catch (error) {
      showError(error);
    }
  });
}

/* CAREGIVER SIGN IN */
const caregiverSignInForm = document.getElementById('caregiverSignInForm');

if (caregiverSignInForm) {
  caregiverSignInForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('caregiver-email')?.value.trim();
    const password = document.getElementById('caregiver-password')?.value;

    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      await signInUser(email, password);
      const profile = await getCurrentUserProfile();

      if (profile.role !== 'caregiver') {
        await supabaseClient.auth.signOut();
        alert('This account is not registered as a caregiver.');
        return;
      }

      storeSession(profile);
      goToDashboard(profile);
    } catch (error) {
      showError(error);
    }
  });
}

/* PROVIDER SIGN UP */
const providerSignUpForm = document.getElementById('providerSignUpForm');

if (providerSignUpForm) {
  providerSignUpForm.addEventListener('submit', async (event) => {
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

    try {
      await signUpUser({
        fullName,
        email,
        password,
        role: 'provider',
        license: staffId
      });

      alert('Account created successfully. Please check your email if confirmation is required, then sign in.');
      window.location.href = 'provider-signin.html';
    } catch (error) {
      showError(error);
    }
  });
}

/* PROVIDER SIGN IN */
const providerSignInForm = document.getElementById('providerSignInForm');

if (providerSignInForm) {
  providerSignInForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('provider-email')?.value.trim();
    const password = document.getElementById('provider-password')?.value;

    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    try {
      await signInUser(email, password);
      const profile = await getCurrentUserProfile();

      if (profile.role !== 'provider') {
        await supabaseClient.auth.signOut();
        alert('This account is not registered as a healthcare provider.');
        return;
      }

      storeSession(profile);
      goToDashboard(profile);
    } catch (error) {
      showError(error);
    }
  });
}

/* ADMIN SIGN IN */
const adminSignInForm = document.getElementById('adminSignInForm');

if (adminSignInForm) {
  adminSignInForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value;

    if (!email || !password) {
      alert('Please enter your admin email and password.');
      return;
    }

    try {
      await signInUser(email, password);
      const profile = await getCurrentUserProfile();

      if (profile.role !== 'admin') {
        await supabaseClient.auth.signOut();
        alert('This account is not registered as an admin.');
        return;
      }

      storeSession(profile);
      goToDashboard(profile);
    } catch (error) {
      showError(error);
    }
  });
}