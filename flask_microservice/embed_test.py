from openai import OpenAI
from dotenv import load_dotenv
import matchAlgo

load_dotenv()
client = OpenAI()


def get_embeddings(sentence, model="text-embedding-3-small"):
    print("embed function hit")

    response = client.embeddings.create(
        input=[sentence],
        model=model
    )
    return response.data[0].embedding

if __name__ == '__main__':
    vector1 = get_embeddings("A backend developer who loves python")
    vector2 = get_embeddings("A frontend developer who loves react")
    vector3 = get_embeddings("A product manager who loves to plan products")

    print(matchAlgo.cosine_similarity(vector1, vector2))
    print(matchAlgo.cosine_similarity(vector1, vector3))







