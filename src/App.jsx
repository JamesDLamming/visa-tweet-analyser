import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import TopTweets from "./pages/topTweets";
import TemporalAnalysis from "./pages/TemporalAnalysis";
import TweetGrowth from "./pages/TweetGrowth";
import QuoteDistributions from "./pages/QuoteDistributions";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex space-x-4 items-center">
                <Link
                  to="/"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Home
                </Link>
                <Link
                  to="/top-tweets"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Most Quoted Tweets
                </Link>
                <Link
                  to="/temporal-analysis"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Temporal Quote Analysis{" "}
                </Link>
                <Link
                  to="/quote-distributions"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Quote Distributions
                </Link>
                <Link
                  to="/tweet-growth"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  Tweet Growth
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/temporal-analysis" element={<TemporalAnalysis />} />
            <Route path="/top-tweets" element={<TopTweets />} />
            <Route path="/tweet-growth" element={<TweetGrowth />} />
            <Route
              path="/quote-distributions"
              element={<QuoteDistributions />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
