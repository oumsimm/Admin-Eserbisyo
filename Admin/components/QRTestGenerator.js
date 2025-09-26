import React, { useState } from 'react';
import { 
  QrCode as QrCodeIcon, 
  Copy as CopyIcon, 
  Download as DownloadIcon,
  User as UserIcon,
  CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { generateSimpleUserQR, generateUserURLQR } from '../../utils/simpleQrUtils';

const QRTestGenerator = () => {
  const [testUser, setTestUser] = useState({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com'
  });
  const [qrData, setQrData] = useState('');
  const [qrType, setQrType] = useState('simple');

  const generateQR = () => {
    try {
      let qrValue;
      if (qrType === 'simple') {
        qrValue = generateUserURLQR(testUser.id);
      } else {
        qrValue = generateSimpleUserQR(testUser);
      }
      setQrData(qrValue);
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrData);
    alert('QR data copied to clipboard!');
  };

  const downloadQR = () => {
    const element = document.createElement('a');
    const file = new Blob([qrData], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'test-qr-code.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-6">
        <QrCodeIcon className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">QR Code Test Generator</h3>
      </div>

      <div className="space-y-4">
        {/* Test User Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={testUser.id}
              onChange={(e) => setTestUser(prev => ({ ...prev, id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={testUser.name}
              onChange={(e) => setTestUser(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={testUser.email}
              onChange={(e) => setTestUser(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* QR Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QR Code Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="simple"
                checked={qrType === 'simple'}
                onChange={(e) => setQrType(e.target.value)}
                className="mr-2"
              />
              Simple URL Format
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="json"
                checked={qrType === 'json'}
                onChange={(e) => setQrType(e.target.value)}
                className="mr-2"
              />
              JSON Format
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateQR}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          Generate Test QR Code
        </button>

        {/* Generated QR Data */}
        {qrData && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Generated QR Data:</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Copy to clipboard"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={downloadQR}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Download as file"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="bg-white p-3 rounded border text-sm font-mono break-all">
                {qrData}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to Test:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Copy the QR data above or download it as a file</li>
                    <li>Use an online QR code generator to create a visual QR code</li>
                    <li>Or use the manual entry option in the QR scanner</li>
                    <li>Test both mobile camera scanning and web camera scanning</li>
                    <li>Verify that the user ID is correctly extracted and processed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* QR Code Preview (if available) */}
            <div className="text-center">
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">QR Code Preview</p>
                <p className="text-sm text-gray-500">
                  Use an online QR generator to create a visual QR code with the data above
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRTestGenerator;
