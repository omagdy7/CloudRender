# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install dependencies for OpenCV using yum
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0

# Set the working directory
WORKDIR /worker

# Copy the current directory contents into the container at /app
COPY . /worker

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Run worker.py when the container launches
CMD ["python", "worker.py"]
