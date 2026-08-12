import os
from flask import Flask, request, jsonify
from functools import wraps
import embeddings
import matchAlgo
import openai
from dotenv import load_dotenv



app = Flask(__name__)

load_dotenv()


#used by docker/deploy platforms to check the service is up
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


#this just embeds the description
@app.route('/api/embed', methods=['POST'])
def embed_desc():
    try:
        #this basically avoids a crash if the data is non-json, flask just assigns none to the variable
        data = request.get_json(silent=True)
        
        #check if the headers contain a secret key
        incoming_secret = request.headers.get("X-Internal-Secret")
        expected_secret = os.getenv("MY_SECRET_STRING")

        if not incoming_secret:
            return jsonify({"error" : "Unauthorized request"}), 401

        if incoming_secret!= expected_secret:
            return jsonify({"error" : "Unauthorized request"}), 401
        
        #safe extraction; if description missing no error (KeyError - meaning if there no key, error)
        description = data.get("description") if data else None

        #return 400 if empty string sent
        if not description or not description.strip():
            return jsonify({"error" : "Please enter a description"}), 400

        #cap input length so oversized text never reaches the paid API
        if len(description) > 2000:
            return jsonify({"error" : "Description too long (max 2000 characters)"}), 400


        #get the embedding (single-element batch, unwrap the one vector)
        vector = embeddings.get_embeddings([description])[0]

        vector_object = {
            "embedding" : vector,
            "model" : "text-embedding-3-small",
            "dimensions" : len(vector)
        }

        return jsonify(vector_object), 200
        
    except openai.OpenAIError:
        return jsonify({
            "error" : "Bad Gateway",
            "message" : "Failed to fetch data from the upstream service."
        }), 502


@app.route('/api/similarity', methods=['POST'])
def get_similarity():
    try:

        ##accepts two descriptions
        data = request.get_json(silent=True)

        #check if the headers contain a secret key
        incoming_secret = request.headers.get("X-Internal-Secret")
        expected_secret = os.getenv("MY_SECRET_STRING")
        
        if not incoming_secret:
            return jsonify({"error" : "Unauthorized request"}), 401
        
        if incoming_secret!= expected_secret:
            return jsonify({"error" : "Unauthorized request"}), 401

        #safely extract both fields 
        desc_1 = data.get("desc_1") if data else None
        desc_2 = data.get("desc_2") if data else None

        #Validate that both descriptions are present, not empty 
        if not desc_1 or not desc_1.strip():
            return jsonify({"error" : "missing or empty description 1"}), 400

        if not desc_2 or not desc_2.strip():
            return jsonify({"error" : "missing or empty description 2"}), 400

        #cap input length so oversized text never reaches the paid API
        if len(desc_1) > 2000 or len(desc_2) > 2000:
            return jsonify({"error" : "Description too long (max 2000 characters)"}), 400

        #embeds them both in one API call
        vec1, vec2 = embeddings.get_embeddings([desc_1, desc_2])

        #calculates the similarity between them 
        similarity = {
            "similarity" : float(matchAlgo.cosine_similarity(vec1, vec2))
        }
        
        #return the similarity between the two vectors
        return jsonify(similarity), 200

    except openai.OpenAIError:
        return jsonify({
            "error" : "Bad Gateway",
            "message" : "Failed to fetch data from the upstream service"
        }), 502



if __name__ == '__main__':
    app.run(debug=True, port=5001)