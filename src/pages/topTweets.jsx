import { useState, useEffect } from "react";

function TopTweets() {
  const [selfQuotes, setSelfQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNormalized, setShowNormalized] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/tweet_results.json").then((res) => res.json()),
      fetch("/upload.json").then((res) => res.json()),
    ])
      .then(([tweetData, uploadData]) => {
        // Filter out "Tweet not found" entries
        const validTweets = tweetData.filter(
          (tweet) => tweet.tweet_text !== "Tweet not found"
        );

        const uploadDate = new Date(uploadData[0].endDate);

        // Calculate months since tweet for each tweet
        const tweetsWithAge = validTweets.map((tweet) => {
          const tweetDate = new Date(tweet.created_at);
          const now = uploadDate;
          const monthsSince =
            (now.getFullYear() - tweetDate.getFullYear()) * 12 +
            (now.getMonth() - tweetDate.getMonth());
          const quotesPerMonth = tweet.count / monthsSince;

          return {
            ...tweet,
            monthsSince,
            quotesPerMonth,
          };
        });

        // Filter tweets older than 3 months for normalized view
        const normalizedTweets = tweetsWithAge
          .filter((tweet) => tweet.monthsSince >= 3)
          .sort((a, b) => b.quotesPerMonth - a.quotesPerMonth)
          .slice(0, 200);

        // Regular top 200 tweets
        const topTweets = tweetsWithAge
          .sort((a, b) => b.count - a.count)
          .slice(0, 200);

        setSelfQuotes({
          regular: topTweets,
          normalized: normalizedTweets,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading tweet data:", error);
        setLoading(false);
      });
  }, []);

  const exportTweetsToCSV = (displayTweets) => {
    if (!displayTweets || displayTweets.length === 0) return;

    const headers = [
      "tweet_id",
      "quote_count",
      "tweet_text",
      "favorite_count",
      "retweet_count",
      "in_reply_to_screen_name",
      "created_at",
      "URL",
    ];

    const sortedTweets = [...displayTweets].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    const rows = sortedTweets.map((tweet) => {
      return [
        tweet.tweet_id,
        tweet.count,
        tweet.tweet_text,
        tweet.favorite_count,
        tweet.retweet_count,
        tweet.in_reply_to_screen_name,
        tweet.created_at,
        `https://twitter.com/visakanv/status/${tweet.tweet_id}`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "visa-quotes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  const displayTweets = showNormalized
    ? selfQuotes.normalized
    : selfQuotes.regular;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="md:flex md:justify-between items-center mb-6">
        <h1 className="text-2xl mb-4 md:mb-0">
          {showNormalized
            ? "Top 200 Self-Quoted Tweets (Normalized by Age)"
            : "Top 200 Self-Quoted Tweets"}
        </h1>
        <div className="flex gap-2">
          {displayTweets && displayTweets.length > 0 && (
            <button
              onClick={() => exportTweetsToCSV(displayTweets)}
              className="text-sm text-blue-500 hover:text-blue-600 px-3 py-1 border rounded"
            >
              Export CSV
            </button>
          )}
          <button
            onClick={() => setShowNormalized(!showNormalized)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {showNormalized ? "Regular View" : "Normalize by Age"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {displayTweets?.map((quote, index) => (
          <div
            key={quote.tweet_id}
            className="bg-white shadow-lg rounded-lg p-6"
          >
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-500 mb-1">
                  #{index + 1} •
                  {showNormalized
                    ? `${quote.count} quotes (${quote.quotesPerMonth.toFixed(
                        1
                      )} per month)`
                    : `Quoted ${quote.count} times`}{" "}
                  • Created on{" "}
                  {new Date(quote.created_at).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-lg">{quote.tweet_text}</p>
                <div className="mt-2">
                  <a
                    href={`https://twitter.com/visakanv/status/${quote.tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    View on Twitter →
                  </a>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  {quote.favorite_count} likes • {quote.retweet_count} retweets
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopTweets;
