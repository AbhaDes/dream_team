//Client for the Flask embedding microservice.
//Inside docker-compose the host is "embeddings"; running node directly it's localhost.
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
const secret = process.env.MY_SECRET_STRING;

//Composes the text that gets embedded from the participant's full profile.
//Must stay deterministic: the backfill script and the controllers both use it,
//and two profiles with the same fields should produce identical text.
const buildProfileDescription = ({ role, experience, availability, skills, bio }) => {
    const parts = [];
    if (role) parts.push(`Role: ${role}`);
    if (experience) parts.push(`Experience level: ${experience}`);
    if (availability) parts.push(`Availability: ${availability}`);
    const skillList = Array.isArray(skills) ? skills.join(', ') : skills;
    if (skillList) parts.push(`Skills: ${skillList}`);
    if (bio && bio.trim()) parts.push(`Bio: ${bio.trim()}`);
    return parts.join('. ');
};

//Returns the embedding for a participant profile as a pgvector-compatible
//string ('[0.1,0.2,...]'), or null if the service is down/errors —
//profile writes must succeed without it.
const getProfileEmbedding = async (profile) => {
    const description = buildProfileDescription(profile);
    if (!description) {
        return null;
    }
    try {
        const response = await fetch(`${EMBEDDING_SERVICE_URL}/api/embed`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Internal-Secret' : secret
            },
            body: JSON.stringify({ description }),
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) {
            console.error('Embedding service returned', response.status);
            return null;
        }
        const data = await response.json();
        return JSON.stringify(data.embedding);
    } catch (error) {
        console.error('Embedding service unavailable:', error.message);
        return null;
    }
};

module.exports = { getProfileEmbedding, buildProfileDescription };
