import React from 'react';

type ImageSidebarProps = {
  name: string;
  previews: string[];
  files: File[];
};

const ImageSidebar: React.FC<ImageSidebarProps> = ({ name, previews, files }) => {
  return (
    <div className="w-64 flex-shrink-0 overflow-y-auto border-l-2 border-gray-400 bg-blue-100 shadow-xl p-4">
      <h4 className="font-semibold text-lg text-blue-900 mb-4">{name}</h4>
      {previews.map((preview, index) => (
        <div key={index} className="mb-4">
          <p className="text-sm font-medium text-gray-800">{files[index].name}</p>
          <img src={preview} alt={files[index].name} style={{ width: '100%', height: 'auto' }} />
        </div>
      ))}
    </div>
  );
};

export default ImageSidebar;

