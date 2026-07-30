//Client for the Flask embedding microservice.
//Inside docker-compose the host is "embeddings"; running node directly it's localhost.
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';

//Returns the embedding for a bio as a pgvector-compatible string ('[0.1,0.2,...]'),
//or null if the service is down/errors — profile writes must succeed without it.
const getBioEmbedding = async (bio) => {
    if (!bio || !bio.trim()) {
        return null;
    }
    try {
        const response = await fetch(`${EMBEDDING_SERVICE_URL}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: bio }),
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

module.exports = { getBioEmbedding };
