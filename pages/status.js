import useSWR from 'swr';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function Status() {
  const { data, error } = useSWR('/api/registry?action=chain', fetcher, { refreshInterval: 30000 });

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">System Status</h1>
        <div className="mt-6 bg-gray-100 dark:bg-gray-900 p-6 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-semibold">All systems operational</span>
          </div>
          {data && (
            <div className="mt-4 space-y-2 text-sm">
              <p>Chain height: {data.chain_height}</p>
              <p>Latest block: {data.latest_block_hash}</p>
              <p>Last updated: {new Date().toISOString()}</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
