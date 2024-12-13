import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

function QuoteDistributions() {
  const [loading, setLoading] = useState(true);
  const [topTweets, setTopTweets] = useState([]);
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [uploadDate, setUploadDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [quoteData, setQuoteData] = useState({});
  const [showMonthly, setShowMonthly] = useState(false);
  const [showNormalized, setShowNormalized] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [collapseAll, setCollapseAll] = useState(false);
  const [earliestTweetDate, setEarliestTweetDate] = useState(null);
  const [sortBy, setSortBy] = useState("quotes");
  const [sortDirection, setSortDirection] = useState("asc");
  const chartRef = useRef(null);
  const [isTweetSelectorExpanded, setIsTweetSelectorExpanded] = useState(false);

  const getTop100Tweets = (tweets, normalized) => {
    // First get the initial sorted tweets based on normalization
    let sortedTweets;
    if (normalized) {
      // When normalized, only include tweets older than 3 months and sort by quotes per month
      sortedTweets = tweets
        .filter((tweet) => tweet.monthsSince >= 3)
        .sort((a, b) => b.quotesPerMonth - a.quotesPerMonth);
    } else {
      // When not normalized, sort by total quotes
      sortedTweets = [...tweets].sort((a, b) => b.count - a.count);
    }

    // Get top 100 tweets
    return sortedTweets.slice(0, 100);
  };

  useEffect(() => {
    Promise.all([
      fetch("/tweet_results.json").then((res) => res.json()),
      fetch("/upload.json").then((res) => res.json()),
      fetch("/selfQuotedTweets.json").then((res) => res.json()),
    ])
      .then(([tweetData, uploadData, quotesData]) => {
        const uploadDate = new Date(uploadData[0].endDate);
        setUploadDate(uploadDate);

        const startDate = new Date(uploadData[0].startDate);
        setStartDate(startDate);

        // Create a map of tweet_id to quoting tweets
        const quoteMap = {};
        quotesData.forEach((quote) => {
          const quotedUrl = quote.entities.urls.find((url) =>
            url.expanded_url.includes("twitter.com/visakanv/status/")
          );

          if (quotedUrl) {
            const quotedId = quotedUrl.expanded_url.split("/").pop();
            if (!quoteMap[quotedId]) {
              quoteMap[quotedId] = [];
            }
            quoteMap[quotedId].push({
              created_at: new Date(quote.created_at),
              text: quote.full_text,
              tweet_id: quote.id_str,
              in_reply_to: quote.in_reply_to_screen_name,
              favorite_count: quote.favorite_count,
              retweet_count: quote.retweet_count,
            });
          }
        });
        setQuoteData(quoteMap);

        // Calculate age and quotes per month for each tweet
        const tweetsWithAge = tweetData
          .filter((tweet) => tweet.tweet_text !== "Tweet not found")
          .map((tweet) => {
            const tweetDate = new Date(tweet.created_at);
            const monthsSince =
              (uploadDate.getFullYear() - tweetDate.getFullYear()) * 12 +
              (uploadDate.getMonth() - tweetDate.getMonth());

            // Calculate quotes per month only for tweets older than 3 months
            const quotesPerMonth =
              monthsSince >= 3 ? tweet.count / monthsSince : 0;

            return {
              ...tweet,
              created_at: tweetDate,
              monthsSince,
              quotesPerMonth,
              quotesByMonth: (quoteMap[tweet.tweet_id] || []).reduce(
                (acc, quote) => {
                  const monthKey = quote.created_at.toISOString().slice(0, 7);
                  acc[monthKey] = (acc[monthKey] || 0) + 1;
                  return acc;
                },
                {}
              ),
            };
          });

        // Get initial top 100 tweets
        const top100 = getTop100Tweets(tweetsWithAge, showNormalized);

        // Find earliest tweet date among top 100
        const earliestDate = top100.reduce(
          (earliest, tweet) =>
            tweet.created_at < earliest ? tweet.created_at : earliest,
          top100[0].created_at
        );

        setEarliestTweetDate(earliestDate);
        setTopTweets(top100);
        setSelectedTweet(top100[0]);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, [showNormalized]); // Only re-run when normalization changes

  // Add effect to handle sorting of displayed tweets
  useEffect(() => {
    if (!loading) {
      const newTop100 = getTop100Tweets(topTweets, showNormalized);
      setTopTweets(newTop100);
      if (!newTop100.find((t) => t.tweet_id === selectedTweet?.tweet_id)) {
        setSelectedTweet(newTop100[0]);
      }
    }
  }, [showNormalized, sortBy]);

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

  const getChartData = (tweet) => {
    if (!tweet) return null;

    // Create array of months between tweet creation and upload date
    const months = [];
    const currentDate = new Date(tweet.created_at);
    while (currentDate <= uploadDate) {
      months.push(currentDate.toISOString().slice(0, 7));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Get monthly quote counts
    const monthlyQuotes = months.map(
      (month) => tweet.quotesByMonth[month] || 0
    );

    // Calculate data based on monthly vs cumulative view
    let cumSum = 0;
    const data = monthlyQuotes.map((count) => {
      if (!showMonthly) {
        cumSum += count;
        return cumSum;
      }
      return count;
    });

    return {
      labels: months.map((month) => new Date(month)),
      datasets: [
        {
          label: getChartLabel(),
          data: data,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          fill: true,
        },
      ],
    };
  };

  const getChartLabel = () => {
    if (showMonthly) {
      return "Quotes per Month";
    }
    return "Total Quotes";
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Quote Distribution Over Time",
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Format the date as "MMM DD, YYYY"
            return new Date(context[0].parsed.x).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
            });
          },
          label: (context) => {
            const value = context.parsed.y.toFixed(showNormalized ? 2 : 0);
            return `${getChartLabel()}: ${value}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "x",
          modifierKey: "ctrl",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
          drag: {
            enabled: true,
            backgroundColor: "rgba(59, 130, 246, 0.3)",
          },
        },
        limits: {
          x: {
            min: earliestTweetDate?.getTime(),
            max: uploadDate?.getTime(),
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "month",
          displayFormats: {
            year: "yyyy",
            month: "MMM yyyy",
          },
        },
        min: earliestTweetDate ? earliestTweetDate.getTime() : undefined,
        max: new Date(
          uploadDate.getFullYear(),
          uploadDate.getMonth() + 1,
          0
        ).getTime(),
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: getChartLabel(),
        },
      },
    },
  };

  // Add this helper function
  const getMonthsSince = (date1, date2) => {
    return (
      (date2.getFullYear() - date1.getFullYear()) * 12 +
      (date2.getMonth() - date1.getMonth())
    );
  };

  const toggleGroup = (monthsAfter) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(monthsAfter)) {
      newCollapsed.delete(monthsAfter);
    } else {
      newCollapsed.add(monthsAfter);
    }
    setCollapsedGroups(newCollapsed);
  };

  const toggleAllGroups = () => {
    setCollapseAll(!collapseAll);
    if (!collapseAll) {
      // Collapse all groups
      setCollapsedGroups(
        new Set(
          Object.keys(
            quoteData[selectedTweet.tweet_id].reduce((acc, quote) => {
              const monthsAfter = getMonthsSince(
                selectedTweet.created_at,
                quote.created_at
              );
              acc[monthsAfter] = true;
              return acc;
            }, {})
          )
        )
      );
    } else {
      // Expand all groups
      setCollapsedGroups(new Set());
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Quote Distribution Over Time
            </h1>
            <p className="text-gray-600">
              Showing the most quoted tweets and how they were quoted over time
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="md:col-span-1 bg-white p-4 rounded-lg shadow max-h-[800px]"
          id="top-100-tweets"
        >
          {/* Tweet List - Hidden on Mobile unless expanded */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {showNormalized
                ? "Top 100 Tweets (Quotes per Month)"
                : "Top 100 Tweets (Total Quotes)"}
            </h2>
            <div className="space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-2 border rounded bg-white"
              >
                <option value="quotes">Sort by Quotes</option>
                <option value="date">Sort by Date Created</option>
              </select>
              <button
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
                className="px-3 py-2 border rounded hover:bg-gray-100"
                title={
                  sortDirection === "asc" ? "Sort Descending" : "Sort Ascending"
                }
              >
                {sortDirection === "asc" ? "↓" : "↑"}
              </button>
            </div>
            <div className="my-2">
              <button
                onClick={() => setShowNormalized(!showNormalized)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                {showNormalized ? "Regular View" : "Normalize by Age"}
              </button>
            </div>
            {/* Mobile Selected Tweet Display */}
            <div className="md:hidden">
              {selectedTweet && (
                <div className="mb-4">
                  <div
                    className={`p-4 rounded border border-blue-200 bg-blue-50`}
                  >
                    <p className="text-sm text-gray-500 mb-1">
                      {showNormalized
                        ? `${selectedTweet.quotesPerMonth.toFixed(
                            1
                          )} quotes/month`
                        : `${selectedTweet.count || 0} quotes`}
                    </p>
                    <p className="text-sm">{selectedTweet.tweet_text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created:{" "}
                      {selectedTweet.created_at.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setIsTweetSelectorExpanded(!isTweetSelectorExpanded)
                    }
                    className="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg flex justify-between items-center"
                  >
                    <span>
                      {isTweetSelectorExpanded ? "Hide Tweets" : "Select Tweet"}
                    </span>
                    <span className="text-xl">
                      {isTweetSelectorExpanded ? "↑" : "↓"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className={`space-y-4 mt-4 max-h-[400px] md:max-h-[620px] overflow-auto pr-2 -mr-2 ${
              isTweetSelectorExpanded ? "" : "h-0"
            }`}
            id="tweet-selector-mobile"
          >
            {topTweets
              .sort((a, b) => {
                switch (sortBy) {
                  case "date":
                    return sortDirection === "asc"
                      ? a.created_at - b.created_at
                      : b.created_at - a.created_at;

                  default: // 'quotes'
                    if (showNormalized) {
                      return sortDirection === "asc"
                        ? b.quotesPerMonth - a.quotesPerMonth
                        : a.quotesPerMonth - b.quotesPerMonth;
                    }
                    return sortDirection === "asc"
                      ? b.count - a.count
                      : a.count - b.count;
                }
              })
              .map((tweet, index) => (
                <div
                  key={tweet.tweet_id}
                  className={`p-4 rounded cursor-pointer transition-colors ${
                    selectedTweet?.tweet_id === tweet.tweet_id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border"
                  }`}
                  onClick={() => {
                    setSelectedTweet(tweet);
                    setIsTweetSelectorExpanded(false);
                  }}
                >
                  <p className="text-sm text-gray-500 mb-1">
                    #{index + 1} •{" "}
                    {showNormalized
                      ? `${tweet.quotesPerMonth.toFixed(1)} quotes/month`
                      : `${tweet.count || 0} quotes`}
                  </p>
                  <p className="text-sm">{tweet.tweet_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created:{" "}
                    {tweet.created_at.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
          </div>
          <div
            className={`space-y-4 mt-4 max-h-[600px] md:max-h-[620px] overflow-auto pr-2 -mr-2 hidden md:block`}
            id="tweet-selector"
          >
            {topTweets
              .sort((a, b) => {
                switch (sortBy) {
                  case "date":
                    return sortDirection === "asc"
                      ? a.created_at - b.created_at
                      : b.created_at - a.created_at;

                  default: // 'quotes'
                    if (showNormalized) {
                      return sortDirection === "asc"
                        ? b.quotesPerMonth - a.quotesPerMonth
                        : a.quotesPerMonth - b.quotesPerMonth;
                    }
                    return sortDirection === "asc"
                      ? b.count - a.count
                      : a.count - b.count;
                }
              })
              .map((tweet, index) => (
                <div
                  key={tweet.tweet_id}
                  className={`p-4 rounded cursor-pointer transition-colors ${
                    selectedTweet?.tweet_id === tweet.tweet_id
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border"
                  }`}
                  onClick={() => {
                    setSelectedTweet(tweet);
                    setIsTweetSelectorExpanded(false);
                  }}
                >
                  <p className="text-sm text-gray-500 mb-1">
                    #{index + 1} •{" "}
                    {showNormalized
                      ? `${tweet.quotesPerMonth.toFixed(1)} quotes/month`
                      : `${tweet.count || 0} quotes`}
                  </p>
                  <p className="text-sm">{tweet.tweet_text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created:{" "}
                    {tweet.created_at.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
          {selectedTweet && (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold mb-2">
                    Quote Distribution
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Total Quotes
                    </h3>
                    <p className="text-2xl font-bold">
                      {quoteData[
                        selectedTweet.tweet_id
                      ]?.length.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Most Active Month
                    </h3>
                    <p className="text-2xl font-bold">
                      {Object.entries(selectedTweet.quotesByMonth)
                        .sort(([, a], [, b]) => b - a)[0]?.[0]
                        ?.split("-")
                        .map((part, i) =>
                          i === 1
                            ? new Date(2000, part - 1).toLocaleString(
                                "default",
                                { month: "short" }
                              )
                            : part
                        )
                        .join(" ") || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Object.entries(selectedTweet.quotesByMonth)
                        .sort(([, a], [, b]) => b - a)[0]?.[1]
                        .toLocaleString() || 0}{" "}
                      quotes
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="text-sm font-medium text-gray-500">
                      Average per Month
                    </h3>
                    <p className="text-2xl font-bold">
                      {(
                        (quoteData[selectedTweet.tweet_id]?.length || 0) /
                        Object.keys(selectedTweet.quotesByMonth).length
                      ).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 p-4 rounded">
                  <p className="text-gray-600">{selectedTweet.tweet_text}</p>

                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>
                      {selectedTweet.created_at.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>♥ {selectedTweet.favorite_count}</span>
                    <span>🔄 {selectedTweet.retweet_count}</span>
                    {selectedTweet.in_reply_to && (
                      <span>↩️ Reply to @{selectedTweet.in_reply_to}</span>
                    )}
                    <a
                      href={`https://twitter.com/visakanv/status/${selectedTweet.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      View on Twitter →
                    </a>
                  </div>
                </div>
              </div>
              <div className="h-[300px] md:h-[350px]">
                <Line
                  data={getChartData(selectedTweet)}
                  options={chartOptions}
                  ref={chartRef}
                />
              </div>
              <div className="mt-2 text-center flex justify-center gap-4">
                <button
                  onClick={() => {
                    const chart = chartRef.current;
                    if (chart) {
                      chart.resetZoom();
                    }
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Reset Zoom
                </button>
                <button
                  onClick={() => setShowMonthly(!showMonthly)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                >
                  {showMonthly ? "Show Cumulative" : "Show Monthly"}
                </button>
              </div>
              {selectedTweet && quoteData[selectedTweet.tweet_id] && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Quoting Tweets</h3>
                    <button
                      onClick={toggleAllGroups}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      {collapseAll ? "Expand All" : "Collapse All"}
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {Object.entries(
                      quoteData[selectedTweet.tweet_id].reduce((acc, quote) => {
                        const monthsAfter = getMonthsSince(
                          selectedTweet.created_at,
                          quote.created_at
                        );
                        if (!acc[monthsAfter]) {
                          acc[monthsAfter] = [];
                        }
                        acc[monthsAfter].push(quote);
                        return acc;
                      }, {})
                    )
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([monthsAfter, quotes]) => (
                        <div
                          key={monthsAfter}
                          className="border rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleGroup(monthsAfter)}
                            className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-left"
                          >
                            <h4 className="font-medium text-gray-700">
                              {monthsAfter === "0"
                                ? "First Month"
                                : `${monthsAfter} Month${
                                    Number(monthsAfter) === 1 ? "" : "s"
                                  } After`}
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                ({quotes.length} quote
                                {quotes.length === 1 ? "" : "s"})
                              </span>
                            </h4>
                            <span className="text-gray-400">
                              {collapsedGroups.has(monthsAfter) ? "+" : "−"}
                            </span>
                          </button>
                          {!collapsedGroups.has(monthsAfter) && (
                            <div className="space-y-3 p-4">
                              {quotes
                                .sort((a, b) => a.created_at - b.created_at)
                                .map((quote) => (
                                  <div
                                    key={quote.tweet_id}
                                    className="border-l border-gray-200 pl-4"
                                  >
                                    <p className="text-sm">{quote.text}</p>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-4">
                                      <span>
                                        {quote.created_at.toLocaleDateString(
                                          "en-US",
                                          {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          }
                                        )}
                                      </span>
                                      <span>♥ {quote.favorite_count}</span>
                                      <span>🔄 {quote.retweet_count}</span>
                                      {quote.in_reply_to && (
                                        <span>
                                          ↩️ Reply to @{quote.in_reply_to}
                                        </span>
                                      )}
                                      <a
                                        href={`https://twitter.com/visakanv/status/${quote.tweet_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600"
                                      >
                                        View on Twitter →
                                      </a>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuoteDistributions;
