import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Docs() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold">Documentation</h1>
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold">Quickstart</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto mt-2">
{`# Get your API key from the dashboard
export API_KEY=your_key_here

# Attest an AI output
curl -X POST https://api.notarveri.com/api/attest \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"What is 2+2?","output":"4","model":"gpt-4"}'`}
            </pre>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Register a receipt</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto">
{`curl -X POST https://api.notarveri.com/api/registry?action=register \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"request_hash":"...","response_hash":"...","model":"...","timestamp":...,"signature":"..."}'`}
            </pre>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
