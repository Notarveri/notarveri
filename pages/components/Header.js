import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDark = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const navItems = [
    { name: 'Registry', path: '/registry' },
    { name: 'Verify', path: '/verify' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Docs', path: '/docs' },
    { name: 'Status', path: '/status' },
  ];

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-mono font-bold tracking-tight">
              NotarVeri
            </Link>
            <nav className="hidden md:flex space-x-6">
              {navItems.map(item => (
                <Link key={item.path} href={item.path} className={`text-sm ${router.pathname === item.path ? 'text-green-600 dark:text-green-400 font-semibold' : 'hover:text-green-600'}`}>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={toggleDark} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <a href="https://github.com/notarveri/notarveri" target="_blank" className="hidden sm:inline text-sm">GitHub</a>
            <a href="/api/auth/signup" className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">Free API Key</a>
            <a href="/contact" className="border border-green-600 text-green-600 dark:text-green-400 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20">Enterprise</a>
          </div>
        </div>
      </div>
    </header>
  );
}
