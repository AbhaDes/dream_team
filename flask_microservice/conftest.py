#Shared setup that pytest loads automatically before any test file runs.

import os
import sys

#embeddings.py builds an OpenAI() client the moment it is imported, and that
#raises if no key exists at all. Set a fake one first: it is never used, because
#every test replaces get_embeddings with a fake before calling an endpoint.
#load_dotenv() does not overwrite variables that are already set, so this also
#stops a real key in .env from being picked up during a test run.
os.environ.setdefault("OPENAI_API_KEY", "test-key-never-used")

#lets "import app" work no matter which folder pytest was started from
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from app import app as flask_app


@pytest.fixture
def client():
    #Flask's built-in fake browser: sends real requests to the app, no server needed
    flask_app.config.update(TESTING=True)
    return flask_app.test_client()
