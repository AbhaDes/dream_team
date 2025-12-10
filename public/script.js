// Group Name: ERA
// Group Members: Abha Deshpande, Emily Kim, Roemie Osias
// Github: https://github.com/CSC317-F25/group-project-autuvmn

// File: script.js

// Login Form Handler
document.getElementById('loginForm').addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailForm').value;
    const password = document.getElementById('passwordForm').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Login failed');
            return;
        }
        
        alert('Logged in successfully!');
        window.location.href = '/index.html';
    } catch (err) {
        console.error('Login error:', err);
        alert('An error occurred while logging in.');
    }
});

// Register Form Handler
document.getElementById('registerForm').addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('nameField').value;
    const email = document.getElementById('emailField').value;
    const password = document.getElementById('passwordField').value;
    const confirmPassword = document.getElementById('confirmPasswordField').value;
    
    // Check if passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Registration failed');
            return;
        }
        
        alert('Registered successfully!');
        window.location.href = '/index.html';
    } catch (err) {
        console.error('Registration error:', err);
        alert('An error occurred while registering.');
    }
});

// Join Event Form Handler
document.getElementById('joinEventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const eventCode = document.getElementById('eventCodeInput').value.trim();
    
    if (!eventCode) {
        alert('Please enter an event code');
        return;
    }
    
    console.log('Event code entered:', eventCode); // For debugging
    
    // Simple redirect to event dashboard
    window.location.href = 'event-dashboard.html';
});

// profileform.js
document.getElementById("careerForm").addEventListener("submit", function(e){
    e.prevenDefault();
    alert("Form submitted!");
    this.reset();
});