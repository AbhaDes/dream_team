

import openai
import pytest

import embeddings


#stand-in for a real embedding: 1536 numbers, same length text-embedding-3-small returns
FAKE_VECTOR = [0.1] * 1536


def fake_get_embeddings(sentences, model=None):
    #same shape as the real function: one vector per sentence, in order
    return [FAKE_VECTOR for _ in sentences]


#1. HEALTH
#--used by docker and the deploy platform to check the service is alive
def test_health_returns_ok(client):
    res = client.get('/health')

    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


#2. EMBED -- validation paths
#--these return before the OpenAI call, so they need no fake at all
def test_embed_returns_400_when_description_is_missing(client):
    res = client.post('/api/embed', json={})

    assert res.status_code == 400
    assert res.get_json() == {"error": "Please enter a description"}


def test_embed_returns_400_when_description_is_blank(client):
    res = client.post('/api/embed', json={"description": "   "})

    assert res.status_code == 400
    assert res.get_json() == {"error": "Please enter a description"}


def test_embed_returns_400_when_body_is_not_json(client):
    res = client.post('/api/embed', data='not json at all')

    assert res.status_code == 400
    assert res.get_json() == {"error": "Please enter a description"}


def test_embed_returns_400_when_description_is_too_long(client):
    res = client.post('/api/embed', json={"description": "a" * 2500})

    assert res.status_code == 400
    assert res.get_json() == {"error": "Description too long (max 2000 characters)"}


#this is the test that proves bad input never costs money: the fake records every
#call it receives, and after two rejected requests the record is still empty
def test_embed_never_reaches_openai_for_invalid_input(client, monkeypatch):
    calls = []

    def spy(sentences, model=None):
        calls.append(sentences)
        return [FAKE_VECTOR for _ in sentences]

    monkeypatch.setattr(embeddings, "get_embeddings", spy)

    client.post('/api/embed', json={})
    client.post('/api/embed', json={"description": "   "})

    assert calls == []


#3. EMBED -- happy path and upstream failure
def test_embed_returns_200_with_the_vector(client, monkeypatch):
    monkeypatch.setattr(embeddings, "get_embeddings", fake_get_embeddings)

    res = client.post('/api/embed', json={"description": "A backend developer who loves python"})

    assert res.status_code == 200
    body = res.get_json()
    assert body["model"] == "text-embedding-3-small"
    assert body["dimensions"] == 1536
    assert len(body["embedding"]) == 1536


def test_embed_returns_502_when_openai_fails(client, monkeypatch):
    #the fake raises instead of returning, which is how a real outage looks to us
    def openai_is_down(sentences, model=None):
        raise openai.OpenAIError("simulated outage")

    monkeypatch.setattr(embeddings, "get_embeddings", openai_is_down)

    res = client.post('/api/embed', json={"description": "A backend developer who loves python"})

    assert res.status_code == 502
    assert res.get_json()["error"] == "Bad Gateway"


#4. SIMILARITY -- validation paths
def test_similarity_returns_400_when_first_description_is_missing(client):
    res = client.post('/api/similarity', json={"desc_2": "A frontend developer"})

    assert res.status_code == 400
    assert res.get_json() == {"error": "missing or empty description 1"}


def test_similarity_returns_400_when_second_description_is_missing(client):
    res = client.post('/api/similarity', json={"desc_1": "A backend developer"})

    assert res.status_code == 400
    assert res.get_json() == {"error": "missing or empty description 2"}


#5. SIMILARITY -- the maths
#--only the OpenAI call is faked, so cosine_similarity itself is really being tested
def test_similarity_returns_1_for_identical_vectors(client, monkeypatch):
    monkeypatch.setattr(embeddings, "get_embeddings", fake_get_embeddings)

    res = client.post('/api/similarity', json={
        "desc_1": "A backend developer who loves python",
        "desc_2": "A backend developer who loves python"
    })

    assert res.status_code == 201
    assert res.get_json()["similarity"] == pytest.approx(1.0)


def test_similarity_returns_0_for_unrelated_vectors(client, monkeypatch):
    #two vectors at right angles: no overlap at all, so cosine similarity is 0
    vec_a = [1.0] + [0.0] * 1535
    vec_b = [0.0, 1.0] + [0.0] * 1534
    monkeypatch.setattr(embeddings, "get_embeddings", lambda sentences, model=None: [vec_a, vec_b])

    res = client.post('/api/similarity', json={
        "desc_1": "A backend developer who loves python",
        "desc_2": "A product manager who loves to plan products"
    })

    assert res.status_code == 200
    assert res.get_json()["similarity"] == pytest.approx(0.0)


def test_similarity_returns_502_when_openai_fails(client, monkeypatch):
    def openai_is_down(sentences, model=None):
        raise openai.OpenAIError("simulated outage")

    monkeypatch.setattr(embeddings, "get_embeddings", openai_is_down)

    res = client.post('/api/similarity', json={
        "desc_1": "A backend developer",
        "desc_2": "A frontend developer"
    })

    assert res.status_code == 502
    assert res.get_json()["error"] == "Bad Gateway"
