// Group Name: ERA
// Group Members: Abha Deshpande, Emily Kim, Roemie Osias
// Github: https://github.com/CSC317-F25/group-project-autuvmn

// File: script.js

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
            alert(data.error);
            return;
        }

        alert('Logged in successfully!');
        window.location.href = '/dashboard.html'; // or wherever you want
    } catch (err) {
        console.error('Login error:', err);
        alert('An error occurred while logging in.');
    }
});

// form.js
document.getElementById("careerForm").addEventListener("submit", function(e){
    e.prevenDefault();
    alert("Form submitted!");
    this.reset();
});