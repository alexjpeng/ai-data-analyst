'use client';

import { useChat } from 'ai/react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiSend, FiUpload, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

interface UploadedFile extends File {
  sandboxId: string;
  datasetPath: string;
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { messages, input, handleInputChange, handleSubmit: handleChatSubmit } = useChat();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        const uploadedFile = Object.assign(file, {
          sandboxId: data.sandboxId,
          datasetPath: data.datasetPath,
        });
        
        setUploadedFiles(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    disabled: uploading,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) {
      alert('Please upload a CSV file first');
      return;
    }
    
    // Use the first uploaded file's sandbox information
    const file = uploadedFiles[0];
    await handleChatSubmit(e, {
      data: {
        sandboxId: file.sandboxId,
        datasetPath: file.datasetPath,
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-4 flex flex-col h-[90vh]">
        <h1 className="text-2xl font-bold text-center mb-4">AI Data Analyst</h1>
        
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto mb-2 text-2xl text-gray-400" />
          <p className="text-gray-500">
            {uploading ? 'Uploading...' : 
              isDragActive ? 'Drop your CSV files here' :
              'Drag & drop CSV files here, or click to select'}
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Uploaded Files:</h3>
            <ul className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remove file"
                  >
                    <FiX />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-auto mb-4 space-y-4 p-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <ReactMarkdown
                  className={`prose ${message.role === 'user' ? 'prose-invert' : ''} max-w-none`}
                  components={{
                    img: ({ node, ...props }) => (
                      <img {...props} className="max-w-full h-auto rounded-lg my-2" />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre {...props} className="bg-gray-800 text-gray-100 rounded-lg p-4 overflow-x-auto" />
                    ),
                    code: ({ node, ...props }) => (
                      <code {...props} className="bg-gray-200 rounded px-1" />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={uploadedFiles.length === 0 ? 'Upload a CSV file first...' : 'Ask about your data...'}
            className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploadedFiles.length === 0}
          />
          <button
            type="submit"
            disabled={uploadedFiles.length === 0}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend />
          </button>
        </form>
      </div>
    </main>
  );
} 