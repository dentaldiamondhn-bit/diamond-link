'use client';

import React, { useRef, useState, useCallback } from 'react';
import Camera from 'react-camera-pro';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera as CameraIcon, RotateCw, Download, X, Check } from 'lucide-react';

interface DentalCameraProps {
  onCapture?: (imageData: string) => void;
  onRetake?: () => void;
  maxPhotos?: number;
  showControls?: boolean;
  className?: string;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: Date;
  notes?: string;
}

export const DentalCamera: React.FC<DentalCameraProps> = ({
  onCapture,
  onRetake,
  maxPhotos = 5,
  showControls = true,
  className = ''
}) => {
  const cameraRef = useRef<any>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);

  const handleCapture = useCallback(() => {
    // Simulate photo capture for demo purposes
    setIsCapturing(true);
    
    // Create a placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a placeholder image
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Dental Photo Placeholder', 400, 300);
      ctx.font = '16px Arial';
      ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 400, 350);
    }
    
    const photo = canvas.toDataURL('image/jpeg');
    
    const newPhoto: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl: photo,
      timestamp: new Date()
    };

    const updatedPhotos = [...photos, newPhoto];
    setPhotos(updatedPhotos.slice(-maxPhotos)); // Keep only last maxPhotos
    
    if (onCapture) {
      onCapture(photo);
    }
    
    setIsCapturing(false);
    setShowPreview(true);
    setSelectedPhoto(newPhoto);
  }, [photos, maxPhotos, onCapture]);

  const handleRetake = useCallback(() => {
    if (onRetake) {
      onRetake();
    }
    setShowPreview(false);
    setSelectedPhoto(null);
  }, [onRetake]);

  const handleRotateCamera = useCallback(() => {
    setFacingMode(prev => 
      prev === 'environment' 
        ? 'user' 
        : 'environment'
    );
  }, []);

  const handleDownload = useCallback((photo: CapturedPhoto) => {
    const link = document.createElement('a');
    link.download = `dental-photo-${photo.id}.jpg`;
    link.href = photo.dataUrl;
    link.click();
  }, []);

  const handleDeletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
      setShowPreview(false);
    }
  }, [selectedPhoto]);

  const handleSelectPhoto = useCallback((photo: CapturedPhoto) => {
    setSelectedPhoto(photo);
    setShowPreview(true);
  }, []);

  if (showPreview && selectedPhoto) {
    return (
      <div className={`fixed inset-0 bg-black z-50 flex items-center justify-center ${className}`}>
        <div className="relative max-w-4xl max-h-full p-4">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setShowPreview(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Photo Preview */}
          <img
            src={selectedPhoto.dataUrl}
            alt="Dental photo"
            className="max-w-full max-h-full object-contain rounded-lg"
          />

          {/* Photo Info */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">
                  {selectedPhoto.timestamp.toLocaleString()}
                </p>
                <p className="text-xs text-gray-300">
                  Photo {photos.indexOf(selectedPhoto) + 1} of {photos.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => handleDownload(selectedPhoto)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={handleRetake}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (onCapture) onCapture(selectedPhoto.dataUrl);
                    setShowPreview(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Use This
                </Button>
              </div>
            </div>

            {/* Photo Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSelectPhoto(photo)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                      selectedPhoto.id === photo.id 
                        ? 'border-blue-500' 
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera View */}
      <Card className="relative overflow-hidden bg-black">
        <div className="w-full h-96 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Camera Component</p>
            <p className="text-sm text-gray-400">Camera functionality requires proper setup</p>
          </div>
        </div>

        {/* Camera Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <p className="text-sm font-medium">Dental Camera</p>
                <p className="text-xs text-gray-300">
                  {photos.length} of {maxPhotos} photos taken
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={handleRotateCamera}
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={handleCapture}
                  disabled={isCapturing || photos.length >= maxPhotos}
                >
                  <CameraIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Counter Badge */}
        {photos.length > 0 && (
          <Badge className="absolute top-4 right-4 bg-blue-600">
            {photos.length}/{maxPhotos}
          </Badge>
        )}
      </Card>

      {/* Photo Thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-100 rounded-lg">
          {photos.map((photo) => (
            <div key={photo.id} className="relative flex-shrink-0 group">
              <button
                onClick={() => handleSelectPhoto(photo)}
                className="w-20 h-20 rounded border-2 overflow-hidden hover:border-blue-500 transition-colors"
              >
                <img
                  src={photo.dataUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </button>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeletePhoto(photo.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {photos.length === 0 && (
        <div className="text-center text-gray-500 space-y-2">
          <CameraIcon className="h-12 w-12 mx-auto" />
          <p className="text-sm">Position the dental area in the frame</p>
          <p className="text-xs">Tap the camera button to capture photos</p>
        </div>
      )}
    </div>
  );
};

export default DentalCamera;
