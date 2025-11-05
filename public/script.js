<!--
Group Name: ERA
Group Members: Abha Deshpande, Emily Kim, Roemie Osias
Github: https://github.com/CSC317-F25/group-project-autuvmn

File: script.js
-->

function togglePassword() {
    var passwordField = document.getElementById("password");
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }

    var passwordToggle = document.getElementById("toggle-password");

    if (passwordField.type === "password") {
        passwordToggle.innerText = "Show";
    } else {
        passwordToggle.innerText = "Hide";
    }
}
