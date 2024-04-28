import React, { useState } from 'react';

const BACK_END_URL = 'http://localhost:5000'

const ImageProcessor = (): JSX.Element => {
  const [file, setFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const processImage = async (operation: 'edge_detection' | 'color_inversion'): Promise<void> => {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('operation', operation);

    try {
      const response = await fetch(`${BACK_END_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setDownloadUrl(`${data.processed_file}`);
        console.log(data.processed_file)
        alert('File processed successfully!');
      } else {
        alert(data.error || 'Failed to process the file');
      }
    } catch (error) {
      alert('Error connecting to the server');
    }
  };

  const downloadImage = (): void => {
    if (!downloadUrl) {
      alert('No processed image available for download!');
      return;
    }
    window.open(downloadUrl);
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-md flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Image Processing</h2>
      <div className="mb-4">
        <label className="block mb-2">Upload an image</label>
        <input type="file" onChange={handleFileChange} className="mb-4" />
      </div>
      <div className="flex flex-row justify-between w-full mb-4">
        <button onClick={() => processImage('edge_detection')} className="bg-black text-white font-bold py-2 px-4 rounded w-full mr-2">
          Edge Detection
        </button>
        <button onClick={() => processImage('color_inversion')} className="bg-black text-white font-bold py-2 px-4 rounded w-full ml-2">
          Color Inversion
        </button>
      </div>
      <img className='border-8 border-red-50' src={downloadUrl == '' ? "https://placehold.co/600x400" : downloadUrl} />
      <button onClick={downloadImage} className="bg-black text-white font-bold py-2 px-4 rounded w-full">
        Download
      </button>
    </div>
  );
};

export default ImageProcessor;
