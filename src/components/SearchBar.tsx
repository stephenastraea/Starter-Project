import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 350;

export function SearchBar({
  onSearch,
  disabled,
}: {
  onSearch: (query: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const lastFiredRef = useRef('');

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed === lastFiredRef.current) return;
    const timer = setTimeout(() => {
      lastFiredRef.current = trimmed;
      onSearch(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  return (
    <input
      className="search-bar"
      type="search"
      placeholder="Search for a restaurant or cuisine"
      value={text}
      onChange={(e) => setText(e.target.value.slice(0, 100))}
      disabled={disabled}
    />
  );
}
