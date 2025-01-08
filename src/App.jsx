import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home";
import TopTweets from "./pages/topTweets";
import TemporalAnalysis from "./pages/TemporalAnalysis";
import TweetGrowth from "./pages/TweetGrowth";
import QuoteDistributions from "./pages/QuoteDistributions";
import ThreadDistribution from "./pages/ThreadDistribution";
import PropTypes from "prop-types";
function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationLinks = [
    { to: "/top-tweets", label: "Most Quoted Tweets" },
    { to: "/temporal-analysis", label: "Temporal Quote Analysis" },
    { to: "/quote-distributions", label: "Quote Distributions" },
    { to: "/tweet-growth", label: "Tweet Growth" },
    { to: "/thread-distribution", label: "Thread Distribution" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const NavLink = ({ to, label, className, onClick }) => (
    <Link to={to} className={className} onClick={onClick}>
      {label}
    </Link>
  );

  NavLink.propTypes = {
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    className: PropTypes.string,
    onClick: PropTypes.func,
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link
                  to="/"
                  className="text-gray-700 text-lg font-medium"
                  onClick={closeMenu}
                >
                  Visa&apos;s Tweets
                </Link>
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <button
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        isMenuOpen
                          ? "M6 18L18 6M6 6l12 12"
                          : "M4 6h16M4 12h16M4 18h16"
                      }
                    />
                  </svg>
                </button>
              </div>

              {/* Desktop menu */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                {navigationLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    {...link}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"}`}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.to}
                  {...link}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  onClick={closeMenu}
                />
              ))}
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
            <Route
              path="/thread-distribution"
              element={<ThreadDistribution />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
