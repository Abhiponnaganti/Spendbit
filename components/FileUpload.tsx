'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button, Card, CardBody, Progress } from '@nextui-org/react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Transaction } from '@/lib/simple-transaction-parser';

interface FileUploadProps {
  onParsedTransactions: (transactions: Transaction[]) => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  transactions?: Transaction[];
}

export default function FileUpload({ onParsedTransactions }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);

    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      const response = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'success', 
              progress: 100,
              transactions: result.transactions
            }
          : f
      ));

      // Call the callback with the parsed transactions
      onParsedTransactions(result.transactions);

      toast.success(`Successfully parsed ${result.count} transactions from ${uploadFile.file.name}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      toast.error(`Failed to upload ${uploadFile.file.name}: ${errorMessage}`);
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const file of pendingFiles) {
      await uploadSingleFile(file);
    }

    setIsUploading(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default:
        return <FileText className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
        <CardBody className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
              ${isDragActive 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/20'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Bank Statements'}
            </h3>
            <p className="text-slate-400 mb-4">
              Drag & drop your files here, or click to browse
            </p>
            <div className="text-sm text-slate-500">
              <p>Supported formats: CSV, PDF, TXT, XLS, XLSX</p>
              <p>Maximum file size: 10MB each</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Files ({files.length})
                  </h3>
                  <div className="flex gap-2">
                    {files.some(f => f.status === 'pending') && (
                      <Button
                        size="sm"
                        color="primary"
                        onPress={uploadAllFiles}
                        isLoading={isUploading}
                        disabled={isUploading}
                      >
                        Upload All
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={clearAll}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {files.map((uploadFile) => (
                    <motion.div
                      key={uploadFile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/30"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(uploadFile.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {uploadFile.file.name}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-slate-400">
                            <span>{formatFileSize(uploadFile.file.size)}</span>
                            {uploadFile.status === 'success' && uploadFile.transactions && (
                              <span className="text-green-400">
                                {uploadFile.transactions.length} transactions parsed
                              </span>
                            )}
                            {uploadFile.status === 'error' && uploadFile.error && (
                              <span className="text-red-400">{uploadFile.error}</span>
                            )}
                          </div>
                          {uploadFile.status === 'uploading' && (
                            <Progress
                              value={uploadFile.progress}
                              className="mt-2"
                              color="primary"
                              size="sm"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {uploadFile.status === 'pending' && (
                          <Button
                            size="sm"
                            color="primary"
                            variant="ghost"
                            onPress={() => uploadSingleFile(uploadFile)}
                          >
                            Upload
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => removeFile(uploadFile.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
