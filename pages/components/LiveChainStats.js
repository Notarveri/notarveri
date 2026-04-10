import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(r => r.json());

export default function LiveChainStats() {
  const { data, error } = useSWR('/api/registry?action=chain', fetcher, { refreshInterval: 5000 });

  if (error) return <div className="text-red-500">Failed to load chain info</div>;
  if (!data) return <div className="animate-pulse">Loading chain stats...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div className="text-2xl font-mono">{data.chain_height}</div>
        <div className="text-xs uppercase tracking-wide">Blocks</div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div className="text-2xl font-mono truncate">{data.latest_block_hash?.slice(0, 16)}…</div>
        <div className="text-xs uppercase tracking-wide">Latest Block Hash</div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div className="text-2xl font-mono">{data.genesis ? 'Yes' : 'No'}</div>
        <div className="text-xs uppercase tracking-wide">Genesis Block</div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
        <div className="text-2xl font-mono">—</div>
        <div className="text-xs uppercase tracking-wide">Avg Block Time</div>
      </div>
    </div>
  );
}
