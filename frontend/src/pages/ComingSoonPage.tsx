export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-lg text-slate-500">{title}</p>
    </div>
  );
}
