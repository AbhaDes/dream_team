from flask import Flask, jsonify, request
import embed_test
import os

app = Flask(__name__)

#this just embeds the description

@app.route('/api/embed', methods=['POST'])
def embed_desc():
    print ("Flask POST endpoint hit")
    if request.is_json:
        data = request.get_json()

    #in case the request is empty
    if not data.get("description"):
        return jsonify({"error": "Please enter a description"}), 400
    
    
    #get the description
    description = data["description"]

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