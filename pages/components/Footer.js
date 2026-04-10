export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex space-x-6">
            <a href="https://github.com/notarveri/notarveri" target="_blank">GitHub</a>
            <a href="/whitepaper.pdf">White Paper</a>
            <a href="/eu-ai-act">EU AI Act</a>
            <a href="/status">System Status</a>
            <a href="/privacy">Privacy</a>
          </div>
          <div className="mt-4 md:mt-0">
            © {new Date().getFullYear()} NotarVeri – Neutral AI Audit Log
          </div>
        </div>
      </div>
    </footer>
  );
}
