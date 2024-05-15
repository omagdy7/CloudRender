import pika
import json
import boto3
import cv2
import numpy as np
import tempfile
import os
import base64
import hashlib
import logging
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

s3 = boto3.client('s3')
BUCKET_NAME_PROCESSED = "processed-images-allowing-griffon"

def hash_image(image_data):
    return hashlib.sha256(image_data).hexdigest()

def process_image(part_data, operation):
    try:
        nparr = np.frombuffer(part_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.error("Failed to decode image data.")
            return None

        if operation == 'edge_detection':
            processed_img = cv2.Canny(img, 100, 200)
        elif operation == 'color_inversion':
            processed_img = cv2.bitwise_not(img)
        elif operation == 'grayscale':
            processed_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        elif operation == 'blur':
            processed_img = cv2.GaussianBlur(img, (15, 15), 0)
        elif operation == 'sharpen':
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            processed_img = cv2.filter2D(img, -1, kernel)
        elif operation == 'brightness_increase':
            processed_img = cv2.convertScaleAbs(img, alpha=1.1, beta=30)
        elif operation == 'contrast_increase':
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            l = cv2.equalizeHist(l)
            lab = cv2.merge((l, a, b))
            processed_img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        elif operation == "sharpening":
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            result = cv2.filter2D(image, -1, kernel)
        else:
            logger.error(f"Unknown operation: {operation}")
            return None

        unique_id = uuid.uuid4()
        output_path = os.path.join(tempfile.gettempdir(), f'processed_image_part_{unique_id}.jpg')
        success = cv2.imwrite(output_path, processed_img)

        if not success:
            logger.error("Failed to write processed image to file.")
            return None

        return output_path
    except Exception as e:
        logger.exception("Exception occurred during image processing.")
        return None

def compute_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.digest()

def callback(ch, method, properties, body):
    task = json.loads(body)
    part_data = base64.b64decode(task['part_data'])
    filename = task['filename']
    part_num = task['part_num']
    operation = task['operation']
    callback_queue = task['callback_queue']

    processed_part_path = process_image(part_data, operation)

    if processed_part_path is None or not os.path.exists(processed_part_path):
        logger.error(f"Processed file {processed_part_path} does not exist.")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    try:
        processed_filename = f"{filename}_part_{part_num}"
        with open(processed_part_path, "rb") as processed_part_data:
            file_content = processed_part_data.read()

        md5_hash = compute_md5(processed_part_path)
        base64_md5_hash = base64.b64encode(md5_hash).decode('utf-8')

        s3.put_object(Bucket=BUCKET_NAME_PROCESSED, Key=processed_filename, Body=file_content, ContentType="image/jpg", ContentMD5=base64_md5_hash)
        logger.info(f"Uploaded {processed_filename} to S3 bucket {BUCKET_NAME_PROCESSED}")

        if os.path.exists(processed_part_path):
            os.remove(processed_part_path)
            logger.info(f"Removed processed file {processed_part_path}")

        # Notify completion
        connection = pika.BlockingConnection(pika.ConnectionParameters('<rabbitmq-public-ip'))
        channel = connection.channel()
        channel.basic_publish(exchange='', routing_key=callback_queue, body='Completed')
        connection.close()
        logger.info("Notification sent to callback queue.")

    except Exception as e:
        logger.exception("Exception occurred during S3 upload or notification.")

    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_worker():
    connection = pika.BlockingConnection(pika.ConnectionParameters('<rabbitmq-public-ip'))
    channel = connection.channel()
    channel.queue_declare(queue='image_tasks')
    channel.basic_consume(queue='image_tasks', on_message_callback=callback)
    channel.start_consuming()

if __name__ == '__main__':
    start_worker()
