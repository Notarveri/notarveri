import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function Registry() {
  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const { data: chain, error: chainError } = useSWR('/api/registry?action=chain', fetcher, { refreshInterval: 10000 });

  const handleSearch = async () => {
    if (!searchHash) return;
    const res = await fetch(`/api/registry?action=verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_hash: searchHash })
    });
    const json = await res.json();
    setSearchResult(json);
  };

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">Registry Explorer</h1>
        <p className="text-gray-500 mt-2">Search receipts by request hash or browse live chain info.</p>

        <div className="mt-8 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-semibold">Chain Status</h2>
          {chain && (
            <pre className="mt-2 text-sm overflow-x-auto">{JSON.stringify(chain, null, 2)}</pre>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">Verify a Receipt</h2>
          <div className="flex mt-4 gap-2">
            <input type="text" value={searchHash} onChange={e => setSearchHash(e.target.value)} placeholder="request_hash (64 hex chars)" className="flex-1 p-2 border rounded dark:bg-black" />
            <button onClick={handleSearch} className="bg-green-600 text-white px-4 py-2 rounded">Verify</button>
          </div>
          {searchResult && (
            <pre className="mt-4 bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">{JSON.stringify(searchResult, null, 2)}</pre>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
