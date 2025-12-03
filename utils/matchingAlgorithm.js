function getCompatibilityScore (user1, user2){
    //1. GET ROLE MATCH SCORE(45 POINTS)
    
    //-- initiate the score variable, this will be updated throughout the function
    let score = 0;
    const role1 = user1.role;
    const role2 = user2.role;
    //-- Calculate their compatibility score based on Complementary roles (40 points)
    //--BEST PAIRS AND MID PAIRS FOR ROLE MATCHING
    const compStrongPairs = [
        ["Frontend Developer", "Backend Developer"],  
        ["UI/UX Design", "Fullstack Developer"], 
        ["Fullstack Developer", "Product Manager"], 
    ];
    const compMidPairs = [
        ["Frontend Developer", "Fullstack Developer"], 
        ["UI/UX Designer", "Frontend Developer"], 
        ["Product Manager", "Frontend Developer"], 
        ["Backend Developer", "Fullstack Developer"]
    ]
    //-- Assign scores to different role matches
    if(checkPair(role1, role2, compStrongPairs)){
        score += 45;
    }else if(checkPair(role1, role2, compMidPairs)){
        score+=20;
    }
    //2. GET EXPERIENCE LEVEL MATCH SCORE (30 POINTS)
    //--Assign variables for different user levels
    const exp1 = user1.experience;
    const exp2 = user2.experience;
    //--STRONG AND MID PAIRS FOR EXPERIENCE MATCH
    const expStrongPairs = [
        ["Advanced", "Advanced"], 
        ["Beginner", "Beginner"], 
        ["Intermediate", "Intermediate"]
    ];
    const expMidPairs = [
        ["Advanced", "Intermediate"], 
        ["Intermediate", "Beginner"], 
        ["Advanced", "Beginner"]
    ]
    //--Check pairs and update the score based on strength
    //--STRONG PAIRS -- 30 POINTS 
    //-- MID PAIRS -- 15 POINTS
    //--OTHER PAIRS -- NO SCORE
    if(checkPair(exp1, exp2, expStrongPairs)){
        score+= 30;
    }else if(checkPair(exp1, exp2, expMidPairs)){
        score+= 15;
    }
    //3. GET AVAILABILITY MATCH SCORE (25 POINTS)
    //First check commitment for each user and assign levels
    const avail1 = checkCommitment(user1.availability);
    const avail2 = checkCommitment(user2.availability);
    //After levels assigned, then check which level and update score accordingly
    //--SAME AVAILABILITY FULL POINTS
    //--FLEXIBLE GOES WITH ANYONE
    if(avail1 === avail2){
        score += 25;
    }else if(avail1 === 'flexible' || avail2 === 'flexible'){
        score += 25;
    }
    return score;
    

}

//For compatibility test
function checkPair(val1, val2, pairsArray ){
    return pairsArray.some(pair =>
    ((pair[0] === val1 && pair[1] === val2) || (pair[0] === val2 && pair[1] === val1))
    );
}

//check Commitment level for availability matching 
function checkCommitment(availability){
    
    if(availability === "Full Time (30+ hours)" || availability === "Most of the Time (20-30 hours)"){
        return "high";    
    }else if(availability === "Part Time (10-20 hours)"){
        return "medium";
    }else if(availability === "Limited (Less than 10 hours)"){
        return "low";
    }else{
        return "flexible";
    }
}
 module.exports = {getCompatibilityScore};