interface HeaderProps {
  onHome: () => void;
}

export function Header({ onHome }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2.5 border-b-2 border-ink pb-3.5 mb-5">
      <button
        type="button"
        onClick={onHome}
        className="flex items-baseline gap-2.5 cursor-pointer bg-transparent border-0 p-0"
      >
        <span className="font-mono text-[13px] bg-ink text-paper px-1.5 py-0.5 tracking-wide">
          ▮▮
        </span>
        <h1 className="text-[22px] m-0 font-bold tracking-tight">Loopstation</h1>
      </button>
      <div className="font-mono text-[11px] text-muted uppercase tracking-wide">
        bookmark &amp; loop tool for practice
      </div>
    </header>
  );
}
