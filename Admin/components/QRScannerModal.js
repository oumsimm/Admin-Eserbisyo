import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { 
  X, 
  Camera, 
  AlertCircle,
  CheckCircle,
  Scan,
  Award,
  Square,
  CheckSquare
} from 'lucide-react';

const QRScannerModal = ({ 
  isOpen, 
  onClose, 
  onScanSuccess, 
  completedEvents, 
  selectedEvents, 
  onToggleEvent, 
  isProcessing 
}) => {
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [manualQR, setManualQR] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setScanError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasCamera(true);
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startScanning();
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasCamera(false);
      setScanError('Camera access denied or not available. Please use manual input.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    setIsScanning(true);
    scanIntervalRef.current = setInterval(scanQRCode, 500);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR code detection (this is a basic implementation)
      // In a real application, you'd use a library like jsQR
      try {
        const qrData = detectQRCode(imageData);
        if (qrData) {
          handleScanResult(qrData);
        }
      } catch (error) {
        console.error('QR scan error:', error);
      }
    }
  };

  const detectQRCode = (imageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      return code ? code.data : null;
    } catch (error) {
      console.error('QR detection error:', error);
      return null;
    }
  };

  const handleScanResult = (qrData) => {
    if (selectedEvents.size === 0) {
      setScanError('Please select at least one completed event first');
      return;
    }

    setScanSuccess('QR Code detected! Processing...');
    stopCamera();
    
    setTimeout(() => {
      onScanSuccess(qrData);
    }, 1000);
  };

  const handleManualSubmit = () => {
    if (!manualQR.trim()) {
      setScanError('Please enter a QR code value');
      return;
    }

    if (selectedEvents.size === 0) {
      setScanError('Please select at least one completed event first');
      return;
    }

    setScanError('');
    setScanSuccess('Processing QR code...');
    
    setTimeout(() => {
      onScanSuccess(manualQR.trim());
    }, 1000);
  };

  const generateTestQR = () => {
    const testUserId = `test_user_${Date.now()}`;
    const testQRData = JSON.stringify({
      userId: testUserId,
      userName: 'Test User',
      timestamp: Date.now()
    });
    setManualQR(testQRData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Scan className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">QR Code Scanner</h2>
              <p className="text-sm text-gray-600">Scan QR codes to award points for completed events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Event Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Select Completed Events ({selectedEvents.size} selected)
            </h3>
            
            {completedEvents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No completed events available for point awarding</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                {completedEvents.map(event => (
                  <label key={event.id} className="flex items-center space-x-3 p-2 bg-white rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event.id)}
                      onChange={() => onToggleEvent(event.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{event.image}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              <Award className="h-3 w-3 mr-1" />
                              {event.points || 10} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Scanner Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera Scanner */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Camera Scanner
              </h3>
              
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {hasCamera ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-64 border-2 border-purple-500 border-dashed rounded-lg">
                        <div className="w-full h-full flex items-center justify-center">
                          {isScanning && (
                            <div className="text-white text-center">
                              <Scan className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                              <p className="text-sm">Scanning...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
                      <p className="text-sm">Camera not available</p>
                      <p className="text-xs text-gray-400">Use manual input below</p>
                    </div>
                  </div>
                )}
              </div>

              {hasCamera && (
                <div className="flex space-x-2">
                  <button
                    onClick={isScanning ? () => {
                      stopCamera();
                      startCamera();
                    } : startScanning}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isScanning ? 'Restart Scanner' : 'Start Scanning'}
                  </button>
                </div>
              )}
            </div>

            {/* Manual Input */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Manual QR Input</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Code Data
                  </label>
                  <textarea
                    value={manualQR}
                    onChange={(e) => setManualQR(e.target.value)}
                    placeholder="Paste or type QR code content here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={4}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={generateTestQR}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    Generate Test QR
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualQR.trim() || selectedEvents.size === 0 || isProcessing}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Process QR Code'}
                  </button>
                </div>
              </div>

              {/* Sample QR Format */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Expected QR Format:</h4>
                <pre className="text-xs text-blue-800 bg-blue-100 p-2 rounded font-mono overflow-x-auto">
{`{
  "userId": "user123",
  "userName": "John Doe",
  "timestamp": 1234567890
}`}
                </pre>
                <p className="text-xs text-blue-700 mt-2">
                  Or simple format: just the user ID as plain text
                </p>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {scanError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Scan Error</h4>
                  <p className="text-sm text-red-700">{scanError}</p>
                </div>
              </div>
            </div>
          )}

          {scanSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">Success</h4>
                  <p className="text-sm text-green-700">{scanSuccess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Select one or more completed events from the list above</li>
              <li>Use the camera scanner or paste QR code data manually</li>
              <li>The system will verify the user and check for duplicate awards</li>
              <li>Points will be automatically awarded for selected events</li>
              <li>Users will receive notifications about their point awards</li>
            </ol>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;