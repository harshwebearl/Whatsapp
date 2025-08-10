// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = loginForm.identifier.value.trim();
        const password = loginForm.password.value;
        // Validate identifier: must be email or phone number
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^\d{10,15}$/;
        if (!emailPattern.test(identifier) && !phonePattern.test(identifier)) {
            alert('Please enter a valid email address or phone number.');
            return;
        }
        if (!password) {
            alert('Please enter your password.');
            return;
        }
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                
                // Store user info if provided
                if (data.user) {
                    localStorage.setItem('userInfo', JSON.stringify(data.user));
                }
                
                alert('Login successful! Welcome to the chat!');
                window.location.href = '/chat/chat.html';
            } else {
                alert(data.error || 'Login failed.');
            }
        } catch (err) {
            alert('Login error.');
        }
    });
}

// Handle registration form submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                alert('Registration successful! તમે હવે login કરીને chat join કરી શકો છો.');
                window.location.href = '/auth/login.html';
            } else {
                alert(data.error || 'Registration failed.');
            }
        } catch (err) {
            alert('Registration error.');
        }
    });
}

// Optional: Add logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/auth/login.html';
        });
    }
});
