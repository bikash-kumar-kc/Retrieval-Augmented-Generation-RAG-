export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Assistant is typing"
      className="flex items-center gap-1 py-1"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-2 animate-bounce rounded-full bg-[#3b6d11]/60 motion-reduce:animate-pulse"
        />
      ))}
    </div>
  );
}
