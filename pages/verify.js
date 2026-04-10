import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../ Footer';

export default function Verify() {
  const [hash, setHash] = useState('');
  const [result, setResult] = useState(null);

  const verify = async () => {
    if (!hash) return;
    const res = await fetch('/api/registry?action=verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_hash: hash })
    });
    setResult(await res.json());
  };

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold">Verify an AI Output Receipt</h1>
        <p className="mt-2 text-gray-500">Paste the request hash (64 hex characters) returned by the attestation API.</p>
        <div className="mt-8 flex gap-2">
          <input type="text" value={hash} onChange={e => setHash(e.target.value)} className="flex-1 p-2 border rounded dark:bg-black font-mono" placeholder="e.g. 221acfeb028204b9565adf8ef233b883..." />
          <button onClick={verify} className="bg-green-600 text-white px-6 py-2 rounded">Verify</button>
        </div>
        {result && (
          <div className="mt-8 bg-gray-100 dark:bg-gray-900 p-4 rounded">
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
