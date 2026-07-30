//One-off script: embed the profiles of participants who joined before the
//embedding integration existed (profile_embedding null).
//Run with the Flask service up:  node scripts/backfillEmbeddings.js
const pool = require('../config/database');
const { getProfileEmbedding } = require('../utils/embeddingService');

const backfill = async () => {
    const result = await pool.query(
        'SELECT participant_id, role, experience, availability, skills, bio FROM event_participants WHERE profile_embedding IS NULL'
    );
    console.log(`${result.rows.length} participants need embeddings`);

    let updated = 0;
    for (const row of result.rows) {
        const embedding = await getProfileEmbedding(row);
        if (!embedding) {
            console.error(`Skipped ${row.participant_id} (embedding service failed)`);
            continue;
        }
        await pool.query(
            'UPDATE event_participants SET profile_embedding = $1 WHERE participant_id = $2',
            [embedding, row.participant_id]
        );
        updated++;
    }
    console.log(`Done: ${updated} updated, ${result.rows.length - updated} skipped`);
    await pool.end();
};

backfill();
