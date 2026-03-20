import MinesBoard from '@/app/components/MinesBoard';

export default function MinesPage() {
  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 bg-slate-950 text-white">
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-widest text-emerald-400">
          MINES
        </h1>
      </div>
      <MinesBoard />
    </div>
  );
}
