import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Home() {
  const [stats, setStats] = useState({
    totalQuotes: 0,
    uniqueQuotedTweets: 0,
    totalTweets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/tweet_results.json").then((res) => res.json()),
      fetch("/selfQuotedTweets.json").then((res) => res.json()),
      fetch("/totalTweetLength.json").then((res) => res.json()),
      fetch("/upload.json").then((res) => res.json()),
      fetch("/thread_statistics.json").then((res) => res.json()),
    ])
      .then(
        ([
          tweetResults,
          selfQuotedTweets,
          totalTweetLength,
          uploadDetails,
          threadStats,
        ]) => {
          const validTweets = tweetResults.filter(
            (tweet) => tweet.tweet_text !== "Tweet not found"
          );

          setStats({
            totalQuotes: selfQuotedTweets.length,
            uniqueQuotedTweets: validTweets.length,
            totalTweets: totalTweetLength,
            uploadStats: uploadDetails,
            threadStats: threadStats,
          });
          setLoading(false);
        }
      )
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center h-screen px-4">
        <div className="w-full max-w-md">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold mb-2">
              Loading Visa&apos;s Tweets - there&apos;s a lot of them!
            </h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Visa&apos;s Tweet Analysis
          </h1>
          <p className="text-xl text-gray-600">
            Exploring the art of self-quotation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalQuotes.toLocaleString()}
            </h2>
            <p className="text-gray-600">Total Self-Quotes</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-green-600 mb-2">
              {stats.uniqueQuotedTweets.toLocaleString()}
            </h2>
            <p className="text-gray-600">Unique Tweets Self-Quoted</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-purple-600 mb-2">
              {stats.totalTweets.toLocaleString()}
            </h2>
            <p className="text-gray-600">Total Tweets Analyzed</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-red-600 mb-2">
              {(stats.totalQuotes / stats.uniqueQuotedTweets).toFixed(2)}{" "}
            </h2>
            <p className="text-gray-600">Average Self-Quotes per Tweet</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600 mb-2">
              {((stats.uniqueQuotedTweets / stats.totalTweets) * 100).toFixed(
                2
              )}
              %
            </h2>
            <p className="text-gray-600">% of Tweets Self-Quoted</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-orange-600 mb-2">
              {stats.threadStats.longest_thread.length.toLocaleString()}
            </h2>
            <p className="text-gray-600"># of Tweets in Longest Thread</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            to="/top-tweets"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Most Quoted Tweets</h3>
            <p className="text-gray-600">
              Discover Visa&apos;s most frequently referenced tweets, with
              options to view by total quotes or normalized by age
            </p>
          </Link>

          <Link
            to="/temporal-analysis"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">
              Temporal Quote Analysis
            </h3>
            <p className="text-gray-600">
              Discover when Visa tweeted his Top 1,000 most quoted tweets
            </p>
          </Link>

          <Link
            to="/quote-distributions"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Quote Distributions</h3>
            <p className="text-gray-600">
              See how Visa quoted his Top 100 most quoted tweets over time. What
              did he say in his quotes and when did he say it
            </p>
          </Link>

          <Link
            to="/tweet-growth"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Tweet Growth</h3>
            <p className="text-gray-600">
              Track the cumulative and monthly growth of Visa&apos;s tweets and
              self-quotes over time
            </p>
          </Link>
          <Link
            to="/thread-distribution"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-xl font-semibold mb-2">Thread Distribution</h3>
            <p className="text-gray-600">
              Explore Visa&apos;s Twitter Threads. See which are the longest,
              most popular and when they were posted.
            </p>
          </Link>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">About</h3>
          <p className="text-gray-600 text-sm mb-4">
            Latest Tweet Export:{" "}
            {new Date(stats.uploadStats[0].endDate).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "short", day: "numeric" }
            )}
          </p>
          <p className="text-gray-600 text-sm mb-4">
            Data sourced from the{" "}
            <a
              href="https://www.community-archive.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              Community Archive Project
            </a>
            . This analysis explores patterns in how Visa quotes his own tweets,
            offering insights into his writing and thinking process.
          </p>
          <p className="text-gray-600 text-sm">
            Built by{" "}
            <a
              href="https://www.jameslamming.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              James Lamming
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
