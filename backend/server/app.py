import pika
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import tempfile
import os
import base64
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

s3 = boto3.client('s3')
BUCKET_NAME_ORIGINAL = "original-images-allowing-griffon"
BUCKET_NAME_PROCESSED = "processed-images-allowing-griffon"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

def split_image(image_data, num_parts):
    img = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
    height, width, _ = img.shape
    part_height = height // num_parts
    parts = []

    for i in range(num_parts):
        part_img = img[i * part_height: (i + 1) * part_height if i != num_parts - 1 else height, :, :]
        _, buffer = cv2.imencode('.png', part_img)
        part_data = buffer.tobytes()
        parts.append(part_data)

    return parts, width, height, part_height

def publish_task(part_data, filename, part_num, operation, callback_queue):
    connection = pika.BlockingConnection(pika.ConnectionParameters('<rabbit-mq-server-public-ip'))
    channel = connection.channel()
    channel.queue_declare(queue='image_tasks')

    task = {
        'part_data': base64.b64encode(part_data).decode('utf-8'),
        'filename': filename,
        'part_num': part_num,
        'operation': operation,
        'callback_queue': callback_queue
    }
    channel.basic_publish(exchange='', routing_key='image_tasks', body=json.dumps(task))
    connection.close()
    print(f"Published task for part {part_num}")

def merge_parts(filename, num_parts, width, height, part_height):
    merged_img = np.zeros((height, width, 3), dtype=np.uint8)

    for i in range(num_parts):
        part_key = f"{filename}_part_{i}"
        part_obj = s3.get_object(Bucket=BUCKET_NAME_PROCESSED, Key=part_key)
        part_data = part_obj['Body'].read()
        part_img = cv2.imdecode(np.frombuffer(part_data, np.uint8), cv2.IMREAD_COLOR)

        if part_img is None:
            print(f"Failed to decode part {i}")
            continue

        start_row = i * part_height
        end_row = (i + 1) * part_height if i != num_parts - 1 else height
        merged_img[start_row:end_row, :, :] = part_img

    merged_filename = f"processed_{filename}"
    _, buffer = cv2.imencode('.jpg', merged_img)
    merged_data = buffer.tobytes()

    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(merged_data)
        temp_file.seek(0)  # Ensure the file pointer is at the beginning
        s3.put_object(Bucket=BUCKET_NAME_PROCESSED, Key=merged_filename, Body=temp_file.read(), ContentType="image/jpg")
        os.remove(temp_file.name)

    return merged_filename


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['image']
    operation = request.form.get('operation', 'edge_detection')
    num_parts = int(request.form.get('num_parts', 8))  # Default to 4 parts

    if file and allowed_file(file.filename):
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        file.save(temp_file.name)

        with open(temp_file.name, "rb") as img_data:
            s3.put_object(Bucket=BUCKET_NAME_ORIGINAL, Key=file.filename, Body=img_data, ContentType="image/png")

        original_img_obj = s3.get_object(Bucket=BUCKET_NAME_ORIGINAL, Key=file.filename)
        original_img_data = original_img_obj['Body'].read()

        parts, width, height, part_height = split_image(original_img_data, num_parts)
        callback_queue = f"{file.filename}_callback"

        # Declare callback queue
        connection = pika.BlockingConnection(pika.ConnectionParameters('<rabbit-mq-server-public-ip'))
        channel = connection.channel()
        channel.queue_declare(queue=callback_queue)
        connection.close()

        for i, part_data in enumerate(parts):
            publish_task(part_data, file.filename, i, operation, callback_queue)

        os.remove(temp_file.name)

        # Wait for completion notifications
        def on_completion(ch, method, properties, body):
            nonlocal num_parts_processed
            num_parts_processed += 1
            print(f"Part {num_parts_processed} received")
            if num_parts_processed == num_parts:
                merged_filename = merge_parts(file.filename, num_parts, width, height, part_height)
                processed_file_url = f'https://{BUCKET_NAME_PROCESSED}.s3.amazonaws.com/{merged_filename}'
                ch.stop_consuming()
                response_queue.put(processed_file_url)

        import queue
        response_queue = queue.Queue()
        num_parts_processed = 0

        connection = pika.BlockingConnection(pika.ConnectionParameters('<rabbit-mq-server-public-ip'))
        channel = connection.channel()
        channel.basic_consume(queue=callback_queue, on_message_callback=on_completion, auto_ack=True)
        channel.start_consuming()

        processed_file_url = response_queue.get()
        return jsonify({'message': 'File processed and uploaded successfully', 'processed_file': processed_file_url}), 200
    else:
        return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
