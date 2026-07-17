from flask import Flask, jsonify, request
import embed_test
import os

app = Flask(__name__)

#this just embeds the description

@app.route('/api/embed', methods=['POST'])
def embed_desc():
    print ("Flask POST endpoint hit")
    data = request.get_json(silent=True) or {}

    #in case the request is empty
    if not data.get("description"):
        return jsonify({"error": "Please enter a description"}), 400
    #when request not in json format
    if not data.is_json:
        return jsonify({"error" : "Please post in JSON format"}), 400
    
    #get the description
    response = data.get_json()
    description = response["description"]

    #return 400 if empty string sent
    if not description:
        return jsonify({"error" : "Please enter a description"}), 400
    
    
    print(repr(description), type(description))

    #use embed to create an embedding for that description 
    vector = embed_test.get_embeddings(description)

    #turn that vector into json 
    return jsonify(vector)

if __name__ == '__main__':
    app.run(debug=True, port=5001)