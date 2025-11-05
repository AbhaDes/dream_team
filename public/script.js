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

