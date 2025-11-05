document.getElementById("careerForm").addEventListener("submit", function(e){
    e.prevenDefault();
    alert("Form submitted!");
    this.reset();
});