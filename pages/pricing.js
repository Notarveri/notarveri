import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Pricing() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-center">Simple, Transparent Pricing</h1>
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="border p-8 rounded-xl">
            <h2 className="text-2xl font-bold">Standard</h2>
            <div className="text-4xl font-mono mt-4">$0</div>
            <div className="text-gray-500">Forever free</div>
            <ul className="mt-6 space-y-2">
              <li>✓ 1,000 receipts / month</li>
              <li>✓ Unlimited verification</li>
              <li>✓ Open source verifier</li>
              <li>✓ Community support</li>
            </ul>
            <a href="/api/auth/signup" className="mt-8 inline-block w-full text-center bg-green-600 text-white py-2 rounded">Get Started</a>
          </div>
          <div className="border-2 border-green-600 p-8 rounded-xl">
            <h2 className="text-2xl font-bold">Premium</h2>
            <div className="text-4xl font-mono mt-4">Custom</div>
            <div className="text-gray-500">Starting at $5k/month</div>
            <ul className="mt-6 space-y-2">
              <li>✓ Unlimited receipts</li>
              <li>✓ 99.99% SLA</li>
              <li>✓ 24/7 dedicated support</li>
              <li>✓ On‑prem / GovCloud deployment</li>
              <li>✓ Compliance reports</li>
            </ul>
            <a href="/contact" className="mt-8 inline-block w-full text-center border border-green-600 text-green-600 py-2 rounded">Contact Sales</a>
          </div>
        </div>
        <div className="mt-16 text-center text-gray-500">All plans include EU AI Act ready audit trail and public Merkle proofs.</div>
      </main>
      <Footer />
    </>
  );
}
