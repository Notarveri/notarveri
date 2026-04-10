import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LiveChainStats from '../components/LiveChainStats';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>NotarVeri – Neutral AI Audit Log for EU AI Act Compliance</title>
        <meta name="description" content="Public, immutable, Merkle‑tree registry for AI output attestations. Free for developers, enterprise‑ready for regulated industries." />
      </Head>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <section className="text-center py-20">
          <h1 className="text-4xl md:text-6xl font-bold font-mono tracking-tight">The First Neutral<br />AI Audit Log</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">Meet EU AI Act requirements. Verify any AI output from any provider. Open, transparent, and free for developers.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <a href="/api/auth/signup" className="bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700">Start for Free →</a>
            <a href="/contact" className="border border-green-600 text-green-600 dark:text-green-400 px-6 py-3 rounded-md font-semibold hover:bg-green-50 dark:hover:bg-green-900/20">Enterprise →</a>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-gray-200 dark:border-gray-800 py-6 my-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <span>✓ EU AI Act Ready</span>
          <span>✓ Open Source</span>
          <span>✓ Public Merkle Audit Log</span>
          <span>✓ Used by 500+ developers</span>
        </section>

        {/* Live stats */}
        <section className="my-16">
          <h2 className="text-2xl font-bold text-center mb-8">Live Registry Stats</h2>
          <LiveChainStats />
        </section>

        {/* Two‑tier value props */}
        <section className="grid md:grid-cols-2 gap-8 my-20">
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <h3 className="text-2xl font-bold">Standard</h3>
            <p className="text-gray-500 mt-2">For developers, open‑source models, small teams</p>
            <ul className="mt-6 space-y-3">
              <li>✓ Unlimited public verification</li>
              <li>✓ 1,000 receipt registrations / month</li>
              <li>✓ Open‑source verifier</li>
              <li>✓ Community support</li>
            </ul>
            <a href="/api/auth/signup" className="mt-8 inline-block bg-green-600 text-white px-6 py-2 rounded-md">Get Free API Key</a>
          </div>
          <div className="border-2 border-green-600 rounded-xl p-8">
            <h3 className="text-2xl font-bold">Premium</h3>
            <p className="text-gray-500 mt-2">For AI labs, regulated enterprises, government</p>
            <ul className="mt-6 space-y-3">
              <li>✓ Unlimited registrations & verification</li>
              <li>✓ 99.99% SLA, 24/7 support</li>
              <li>✓ On‑prem / GovCloud deployment</li>
              <li>✓ Compliance reports (PDF)</li>
              <li>✓ Legal & governance consultation</li>
            </ul>
            <a href="/contact" className="mt-8 inline-block bg-transparent border border-green-600 text-green-600 px-6 py-2 rounded-md">Contact Sales</a>
          </div>
        </section>

        {/* How it works */}
        <section className="my-20 text-center">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div><div className="text-4xl font-mono">1.</div><p className="font-semibold mt-2">Attest</p><p className="text-gray-500">AI output is hashed and signed.</p></div>
            <div><div className="text-4xl font-mono">2.</div><p className="font-semibold mt-2">Register</p><p className="text-gray-500">Receipt appended to Merkle chain.</p></div>
            <div><div className="text-4xl font-mono">3.</div><p className="font-semibold mt-2">Verify</p><p className="text-gray-500">Anyone checks authenticity via public dashboard.</p></div>
          </div>
        </section>

        {/* EU AI Act callout */}
        <section className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 text-center">
          <p className="text-lg italic">“High‑risk AI systems shall enable logging of AI outputs.” – EU AI Act, Article 18</p>
          <p className="mt-4">NotarVeri Registry is purpose‑built for compliance. Independent, verifiable, and neutral.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
