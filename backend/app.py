import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import cv2
import tempfile
import numpy as np

app = Flask(__name__)
CORS(app)

# Configure AWS S3
s3 = boto3.client('s3')
BUCKET_NAME_ORIGINAL = "original-images-rapid-macaw"
BUCKET_NAME_PROCESSED = "processed-images-rapid-macaw"

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['image']
    operation = request.form.get('operation', 'edge_detection')  # Default to edge detection
    if file and allowed_file(file.filename):
        # Save the file temporarily
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        file.save(temp_file.name)

        # Upload to S3 original bucket
        with open(temp_file.name, "rb") as img_data:
            s3.put_object(Bucket=BUCKET_NAME_ORIGINAL, Key=file.filename, Body=img_data, ContentType="image/png")

        # Fetch the image from the original bucket
        original_img_obj = s3.get_object(Bucket=BUCKET_NAME_ORIGINAL, Key=file.filename)
        original_img_data = original_img_obj['Body'].read()

        # Process the image
        processed_image_path = process_image(original_img_data, operation)

        # Upload processed image to S3 processed bucket
        processed_filename = f"processed_{file.filename}"
        with open(processed_image_path, "rb") as processed_img_data:
            s3.put_object(Bucket=BUCKET_NAME_PROCESSED, Key=processed_filename, Body=processed_img_data, ContentType="image/png")

        # Clean up temporary files
        os.remove(temp_file.name)
        os.remove(processed_image_path)

        processed_file_url = f'https://{BUCKET_NAME_PROCESSED}.s3.amazonaws.com/{processed_filename}'

        return jsonify({'message': 'File processed and uploaded successfully', 'processed_file': processed_file_url}), 200
    else:
        return jsonify({'error': 'Invalid file type'}), 400

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

def process_image(image_data, operation):
    # Convert image data to numpy array
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    processed_img = img

    if operation == 'edge_detection':
        processed_img = cv2.Canny(img, 100, 200)
    elif operation == 'color_inversion':
        processed_img = cv2.bitwise_not(img)

    # Save processed image to a temporary path
    output_path = os.path.join(tempfile.gettempdir(), f'processed_image.png')
    cv2.imwrite(output_path, processed_img)

    return output_path

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
