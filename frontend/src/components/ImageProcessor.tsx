import React, { useState } from 'react';
import { SelectValue, SelectTrigger, SelectItem, SelectContent, Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BACK_END_URL = 'http://localhost:5000'
// const BACK_END_URL = '<link of kubernetes loadbalancer>';

type Operation = 'edge_detection' | 'color_inversion' | 'grayscale' | 'blur' | 'sharpen' | 'brightness_increase' | 'contrast_increase' | 'sharpening';

export default function Component() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('https://placehold.jp/1000x1000.png');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [operation, setOperation] = useState<Operation>('edge_detection');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const processImage = async (): Promise<void> => {
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
        console.log(data.processed_file);
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
    <div className="flex flex-col items-center justify-center h-screen w-full dark:bg-gray-950">
      <Select className="dark:bg-gray-800 dark:text-gray-50 mb-4" defaultValue="edge_detection" onValueChange={(value) => setOperation(value as Operation)}>
        <SelectTrigger className="w-64 dark:bg-gray-800 dark:text-gray-50">
          <SelectValue placeholder="Select Operation" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800 dark:text-gray-50">
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="edge_detection">Edge Detection</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="color_inversion">Color Inversion</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="grayscale">Grayscale</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="blur">Blur</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="sharpen">Sharpen</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="brightness_increase">Brightness Increase</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="contrast_increase">Contrast Increase</SelectItem>
          <SelectItem className="dark:hover:bg-gray-700 dark:hover:text-gray-50" value="sharpening">Sharpening</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-4 mb-4">
        <Button className="dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-50" size="lg" variant="outline" onClick={() => document.getElementById('fileInput')?.click()}>
          Upload Image
          <Input id="fileInput" className="hidden" type="file" onChange={handleFileChange} />
        </Button>
        <Button className="dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-50" size="lg" variant="outline" onClick={processImage}>
          Process Image
        </Button>
        <Button className="dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-50" size="lg" variant="outline" onClick={downloadImage}>
          Download Image
        </Button>
      </div>
      <div className="w-full max-w-2xl">
        <img alt="Processed Image" className="rounded-md" height={600} src={downloadUrl || filePreview} style={{ aspectRatio: "800/600", objectFit: "cover" }} width={800} />
      </div>
    </div>
  );
}
