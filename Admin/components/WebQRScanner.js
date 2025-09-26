import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';

const WebQRScanner = ({ onScanSuccess, isScanning, onStartScanning, onStopScanning }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        
        // Start scanning after video loads
        videoRef.current.onloadedmetadata = () => {
          startQRDetection();
        };
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      onStopScanning();
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    scanIntervalRef.current = setInterval(async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            onScanSuccess(code.data);
          }
        } catch (error) {
          console.error('QR detection error:', error);
        }
      }
    }, 500); // Scan every 500ms
  };

  if (!isScanning) {
    return (
      <div className="text-center">
        <div className="bg-gray-100 rounded-lg p-12 mb-4">
          <div className="text-4xl mb-4">📷</div>
          <p className="text-gray-600 mb-4">
            Position the QR code within the camera frame
          </p>
          <button
            onClick={onStartScanning}
            className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mx-auto"
          >
            <span className="mr-2">📷</span>
            Start Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-64 object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-purple-400 rounded-lg w-48 h-48 relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
          </div>
        </div>
        
        {/* Scanning Animation */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="animate-pulse">
            <div className="text-purple-400 text-2xl">🔍</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onStopScanning}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Stop Scanning
        </button>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p>Point the camera at the user's QR code</p>
        <p className="text-xs mt-1">
          Make sure the QR code is clearly visible and well-lit
        </p>
      </div>
    </div>
  );
};

export default WebQRScanner;
