from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()


#takes a list of sentences, returns a list of embedding vectors (same order)
def get_embeddings(sentences, model="text-embedding-3-small"):
    response = client.embeddings.create(
        input=sentences,
        model=model
    )
    return [item.embedding for item in response.data]







