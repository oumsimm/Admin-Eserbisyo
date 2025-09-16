export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600 text-lg">Loading E-SERBISYO Admin...</p>
      </div>
    </div>
  );
}
