//import the database pool 
const pool = require('../config/database');
//import bcrypt 
const bcrypt = require ('bcrypt');

//bcrypt.hash() for hash passwords 
//bcrypt.compare() to compare the passwords

const register = async (req, res)=>{
    //Get the data from req.body 
    const (username, email, password ) = req.body;
    //Validate 
    //Check the database if it already exists 
    //Hash password 
    //If doesn't exist, add the new user
    //Send successful response
}

module.exports = {register};