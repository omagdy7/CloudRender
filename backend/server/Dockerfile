# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install dependencies for OpenCV using apt-get
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 curl

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variable
ENV FLASK_APP=app.py

# Run app.py when the container launches
CMD ["python", "app.py"]

