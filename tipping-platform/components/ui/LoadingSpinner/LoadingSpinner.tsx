export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      <p className="text-white mt-4">Loading...</p>
    </div>
  );
}