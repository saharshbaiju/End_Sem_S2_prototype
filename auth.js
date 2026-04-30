// auth.js
const API_URL = '/api';
let isSignupMode = false;

function parseStoredCredentials() {
    try {
        return JSON.parse(localStorage.getItem('authCredentials'));
    } catch {
        return null;
    }
}

function replaceLocalData(appData = {}) {
    const creds = localStorage.getItem('authCredentials');
    localStorage.clear();

    if (creds) {
        localStorage.setItem('authCredentials', creds);
    }

    if (appData && typeof appData === 'object') {
        Object.entries(appData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const creds = parseStoredCredentials();
    if (creds?.username && creds?.password) {
        // Automatically hide auth overlay if we have creds
        document.getElementById('auth-overlay').style.display = 'none';
    } else {
        localStorage.removeItem('authCredentials');
        // Stop main content interactions if not logged in
        document.body.style.overflow = 'hidden';
    }
});

function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const errorMsg = document.getElementById('auth-error');

    errorMsg.style.display = 'none';

    if (isSignupMode) {
        title.innerText = '📝 Sign Up';
        submitBtn.innerText = 'Create Account';
        toggleBtn.innerText = 'Already have an account? Login';
    } else {
        title.innerText = '🔒 Login';
        submitBtn.innerText = 'Login';
        toggleBtn.innerText = 'Sign up instead';
    }
}

async function handleAuth() {
    const usernameInput = document.getElementById('auth-username').value;
    const passwordInput = document.getElementById('auth-password').value;
    const errorMsg = document.getElementById('auth-error');

    if (!usernameInput || !passwordInput) {
        errorMsg.innerText = 'Please enter both username and password.';
        errorMsg.style.display = 'block';
        return;
    }
    
    // Simple client side hashing for extra security before sending
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const endpoint = isSignupMode ? '/signup' : '/login';
    const payload = { username: usernameInput, password: hashedPassword };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            errorMsg.innerText = result.error || 'Authentication failed.';
            errorMsg.style.display = 'block';
            return;
        }

        // Store credentials to persist session and sync capability
        localStorage.setItem('authCredentials', JSON.stringify(payload));
        
        if (!isSignupMode) {
            loadFromCloud(result.data || {});
        } else {
            replaceLocalData({});
            unlockApp();
        }
    } catch (error) {
        errorMsg.innerText = 'Server error. Please ensure backend is running.';
        errorMsg.style.display = 'block';
        console.error('Auth Error:', error);
    }
}

function unlockApp() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    // Let script.js re-render if it needed local variables that are now populated
    if (typeof renderTasks === 'function') {
        // Need to reload tasks from localStorage again
        const defaultTasks = [
            { id: 1, name: "Discrete Mathematics - Class Test", date: "2026-05-04", subject: "subj-math", completed: false },
            { id: 2, name: "Glimpses of Glorious India - MaOm", date: "2026-05-06", subject: "subj-india", completed: false },
            { id: 3, name: "GGI - Rough Book Submission", date: "2026-05-07", subject: "subj-india", completed: false },
            { id: 4, name: "Linear Algebra - Class Test", date: "2026-05-11", subject: "subj-linear", completed: false }
        ];
        
        let loadedTasks = null;
        try {
            loadedTasks = JSON.parse(localStorage.getItem('studyHubTasks'));
        } catch {
            loadedTasks = null;
        }
        if (loadedTasks) {
           tasks = loadedTasks;
        } else {
           tasks = defaultTasks;
        }
        renderTasks();
    }
    window.location.reload(); // Hard reload is safer to restore all listeners
}

function loadFromCloud(cloudData) {
    replaceLocalData(cloudData);
    unlockApp();
}

async function syncToCloud() {
    const credentials = parseStoredCredentials();
    if (!credentials?.username || !credentials?.password) return;

    const dataObj = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== 'authCredentials') {
            dataObj[key] = localStorage.getItem(key);
        }
    }

    try {
        await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...credentials, data: dataObj })
        });
        console.log('Data synced to cloud successfully.');
    } catch(e) {
        console.error('Cloud Sync failed', e);
    }
}

// Monkey patch localStorage.setItem to auto-sync to cloud securely
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key !== 'authCredentials') {
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => {
            syncToCloud();
        }, 1500); // 1.5s debounce to prevent API spam
    }
};

// Also patch removeItem and clear just in case, though app rarely uses it
const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    if (key !== 'authCredentials') {
        clearTimeout(window.syncTimeout);
        window.syncTimeout = setTimeout(() => syncToCloud(), 1500);
    }
};

function handleLogout() {
    if (confirm("Are you sure you want to logout? Current changes will be synced.")) {
        // Sync one last time to be safe
        syncToCloud().then(() => {
            localStorage.clear();
            window.location.reload();
        });
    }
}
