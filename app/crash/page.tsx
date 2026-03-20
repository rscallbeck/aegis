import CrashBoard from '@/app/components/CrashBoard';

export default function CrashPage() {
  return (
    <div className="flex flex-col items-center p-4 md:p-8 text-white relative w-full animate-in fade-in duration-500">
      
      {/* Page Title */}
      <div className="w-full max-w-5xl mb-6 flex justify-start">
        <h2 className="text-2xl md:text-3xl font-black tracking-widest text-emerald-400 uppercase drop-shadow-md">
          CRASH
        </h2>
      </div>
      
      {/* The Game Engine */}
      <CrashBoard />
      
    </div>
  );
}
