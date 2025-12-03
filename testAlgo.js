console.log("🔥 Test file is running!");
const { getCompatibilityScore } = require('./utils/matchingAlgorithm');

console.log("=== Testing Matching Algorithm ===\n");

// Test 1: Perfect Match
console.log("Test 1 - Perfect Match (Strong roles, same exp, same availability):");
const user1 = {
  role: "Frontend Developer",
  experience: "Intermediate",
  availability: "Full Time (30+ hours)"
};

const user2 = {
  role: "Backend Developer",
  experience: "Intermediate",
  availability: "Full Time (30+ hours)"
};

const score1 = getCompatibilityScore(user1, user2);
console.log("Score:", score1);
console.log("Expected: 95 (45 + 25 + 25)");
console.log("---\n");

// Test 2: Same Roles
console.log("Test 2 - Same Roles (No role points):");
const user3 = {
  role: "Frontend Developer",
  experience: "Advanced",
  availability: "Most of the Time (20-30 hours)"
};

const user4 = {
  role: "Frontend Developer",
  experience: "Advanced",
  availability: "Most of the Time (20-30 hours)"
};

const score2 = getCompatibilityScore(user3, user4);
console.log("Score:", score2);
console.log("Expected: 50 (0 + 25 + 25)");
console.log("---\n");

// Test 3: Add more tests...